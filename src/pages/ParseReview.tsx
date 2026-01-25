import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InteractivePdfViewer } from "@/components/callsheets/InteractivePdfViewer";
import { SaveContactModal } from "@/components/callsheets/SaveContactModal";
import { ParseToolbar } from "@/components/callsheets/ParseToolbar";
import { Navigation } from "@/components/Navigation";

interface ParsedContact {
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
  confidence: number;
}

interface ParseTiming {
  total_elapsed_ms: number;
  total_elapsed_formatted: string;
  model_used: string;
}

interface ActionLogEntry {
  action: string;
  timestamp: string;
  duration_ms?: number;
}

interface CallSheetData {
  id: string;
  original_file_name: string;
  master_file_path: string;
  status: string;
  parsed_contacts: ParsedContact[] | null;
  parsed_date: string | null;
  parse_timing: ParseTiming | null;
  parse_action_log: ActionLogEntry[] | null;
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
  
  const [callSheet, setCallSheet] = useState<CallSheetData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingContacts, setExistingContacts] = useState<ExistingContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<{ contact: ParsedContact; index: number } | null>(null);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [skippedIndices, setSkippedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function fetchData() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }
        setUserId(user.id);

        // Fetch call sheet data including timing
        const { data, error } = await supabase
          .from('global_call_sheets')
          .select('id, original_file_name, master_file_path, status, parsed_contacts, parsed_date, parse_timing, parse_action_log')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Call sheet not found');

        // Parse the contacts if needed
        const parsedContacts = Array.isArray(data.parsed_contacts) 
          ? (data.parsed_contacts as unknown as ParsedContact[])
          : null;

        // Parse timing data
        const parseTiming = data.parse_timing as unknown as ParseTiming | null;
        const parseActionLog = data.parse_action_log as unknown as ActionLogEntry[] | null;

        setCallSheet({
          ...data,
          parsed_contacts: parsedContacts,
          parse_timing: parseTiming,
          parse_action_log: parseActionLog
        });

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
        navigate('/call-sheets');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchData();
    }
  }, [id, navigate, toast]);

  const handleContactClick = (contact: ParsedContact, originalIndex: number) => {
    setSelectedContact({ contact, index: originalIndex });
  };

  const handleSaveComplete = () => {
    if (selectedContact) {
      setSavedIndices(prev => new Set(prev).add(selectedContact.index));
      setSelectedContact(null);
    }
  };

  const handleSkip = () => {
    if (selectedContact) {
      setSkippedIndices(prev => new Set(prev).add(selectedContact.index));
      setSelectedContact(null);
    }
  };

  const handleExportJSON = () => {
    if (!callSheet?.parsed_contacts) return;
    
    const report = {
      source_file: callSheet.original_file_name,
      parsed_at: callSheet.parsed_date || new Date().toISOString(),
      timing: callSheet.parse_timing || {
        total_elapsed_ms: 0,
        total_elapsed_formatted: "N/A",
        model_used: "google/gemini-2.5-flash"
      },
      action_log: callSheet.parse_action_log || [],
      contacts: callSheet.parsed_contacts.map(c => ({
        name: c.name,
        roles: c.roles,
        departments: c.departments,
        phones: c.phones,
        emails: c.emails,
        ig_handle: c.ig_handle,
        confidence: c.confidence,
      }))
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
    
    const headers = ['Name', 'Roles', 'Departments', 'Phones', 'Emails', 'IG Handle', 'Confidence'];
    const rows = callSheet.parsed_contacts.map(c => [
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

  const handleSaveAll = async () => {
    if (!callSheet?.parsed_contacts || !userId || !id) return;

    const remaining = callSheet.parsed_contacts
      .map((_, idx) => idx)
      .filter(idx => !savedIndices.has(idx) && !skippedIndices.has(idx));

    if (remaining.length === 0) {
      toast({
        title: "All contacts processed",
        description: "No remaining contacts to save.",
      });
      return;
    }

    toast({
      title: "Saving all contacts...",
      description: `Processing ${remaining.length} contacts.`,
    });

    // TODO: Implement bulk save logic
    // For now, just show a message
    toast({
      title: "Bulk save coming soon",
      description: "This feature will save all remaining contacts automatically.",
    });
  };

  const handleComplete = () => {
    navigate(`/call-sheets/${id}/ig-matching`);
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!callSheet || !userId) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Call sheet not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/call-sheets')}>
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

        {/* Main Content - PDF Only */}
        <div className="relative h-[calc(100vh-140px)]">
          <InteractivePdfViewer
            filePath={callSheet.master_file_path}
            parsedContacts={callSheet.parsed_contacts || []}
            onContactClick={handleContactClick}
            savedContactIndices={savedIndices}
            skippedContactIndices={skippedIndices}
          />

          {/* Floating Toolbar */}
          {callSheet.parsed_contacts && callSheet.parsed_contacts.length > 0 && (
            <ParseToolbar
              totalContacts={callSheet.parsed_contacts.length}
              savedCount={savedIndices.size}
              skippedCount={skippedIndices.size}
              onExportJSON={handleExportJSON}
              onExportCSV={handleExportCSV}
              onSaveAll={handleSaveAll}
              onComplete={handleComplete}
            />
          )}

          {/* Save Contact Modal */}
          {selectedContact && userId && (
            <SaveContactModal
              open={!!selectedContact}
              onOpenChange={(open) => !open && setSelectedContact(null)}
              contact={selectedContact.contact}
              callSheetId={callSheet.id}
              userId={userId}
              existingContacts={existingContacts}
              onSave={handleSaveComplete}
              onSkip={handleSkip}
            />
          )}
        </div>
      </div>
    </>
  );
}
