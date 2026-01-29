import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Phone, User, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ParsedContact {
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
  confidence: number;
}

interface ExistingContact {
  id: string;
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
}

interface DuplicateMatch {
  existingId: string;
  existingName: string;
  existingRoles: string[];
  existingDepartments: string[];
  existingPhones: string[];
  existingEmails: string[];
  existingIgHandle: string | null;
  matchedFields: ('name' | 'role' | 'phone' | 'email' | 'ig')[];
  matchScore: number;
  hasOverlap: boolean;
}

interface SaveContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ParsedContact;
  callSheetId: string;
  userId: string;
  existingContacts: ExistingContact[];
  onSave: () => void;
  onSkip?: () => void;
}

// Normalize phone number for matching (digits only)
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Normalize email for matching (lowercase, trimmed)
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Fuzzy name matching
function fuzzyNameMatch(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  
  if (n1 === n2) return true;
  
  const parts1 = n1.split(/\s+/);
  const parts2 = n2.split(/\s+/);
  
  if (parts1.length < 2 || parts2.length < 2) {
    return n1.startsWith(n2) || n2.startsWith(n1);
  }
  
  const last1 = parts1[parts1.length - 1];
  const last2 = parts2[parts2.length - 1];
  if (last1 !== last2) return false;
  
  const first1 = parts1[0];
  const first2 = parts2[0];
  return first1.startsWith(first2) || first2.startsWith(first1);
}

// Find potential duplicate match
function findPotentialMatch(
  parsed: ParsedContact,
  existingContacts: ExistingContact[]
): DuplicateMatch | null {
  let bestMatch: DuplicateMatch | null = null;
  
  const parsedPhonesNorm = parsed.phones.map(normalizePhone);
  const parsedEmailsNorm = parsed.emails.map(normalizeEmail);
  
  for (const existing of existingContacts) {
    const matchedFields: DuplicateMatch['matchedFields'] = [];
    let hasPhoneOrEmailMatch = false;
    
    if (fuzzyNameMatch(parsed.name, existing.name)) {
      matchedFields.push('name');
    }
    
    const existingRolesLower = (existing.roles || []).map(r => r.toLowerCase());
    if (parsed.roles.some(r => existingRolesLower.includes(r.toLowerCase()))) {
      matchedFields.push('role');
    }
    
    const existingPhonesNorm = (existing.phones || []).map(normalizePhone);
    const phoneMatch = parsedPhonesNorm.some(p => existingPhonesNorm.includes(p));
    if (phoneMatch) {
      matchedFields.push('phone');
      hasPhoneOrEmailMatch = true;
    }
    
    const existingEmailsNorm = (existing.emails || []).map(normalizeEmail);
    const emailMatch = parsedEmailsNorm.some(e => existingEmailsNorm.includes(e));
    if (emailMatch) {
      matchedFields.push('email');
      hasPhoneOrEmailMatch = true;
    }
    
    const existingIg = existing.ig_handle?.toLowerCase().replace('@', '');
    const parsedIg = parsed.ig_handle?.toLowerCase().replace('@', '');
    if (existingIg && parsedIg && existingIg === parsedIg) {
      matchedFields.push('ig');
      hasPhoneOrEmailMatch = true;
    }
    
    if (matchedFields.length >= 2) {
      const isSingleWordName = parsed.name.trim().split(/\s+/).length === 1;
      if (isSingleWordName && !hasPhoneOrEmailMatch) {
        continue;
      }
      
      const roleOverlap = parsed.roles.some(r => existingRolesLower.includes(r.toLowerCase()));
      const phoneOverlap = parsedPhonesNorm.some(p => existingPhonesNorm.includes(p));
      const emailOverlap = parsedEmailsNorm.some(e => existingEmailsNorm.includes(e));
      const hasOverlap = roleOverlap || phoneOverlap || emailOverlap;
      
      const result: DuplicateMatch = {
        existingId: existing.id,
        existingName: existing.name,
        existingRoles: existing.roles || [],
        existingDepartments: existing.departments || [],
        existingPhones: existing.phones || [],
        existingEmails: existing.emails || [],
        existingIgHandle: existing.ig_handle,
        matchedFields,
        matchScore: matchedFields.length,
        hasOverlap
      };
      
      if (!bestMatch || result.matchScore > bestMatch.matchScore) {
        bestMatch = result;
      }
    }
  }
  
  return bestMatch;
}

