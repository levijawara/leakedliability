import { useState } from "react";
import { X, Save, CheckCircle, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ContactCard } from "./ContactCard";

interface ParsedContact {
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
  confidence: number;
}

interface CallSheetProp {
  id: string;
  file_name: string;
  parsed_contacts: unknown;
}

interface ParsedContactsViewerProps {
  callSheet: CallSheetProp;
  onClose: () => void;
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

export function ParsedContactsViewer({ callSheet, onClose, userId }: ParsedContactsViewerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const { toast } = useToast();

  const contacts: ParsedContact[] = Array.isArray(callSheet.parsed_contacts) 
    ? callSheet.parsed_contacts 
    : [];

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
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((_, i) => i)));
    }
  };

  const saveSelected = async () => {
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
      const contactsToSave = contacts.filter((_, i) => selectedIds.has(i));
      
      // Fetch existing contacts for matching
      const { data: existingContactsRaw, error: fetchError } = await supabase
        .from('crew_contacts')
        .select('id, name, emails, phones, roles, departments, ig_handle')
        .eq('user_id', userId);

      if (fetchError) {
        console.error('[ParsedContactsViewer] Fetch existing contacts error:', fetchError);
        throw fetchError;
      }

      // Type the existing contacts properly
      const existingContacts = (existingContactsRaw || []) as Array<{
        id: string;
        name: string;
        emails: string[] | null;
        phones: string[] | null;
        roles: string[] | null;
        departments: string[] | null;
        ig_handle: string | null;
      }>;

      console.log(`[SaveContacts] Processing ${contactsToSave.length} contacts, ${existingContacts?.length || 0} existing`);

      type ExistingContact = {
        id: string;
        name: string;
        emails: string[] | null;
        phones: string[] | null;
        roles: string[] | null;
        departments: string[] | null;
        ig_handle: string | null;
      };

      for (const contact of contactsToSave) {
        let existingContact: ExistingContact | null = null;

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

        // Priority 3: Exact name match (case-insensitive)
        if (!existingContact && contact.name) {
          const normalizedName = contact.name.toLowerCase().trim();
          existingContact = existingContacts?.find(ec => 
            ec.name?.toLowerCase().trim() === normalizedName
          ) || null;
        }

        let contactId: string;

        if (existingContact) {
          // Matched - update existing (merge arrays)
          contactId = existingContact.id;
          matched++;

          // Merge roles and departments
          const mergedRoles = [...new Set([
            ...(existingContact.roles ?? []),
            ...(contact.roles || [])
          ])];
          const mergedDepartments = [...new Set([
            ...(existingContact.departments ?? []),
            ...(contact.departments || [])
          ])];
          const mergedEmails = [...new Set([
            ...(existingContact.emails ?? []),
            ...(contact.emails || [])
          ])];
          const mergedPhones = [...new Set([
            ...(existingContact.phones ?? []),
            ...(contact.phones || [])
          ])];

          const { error: updateError } = await supabase
            .from('crew_contacts')
            .update({
              roles: mergedRoles,
              departments: mergedDepartments,
              emails: mergedEmails,
              phones: mergedPhones,
              ig_handle: contact.ig_handle || existingContact.ig_handle
            })
            .eq('id', contactId);

          if (updateError) {
            console.warn('[SaveContacts] Update error:', updateError);
          }
        } else {
          // Create new contact
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
              source_files: [callSheet.file_name],
              needs_review: contact.confidence < 0.8
            })
            .select('id')
            .single();

          if (insertError) {
            console.warn('[SaveContacts] Insert error:', insertError);
            continue;
          }

          contactId = newContact.id;
          created++;

          // Add to local list for future matching in this batch
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

        // Create attribution link in contact_call_sheets
        const { error: linkError } = await supabase
          .from('contact_call_sheets')
          .upsert({
            contact_id: contactId,
            call_sheet_id: callSheet.id
          }, { onConflict: 'contact_id,call_sheet_id' });

        if (linkError) {
          console.warn('[SaveContacts] Attribution link error:', linkError);
        } else {
          attributed++;
        }
      }

      console.log(`[SaveContacts] matched: ${matched}, created: ${created}, attributed: ${attributed}`);

      setSavedCount(matched + created);
      
      toast({
        title: "Contacts saved",
        description: `Matched ${matched}, created ${created} contacts. ${attributed} attributions added.`
      });

      // Clear selection for saved contacts
      setSelectedIds(new Set());

    } catch (error: any) {
      console.error('[ParsedContactsViewer] Save error:', error);
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge className="bg-green-500">High</Badge>;
    } else if (confidence >= 0.5) {
      return <Badge variant="secondary">Medium</Badge>;
    } else {
      return <Badge variant="outline">Low</Badge>;
    }
  };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Extracted Contacts
          </SheetTitle>
          <SheetDescription>
            {callSheet.file_name} • {contacts.length} contacts found
          </SheetDescription>
        </SheetHeader>

        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No contacts extracted</p>
            <p className="text-sm text-muted-foreground">
              The AI couldn't find any contacts in this call sheet
            </p>
          </div>
        ) : (
          <>
            {/* Actions Bar */}
            <div className="flex items-center justify-between py-4 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === contacts.length && contacts.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size > 0 
                    ? `${selectedIds.size} selected` 
                    : "Select all"}
                </span>
              </div>
              <Button
                onClick={saveSelected}
                disabled={selectedIds.size === 0 || saving}
                size="sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Selected
                  </>
                )}
              </Button>
            </div>

            {/* Contacts List */}
            <ScrollArea className="h-[calc(100vh-220px)] mt-4">
              <div className="space-y-3 pr-4">
                {contacts.map((contact, index) => (
                  <ContactCard
                    key={index}
                    contact={contact}
                    selected={selectedIds.has(index)}
                    onSelect={() => toggleSelect(index)}
                    confidenceBadge={getConfidenceBadge(contact.confidence)}
                  />
                ))}
              </div>
            </ScrollArea>

            {savedCount > 0 && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    {savedCount} contacts saved to your crew contacts
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
