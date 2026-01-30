import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InteractivePdfViewer } from "@/components/callsheets/InteractivePdfViewer";
import { SaveContactModal } from "@/components/callsheets/SaveContactModal";
import { ParseReviewHeader } from "@/components/callsheets/ParseReviewHeader";
import { ParsedContactsTable } from "@/components/callsheets/ParsedContactsTable";
import { ParseChatAssistant } from "@/components/callsheets/ParseChatAssistant";
import { SaveSuccessBar } from "@/components/callsheets/SaveSuccessBar";
import { Navigation } from "@/components/Navigation";
import { usePortalMode, usePortalBase } from "@/contexts/PortalContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ParsedContact {
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
  confidence: number;
}

interface CallSheetData {
  id: string;
  original_file_name: string;
  master_file_path: string;
  status: string;
  parsed_contacts: ParsedContact[] | null;
  parsed_date: string | null;
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

export default function ParseReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isPortal = usePortalMode();
  const portalBase = usePortalBase();
  
  const [callSheet, setCallSheet] = useState<CallSheetData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingContacts, setExistingContacts] = useState<ExistingContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<{ contact: ParsedContact; index: number } | null>(null);
  
  // Opt-out model: track excluded indices (contacts without email AND phone are excluded by default)
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set());
  const [hasInitializedExclusions, setHasInitializedExclusions] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  
  // Navigation consent after save
  const [saveResult, setSaveResult] = useState<{ savedCount: number; mergedCount: number } | null>(null);
  
  // Table filter and scroll
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate(portalBase ? `${portalBase}/auth` : "/auth");
          return;
        }
        setUserId(user.id);

        const { data, error } = await supabase
          .from('global_call_sheets')
          .select('id, original_file_name, master_file_path, status, parsed_contacts, parsed_date')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Call sheet not found');

        const parsedContacts = Array.isArray(data.parsed_contacts) 
          ? (data.parsed_contacts as unknown as ParsedContact[])
          : null;

        setCallSheet({
          ...data,
          parsed_contacts: parsedContacts,
        });

        // Auto-exclude contacts without email AND phone (they need manual review)
        if (parsedContacts && !hasInitializedExclusions) {
          const toExclude = new Set<number>();
          parsedContacts.forEach((contact, idx) => {
            const hasEmail = contact.emails && contact.emails.length > 0;
            const hasPhone = contact.phones && contact.phones.length > 0;
            if (!hasEmail && !hasPhone) {
              toExclude.add(idx);
            }
          });
          setExcludedIndices(toExclude);
          setHasInitializedExclusions(true);
        }

        // Fetch existing contacts for duplicate detection
        const { data: existingContactsRaw, error: contactsError } = await supabase
          .from('crew_contacts')
          .select('id, name, phones, emails, roles, departments, ig_handle')
          .eq('user_id', user.id)
          .limit(10000);

        if (contactsError) {
          console.error('[ParseReview] Failed to fetch existing contacts:', contactsError);
        } else {
          const existing = (existingContactsRaw || []).map(c => ({
            id: c.id,
            name: c.name,
            roles: c.roles || [],
            departments: c.departments || [],
            phones: c.phones || [],
            emails: c.emails || [],
            ig_handle: c.ig_handle
          })) as ExistingContact[];
          setExistingContacts(existing);
        }
      } catch (error: any) {
        console.error('[ParseReview] Fetch error:', error);
        toast({
          title: "Failed to load call sheet",
          description: error.message,
          variant: "destructive"
        });
        navigate(`${portalBase}/call-sheets`);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchData();
    }
  }, [id, navigate, toast]);

  const handleToggleExclude = (index: number) => {
    setExcludedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleExcludeMultiple = (indices: number[]) => {
    setExcludedIndices(prev => {
      const next = new Set(prev);
      indices.forEach(i => next.add(i));
      return next;
    });
  };

  const handleIncludeMultiple = (indices: number[]) => {
    setExcludedIndices(prev => {
      const next = new Set(prev);
      indices.forEach(i => next.delete(i));
      return next;
    });
  };

  const handleEditContact = (contact: ParsedContact, index: number) => {
    setSelectedContact({ contact, index });
  };

  const handleSaveComplete = () => {
    // After editing a single contact, just close the modal
    // The contact is already saved
    setSelectedContact(null);
  };

  const handleSaveAll = async () => {
    if (!callSheet?.parsed_contacts || !userId || !id) return;

    const includedContacts = callSheet.parsed_contacts
      .map((contact, idx) => ({ contact, idx }))
      .filter(({ idx }) => !excludedIndices.has(idx));

    if (includedContacts.length === 0) {
      toast({
        title: "No contacts to save",
        description: "All contacts have been excluded.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    let savedCount = 0;
    let mergedCount = 0;
    let errorCount = 0;

    try {
      for (const { contact } of includedContacts) {
        // Check for existing match
        const match = findSimpleMatch(contact, existingContacts);

        if (match) {
          // Merge with existing
          const { error } = await supabase
            .from('crew_contacts')
            .update({
              roles: [...new Set([...match.roles, ...contact.roles])],
              departments: [...new Set([...match.departments, ...contact.departments])],
              phones: [...new Set([...match.phones, ...contact.phones])],
              emails: [...new Set([...match.emails, ...contact.emails])],
              ig_handle: contact.ig_handle || match.ig_handle,
            })
            .eq('id', match.id);

          if (error) {
            console.error('[SaveAll] Merge error:', error);
            errorCount++;
          } else {
            // Link to call sheet
            await supabase
              .from('contact_call_sheets')
              .upsert({
                contact_id: match.id,
                call_sheet_id: id,
              }, { onConflict: 'contact_id,call_sheet_id' });
            mergedCount++;
          }
        } else {
          // Insert new
          const { data: newContact, error } = await supabase
            .from('crew_contacts')
            .insert({
              user_id: userId,
              name: contact.name,
              roles: contact.roles,
              departments: contact.departments,
              phones: contact.phones,
              emails: contact.emails,
              ig_handle: contact.ig_handle?.replace(/^@/, '') || null,
              confidence: contact.confidence,
              needs_review: contact.confidence < 0.8,
            })
            .select('id')
            .single();

          if (error) {
            console.error('[SaveAll] Insert error:', error);
            errorCount++;
          } else if (newContact) {
            // Link to call sheet
            await supabase
              .from('contact_call_sheets')
              .upsert({
                contact_id: newContact.id,
                call_sheet_id: id,
              }, { onConflict: 'contact_id,call_sheet_id' });
            savedCount++;
          }
        }
      }

      const parts = [];
      if (savedCount > 0) parts.push(`${savedCount} saved`);
      if (mergedCount > 0) parts.push(`${mergedCount} merged`);
      if (errorCount > 0) parts.push(`${errorCount} failed`);

      toast({
        title: "Contacts saved",
        description: parts.join(', ') || 'Done.',
      });

      // Show navigation prompt instead of auto-navigating
      setSaveResult({ savedCount, mergedCount: mergedCount });
    } catch (error: any) {
      console.error('[SaveAll] Error:', error);
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportJSON = () => {
    if (!callSheet?.parsed_contacts) return;
    
    const includedContacts = callSheet.parsed_contacts
      .filter((_, idx) => !excludedIndices.has(idx));
    
    const report = {
      source_file: callSheet.original_file_name,
      parsed_at: callSheet.parsed_date || new Date().toISOString(),
      total_contacts: callSheet.parsed_contacts.length,
      included_contacts: includedContacts.length,
      excluded_contacts: excludedIndices.size,
      contacts: includedContacts,
    };
    
    const safeName = callSheet.original_file_name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const downloadName = `${safeName}_parse_report_${timestamp}.json`;
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!callSheet?.parsed_contacts) return;
    
    const includedContacts = callSheet.parsed_contacts
      .filter((_, idx) => !excludedIndices.has(idx));
    
    const headers = ['Name', 'Roles', 'Departments', 'Phones', 'Emails', 'IG Handle', 'Confidence'];
    const rows = includedContacts.map(c => [
      c.name,
      c.roles.join('; '),
      c.departments.join('; '),
      c.phones.join('; '),
      c.emails.join('; '),
      c.ig_handle || '',
      c.confidence.toString(),
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parse-report-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <>
        {!isPortal && <Navigation />}
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!callSheet || !userId) {
    return (
      <>
        {!isPortal && <Navigation />}
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Call sheet not found</p>
        </div>
      </>
    );
  }

  const contacts = callSheet.parsed_contacts || [];

  return (
    <>
      {!isPortal && <Navigation />}
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(`${portalBase}/call-sheets`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Parse Review</h1>
                <p className="text-sm text-muted-foreground truncate max-w-[400px]">
                  {callSheet.original_file_name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6 space-y-4">
          {/* Status Header */}
          <ParseReviewHeader
            totalContacts={contacts.length}
            excludedCount={excludedIndices.size}
            onSaveAll={handleSaveAll}
            onExportJSON={handleExportJSON}
            onExportCSV={handleExportCSV}
            onTogglePdf={() => setShowPdf(!showPdf)}
            showPdf={showPdf}
            saving={saving}
          />

          {/* PDF Viewer (Collapsible) */}
          <Collapsible open={showPdf} onOpenChange={setShowPdf}>
            <CollapsibleContent>
              <div className="border rounded-lg overflow-hidden h-[400px]">
                <InteractivePdfViewer
                  filePath={callSheet.master_file_path}
                  parsedContacts={contacts}
                  onContactClick={handleEditContact}
                  readOnly={true}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Contact Table (Opt-out model) */}
          <div ref={tableContainerRef}>
            <ParsedContactsTable
              contacts={contacts}
              excludedIndices={excludedIndices}
              onToggleExclude={handleToggleExclude}
              onEditContact={handleEditContact}
              existingContacts={existingContacts}
              activeFilter={activeFilter}
              rowRefs={rowRefs}
            />
          </div>
        </div>

        {/* AI Chat Assistant */}
        {contacts.length > 0 && (
          <ParseChatAssistant
            callSheetId={callSheet.id}
            fileName={callSheet.original_file_name}
            parsedContacts={contacts}
            excludedIndices={excludedIndices}
            existingContacts={existingContacts}
            onExclude={handleExcludeMultiple}
            onInclude={handleIncludeMultiple}
            onSaveAll={handleSaveAll}
            onTogglePdf={() => setShowPdf(prev => !prev)}
            showPdf={showPdf}
            onFilterView={setActiveFilter}
            activeFilter={activeFilter}
            onJumpToContact={(index) => {
              const row = rowRefs.current.get(index);
              if (row) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                row.classList.add('ring-2', 'ring-primary');
                setTimeout(() => row.classList.remove('ring-2', 'ring-primary'), 2000);
              }
            }}
            onNavigateToMatching={() => navigate(`${portalBase}/call-sheets/${id}/ig-matching`)}
          />
        )}

        {/* Edit Contact Modal */}
        {selectedContact && userId && (
          <SaveContactModal
            open={!!selectedContact}
            onOpenChange={(open) => !open && setSelectedContact(null)}
            contact={selectedContact.contact}
            callSheetId={callSheet.id}
            userId={userId}
            existingContacts={existingContacts}
            onSave={handleSaveComplete}
          />
        )}

        {/* Navigation consent bar */}
        {saveResult && (
          <SaveSuccessBar
            savedCount={saveResult.savedCount}
            mergedCount={saveResult.mergedCount}
            onGoToMatching={() => navigate(`${portalBase}/call-sheets/${id}/ig-matching`)}
            onGoToNOVAMatching={() => navigate(`${portalBase}/call-sheets/${id}/nova-matching`)}
            onDismiss={() => setSaveResult(null)}
          />
        )}
      </div>
    </>
  );
}

// Simple matching for bulk save (less strict than SaveContactModal)
function findSimpleMatch(
  parsed: { name: string; phones: string[]; emails: string[]; ig_handle: string | null },
  existing: ExistingContact[]
): ExistingContact | null {
  const normalizePhone = (p: string) => p.replace(/\D/g, '');
  const normalizeEmail = (e: string) => e.toLowerCase().trim();
  
  const parsedPhones = parsed.phones.map(normalizePhone);
  const parsedEmails = parsed.emails.map(normalizeEmail);
  const parsedIg = parsed.ig_handle?.toLowerCase().replace('@', '');

  for (const contact of existing) {
    // Email match
    const existingEmails = (contact.emails || []).map(normalizeEmail);
    if (parsedEmails.some(e => existingEmails.includes(e))) {
      return contact;
    }

    // Phone match
    const existingPhones = (contact.phones || []).map(normalizePhone);
    if (parsedPhones.some(p => p.length >= 10 && existingPhones.includes(p))) {
      return contact;
    }

    // IG match
    const existingIg = contact.ig_handle?.toLowerCase().replace('@', '');
    if (parsedIg && existingIg && parsedIg === existingIg) {
      return contact;
    }
  }

  return null;
}