export function SaveContactModal({
  open,
  onOpenChange,
  contact,
  callSheetId,
  userId,
  existingContacts,
  onSave,
  onSkip,
}: SaveContactModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateMatch | null>(null);
  const [action, setAction] = useState<'save_new' | 'merge' | 'skip' | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set(contact.roles || []));
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set(contact.emails || []));
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set(contact.phones || []));
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set(contact.departments || []));
  const [showExtraFields, setShowExtraFields] = useState(false);
  const [extraIgHandle, setExtraIgHandle] = useState(contact.ig_handle || '');
  const [extraNovaUrl, setExtraNovaUrl] = useState('');
  const [editableName, setEditableName] = useState(contact.name);
  const [newRole, setNewRole] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Initialize modal state and check for duplicates
  useEffect(() => {
    if (open) {
      // Reset all form fields
      setSelectedRoles(new Set(contact.roles || []));
      setSelectedEmails(new Set(contact.emails || []));
      setSelectedPhones(new Set(contact.phones || []));
      setSelectedDepartments(new Set(contact.departments || []));
      setExtraIgHandle(contact.ig_handle || '');
      setEditableName(contact.name);
      setNewRole('');
      setNewEmail('');
      setNewPhone('');
      setShowExtraFields(false);

      // Check for duplicates and set action AFTER field initialization
      if (existingContacts.length > 0) {
        const match = findPotentialMatch(contact, existingContacts);
        setDuplicateMatch(match);
        setAction(match ? null : 'save_new');
      } else {
        // No existing contacts - default to save_new
        setDuplicateMatch(null);
        setAction('save_new');
      }
    }
  }, [open, contact, existingContacts]);

  // Re-check duplicates when editable name changes
  useEffect(() => {
    if (open && editableName && existingContacts.length > 0) {
      // Build a synthetic contact with the edited name
      const editedContact: ParsedContact = {
        ...contact,
        name: editableName.trim(),
      };
      const match = findPotentialMatch(editedContact, existingContacts);
      setDuplicateMatch(match);
      // If no match, default to save_new; if match found, force user to choose
      setAction(match ? null : 'save_new');
    } else if (open && !duplicateMatch) {
      // No existing contacts or empty name - allow save
      setAction('save_new');
    }
  }, [editableName, open, contact, existingContacts]);

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  };

  const toggleEmail = (email: string) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  const togglePhone = (phone: string) => {
    setSelectedPhones(prev => {
      const next = new Set(prev);
      if (next.has(phone)) {
        next.delete(phone);
      } else {
        next.add(phone);
      }
      return next;
    });
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments(prev => {
      const next = new Set(prev);
      if (next.has(dept)) {
        next.delete(dept);
      } else {
        next.add(dept);
      }
      return next;
    });
  };

  const addNewRole = () => {
    if (newRole.trim()) {
      setSelectedRoles(prev => new Set([...prev, newRole.trim()]));
      setNewRole('');
    }
  };

  const addNewEmail = () => {
    if (newEmail.trim()) {
      setSelectedEmails(prev => new Set([...prev, newEmail.trim()]));
      setNewEmail('');
    }
  };

  const addNewPhone = () => {
    if (newPhone.trim()) {
      setSelectedPhones(prev => new Set([...prev, newPhone.trim()]));
      setNewPhone('');
    }
  };

  const handleSave = async () => {
    if (!action) {
      toast({
        title: "Choose an action",
        description: duplicateMatch 
          ? "Please choose to merge with existing contact or save as new."
          : "Please choose to save or skip.",
        variant: "destructive",
      });
      return;
    }

    if (action === 'skip') {
      onOpenChange(false);
      // Call onSave to notify parent (it will handle skip state)
      return;
    }

    setLoading(true);
    try {
      let contactId: string;

      if (action === 'merge' && duplicateMatch) {
        // Merge with existing
        contactId = duplicateMatch.existingId;

        // Update existing contact with new data
        const updateData: any = {};
        
        // Merge roles
        const allRoles = [...new Set([...duplicateMatch.existingRoles, ...Array.from(selectedRoles)])];
        if (allRoles.length > 0) updateData.roles = allRoles;

        // Merge departments
        const allDepartments = [...new Set([...duplicateMatch.existingDepartments, ...contact.departments])];
        if (allDepartments.length > 0) updateData.departments = allDepartments;

        // Merge phones
        const allPhones = [...new Set([...duplicateMatch.existingPhones, ...Array.from(selectedPhones)])];
        if (allPhones.length > 0) updateData.phones = allPhones;

        // Merge emails
        const allEmails = [...new Set([...duplicateMatch.existingEmails, ...Array.from(selectedEmails)])];
        if (allEmails.length > 0) updateData.emails = allEmails;

        // IG handle (prefer existing if both exist)
        if (extraIgHandle && !duplicateMatch.existingIgHandle) {
          updateData.ig_handle = extraIgHandle.replace(/^@/, '');
        }

        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase
            .from('crew_contacts')
            .update(updateData)
            .eq('id', contactId);

          if (error) throw error;
        }
      } else {
        // Save as new contact
        const { data: newContact, error: insertError } = await supabase
          .from('crew_contacts')
          .insert({
            user_id: userId,
            name: editableName.trim() || contact.name,
            roles: Array.from(selectedRoles),
            departments: Array.from(selectedDepartments),
            phones: Array.from(selectedPhones),
            emails: Array.from(selectedEmails),
            ig_handle: extraIgHandle.replace(/^@/, '') || null,
            nova_profile_url: extraNovaUrl || null,
            confidence: contact.confidence,
            needs_review: contact.confidence < 0.8,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        contactId = newContact.id;
      }

      // Link to call sheet
      const { error: linkError } = await supabase
        .from('contact_call_sheets')
        .upsert({
          contact_id: contactId,
          call_sheet_id: callSheetId,
        }, { onConflict: 'contact_id,call_sheet_id' });

      if (linkError) throw linkError;

      toast({
        title: action === 'merge' ? "Contact merged" : "Contact saved",
        description: `${contact.name} has been ${action === 'merge' ? 'merged' : 'saved'}.`,
      });

      onOpenChange(false);
      onSave();
    } catch (error: any) {
      console.error('[SaveContactModal] Save error:', error);
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save Contact</DialogTitle>
          <DialogDescription>
            Review and confirm the information for {contact.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Duplicate Warning */}
          {duplicateMatch && (
            <Alert className="border-yellow-500 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Possible match: <strong>{duplicateMatch.existingName}</strong></p>
                  <p className="text-sm">Matched fields: {duplicateMatch.matchedFields.join(', ')}</p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={action === 'merge' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAction('merge')}
                    >
                      Merge with Existing
                    </Button>
                    <Button
                      variant={action === 'save_new' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAction('save_new')}
                    >
                      Save as New
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Name - Editable */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={editableName}
              onChange={(e) => setEditableName(e.target.value)}
              placeholder="Contact name"
            />
          </div>

          {/* IG Handle - Always visible */}
          <div className="space-y-2">
            <Label htmlFor="ig_handle">Instagram Handle</Label>
            <Input
              id="ig_handle"
              value={extraIgHandle}
              onChange={(e) => setExtraIgHandle(e.target.value)}
              placeholder="@handle"
            />
          </div>

          {/* Roles - Clickable Chips + Add New */}
          <div className="space-y-2">
            <Label>Roles (click to toggle)</Label>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedRoles).map((role) => (
                <Badge
                  key={role}
                  variant="default"
                  className="cursor-pointer"
                  onClick={() => toggleRole(role)}
                >
                  {role}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
              {contact.roles?.filter(r => !selectedRoles.has(r)).map((role) => (
                <Badge
                  key={role}
                  variant="outline"
                  className="cursor-pointer opacity-50"
                  onClick={() => toggleRole(role)}
                >
                  {role}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Add new role"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewRole())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addNewRole}>Add</Button>
            </div>
          </div>

          {/* Departments - Clickable Chips */}
          <div className="space-y-2">
            <Label>Departments (click to toggle)</Label>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedDepartments).map((dept) => (
                <Badge
                  key={dept}
                  variant="default"
                  className="cursor-pointer"
                  onClick={() => toggleDepartment(dept)}
                >
                  {dept}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
              {contact.departments?.filter(d => !selectedDepartments.has(d)).map((dept) => (
                <Badge
                  key={dept}
                  variant="outline"
                  className="cursor-pointer opacity-50"
                  onClick={() => toggleDepartment(dept)}
                >
                  {dept}
                </Badge>
              ))}
              {(!contact.departments || contact.departments.length === 0) && selectedDepartments.size === 0 && (
                <span className="text-muted-foreground text-sm">No departments</span>
              )}
            </div>
          </div>

          {/* Emails - Clickable Chips + Add New */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Emails (click to toggle)
            </Label>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedEmails).map((email) => (
                <Badge
                  key={email}
                  variant="default"
                  className="cursor-pointer"
                  onClick={() => toggleEmail(email)}
                >
                  {email}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
              {contact.emails?.filter(e => !selectedEmails.has(e)).map((email) => (
                <Badge
                  key={email}
                  variant="outline"
                  className="cursor-pointer opacity-50"
                  onClick={() => toggleEmail(email)}
                >
                  {email}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Add new email"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewEmail())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addNewEmail}>Add</Button>
            </div>
          </div>

          {/* Phones - Clickable Chips + Add New */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phones (click to toggle)
            </Label>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedPhones).map((phone) => (
                <Badge
                  key={phone}
                  variant="default"
                  className="cursor-pointer"
                  onClick={() => togglePhone(phone)}
                >
                  {phone}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
              {contact.phones?.filter(p => !selectedPhones.has(p)).map((phone) => (
                <Badge
                  key={phone}
                  variant="outline"
                  className="cursor-pointer opacity-50"
                  onClick={() => togglePhone(phone)}
                >
                  {phone}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Add new phone"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewPhone())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addNewPhone}>Add</Button>
            </div>
          </div>

          {/* Extra Fields (Expandable) */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExtraFields(!showExtraFields)}
              className="w-full justify-start"
            >
              {showExtraFields ? 'Hide' : 'Add'} NOVA profile URL
            </Button>

            {showExtraFields && (
              <div className="space-y-4 pl-4 border-l-2">
                <div className="space-y-2">
                  <Label htmlFor="nova_url">NOVA Profile URL</Label>
                  <Input
                    id="nova_url"
                    type="url"
                    value={extraNovaUrl}
                    onChange={(e) => setExtraNovaUrl(e.target.value)}
                    placeholder="https://itsnova.com/username"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setAction('skip');
              onOpenChange(false);
              if (onSkip) onSkip();
            }}
            disabled={loading}
          >
            Skip
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !action}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              action === 'merge' ? 'Merge' : 'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
