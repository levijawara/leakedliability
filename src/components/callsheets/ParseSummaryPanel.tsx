import { useState, useEffect } from "react";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Save, 
  Download,
  Loader2,
  Users,
  AlertCircle,
  Phone,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ParsedContact {
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
  confidence: number;
}

interface ParseSummaryPanelProps {
  callSheetId: string;
  fileName: string;
  parsedContacts: ParsedContact[];
  parsedDate: string | null;
  onComplete: () => void;
  userId: string;
}

// Normalize phone number for matching (digits only)
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Normalize email for matching (lowercase, trimmed)
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function ParseSummaryPanel({
  callSheetId,
  fileName,
  parsedContacts,
  parsedDate,
  onComplete,
  userId
}: ParseSummaryPanelProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(parsedContacts.map((_, i) => i)));
  const [saving, setSaving] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, Partial<ParsedContact>>>({});
  const { toast } = useToast();

  // Calculate stats
  const highConfidence = parsedContacts.filter(c => c.confidence >= 0.85).length;
  const lowConfidence = parsedContacts.filter(c => c.confidence >= 0.6 && c.confidence < 0.85).length;
  const missingPhone = parsedContacts.filter(c => !c.phones || c.phones.length === 0).length;
  const missingEmail = parsedContacts.filter(c => !c.emails || c.emails.length === 0).length;

  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.rpc('has_role', {
            _user_id: user.id,
            _role: 'admin'
          });
          setIsAdmin(!!data);
        }
      } catch (err) {
        console.error('[ParseSummaryPanel] Admin check error:', err);
      } finally {
        setLoading(false);
      }
    }
    checkAdminStatus();
  }, []);

  const toggleSelect = (index: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === parsedContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(parsedContacts.map((_, i) => i)));
    }
  };

  const handleOverride = (index: number, field: keyof ParsedContact, value: string) => {
    setOverrides(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: field === 'name' ? value : value.split(',').map(s => s.trim()).filter(Boolean)
      }
    }));
  };

  const saveContacts = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "No contacts selected",
        description: "Please select at least one contact to save.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    let matched = 0;
    let created = 0;
    let attributed = 0;

    try {
      const contactsToSave = parsedContacts.filter((_, i) => selectedIds.has(i));
      
      // Fetch existing contacts for matching
      const { data: existingContactsRaw, error: fetchError } = await supabase
        .from('crew_contacts')
        .select('id, name, emails, phones, roles, departments, ig_handle')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      const existingContacts = (existingContactsRaw || []) as Array<{
        id: string;
        name: string;
        emails: string[] | null;
        phones: string[] | null;
        roles: string[] | null;
        departments: string[] | null;
        ig_handle: string | null;
      }>;

      for (let i = 0; i < contactsToSave.length; i++) {
        const originalIndex = parsedContacts.indexOf(contactsToSave[i]);
        const contact = {
          ...contactsToSave[i],
          ...overrides[originalIndex]
        };

        let existingContact = null;

        // Priority 1: Exact email match
        if (!existingContact && contact.emails?.length > 0) {
          const normalizedEmails = contact.emails.map(normalizeEmail);
          existingContact = existingContacts?.find(ec => 
            ec.emails?.some((e: string) => normalizedEmails.includes(normalizeEmail(e)))
          ) || null;
        }

        // Priority 2: Phone match
        if (!existingContact && contact.phones?.length > 0) {
          const normalizedPhones = contact.phones.map(normalizePhone);
          existingContact = existingContacts?.find(ec => 
            ec.phones?.some((p: string) => normalizedPhones.includes(normalizePhone(p)))
          ) || null;
        }

        // Priority 3: Exact name match
        if (!existingContact && contact.name) {
          const normalizedName = contact.name.toLowerCase().trim();
          existingContact = existingContacts?.find(ec => 
            ec.name?.toLowerCase().trim() === normalizedName
          ) || null;
        }

        let contactId: string;

        if (existingContact) {
          contactId = existingContact.id;
          matched++;

          const mergedRoles = [...new Set([...(existingContact.roles ?? []), ...(contact.roles || [])])];
          const mergedDepartments = [...new Set([...(existingContact.departments ?? []), ...(contact.departments || [])])];
          const mergedEmails = [...new Set([...(existingContact.emails ?? []), ...(contact.emails || [])])];
          const mergedPhones = [...new Set([...(existingContact.phones ?? []), ...(contact.phones || [])])];

          await supabase
            .from('crew_contacts')
            .update({
              roles: mergedRoles,
              departments: mergedDepartments,
              emails: mergedEmails,
              phones: mergedPhones,
              ig_handle: contact.ig_handle || existingContact.ig_handle
            })
            .eq('id', contactId);
        } else {
          const { data: newContact, error: insertError } = await supabase
            .from('crew_contacts')
            .insert({
              user_id: userId,
              name: contact.name,
              roles: contact.roles,
              departments: contact.departments,
              phones: contact.phones,
              emails: contact.emails,
              ig_handle: contact.ig_handle,
              confidence: contact.confidence,
              source_files: [fileName],
              needs_review: contact.confidence < 0.8
            })
            .select('id')
            .single();

          if (insertError) continue;

          contactId = newContact.id;
          created++;

          existingContacts?.push({
            id: contactId,
            name: contact.name,
            emails: contact.emails || [],
            phones: contact.phones || [],
            roles: contact.roles || [],
            departments: contact.departments || [],
            ig_handle: contact.ig_handle || null
          });
        }

        // Create attribution link
        const { error: linkError } = await supabase
          .from('contact_call_sheets')
          .upsert({
            contact_id: contactId,
            call_sheet_id: callSheetId
          }, { onConflict: 'contact_id,call_sheet_id' });

        if (!linkError) attributed++;
      }

      toast({
        title: "Contacts saved",
        description: `Matched ${matched}, created ${created} contacts. ${attributed} attributions added.`
      });

      onComplete();
    } catch (error: any) {
      console.error('[ParseSummaryPanel] Save error:', error);
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const exportReport = (format: 'json' | 'csv') => {
    const selectedContacts = parsedContacts.filter((_, i) => selectedIds.has(i));
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify({ fileName, parsedDate, contacts: selectedContacts }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `parse-report-${callSheetId}.json`;
      a.click();
    } else {
      const headers = ['Name', 'Roles', 'Departments', 'Phones', 'Emails', 'IG Handle', 'Confidence'];
      const rows = selectedContacts.map(c => [
        c.name,
        c.roles.join('; '),
        c.departments.join('; '),
        c.phones.join('; '),
        c.emails.join('; '),
        c.ig_handle || '',
        c.confidence.toString()
      ]);
      const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `parse-report-${callSheetId}.csv`;
      a.click();
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.85) {
      return <Badge className="bg-green-500 text-xs">High</Badge>;
    } else if (confidence >= 0.6) {
      return <Badge variant="secondary" className="text-xs">Medium</Badge>;
    } else {
      return <Badge variant="outline" className="text-xs">Low</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-lg">Parse Summary</h2>
        </div>
        <p className="text-sm text-muted-foreground truncate">{fileName}</p>
        {parsedDate && (
          <p className="text-xs text-muted-foreground mt-1">
            Parsed {format(new Date(parsedDate), "MMM d, yyyy 'at' h:mm a")}
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="p-4 border-b">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{parsedContacts.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Extracted</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{highConfidence}</span>
            </div>
            <p className="text-xs text-muted-foreground">High Confidence</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-2xl font-bold">{lowConfidence}</span>
            </div>
            <p className="text-xs text-muted-foreground">Low Confidence</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{missingPhone + missingEmail}</span>
            </div>
            <p className="text-xs text-muted-foreground">Missing Info</p>
          </Card>
        </div>
      </div>

      {/* Admin Export or Non-Admin Advisory */}
      <div className="p-4 border-b">
        {isAdmin ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportReport('json')}>
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportReport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        ) : (
          <Card className="bg-muted/20 border-muted">
            <CardContent className="p-3">
              <p className="text-sm text-muted-foreground">
                Leaked Liability utilizes AI to parse and sort crew contact information. 
                AI can make mistakes. Review this summary carefully and amend any incorrect 
                details before saving.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Select All + Count */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedIds.size === parsedContacts.length && parsedContacts.length > 0}
            onCheckedChange={selectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
          </span>
        </div>
      </div>

      {/* Contacts List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {parsedContacts.map((contact, index) => {
            const override = overrides[index] || {};
            const displayName = override.name !== undefined ? override.name : contact.name;
            const displayRoles = override.roles !== undefined ? override.roles : contact.roles;
            const displayDepartments = override.departments !== undefined ? override.departments : contact.departments;

            return (
              <Card key={index} className={selectedIds.has(index) ? "border-primary" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(index)}
                      onCheckedChange={() => toggleSelect(index)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Input
                          value={displayName}
                          onChange={(e) => handleOverride(index, 'name', e.target.value)}
                          className="h-8 font-medium"
                          placeholder="Name"
                        />
                        {getConfidenceBadge(contact.confidence)}
                      </div>
                      
                      <Input
                        value={Array.isArray(displayRoles) ? displayRoles.join(', ') : ''}
                        onChange={(e) => handleOverride(index, 'roles' as keyof ParsedContact, e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Roles (comma-separated)"
                      />
                      
                      <Input
                        value={Array.isArray(displayDepartments) ? displayDepartments.join(', ') : ''}
                        onChange={(e) => handleOverride(index, 'departments' as keyof ParsedContact, e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Departments (comma-separated)"
                      />

                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {contact.phones?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.phones[0]}
                          </span>
                        )}
                        {contact.emails?.length > 0 && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3" />
                            {contact.emails[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t bg-background">
        <Button 
          onClick={saveContacts} 
          disabled={selectedIds.size === 0 || saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Add {selectedIds.size} Contacts
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
