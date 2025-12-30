import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PdfViewer } from "@/components/callsheets/PdfViewer";
import { ParseSummaryPanel } from "@/components/callsheets/ParseSummaryPanel";
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

interface CallSheetData {
  id: string;
  original_file_name: string;
  master_file_path: string;
  status: string;
  parsed_contacts: ParsedContact[] | null;
  parsed_date: string | null;
}

export default function ParseReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [callSheet, setCallSheet] = useState<CallSheetData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

        // Fetch call sheet data
        const { data, error } = await supabase
          .from('global_call_sheets')
          .select('id, original_file_name, master_file_path, status, parsed_contacts, parsed_date')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Call sheet not found');

        // Parse the contacts if needed
        const parsedContacts = Array.isArray(data.parsed_contacts) 
          ? (data.parsed_contacts as unknown as ParsedContact[])
          : null;

        setCallSheet({
          ...data,
          parsed_contacts: parsedContacts
        });
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

  const handleComplete = () => {
    // Navigate to IG matching page
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

        {/* Main Content - 40/60 Split */}
        <div className="flex h-[calc(100vh-140px)]">
          {/* PDF Viewer - 40% */}
          <div className="w-[40%] border-r">
            <PdfViewer filePath={callSheet.master_file_path} />
          </div>

          {/* Parse Summary Panel - 60% */}
          <div className="w-[60%] bg-card">
            <ParseSummaryPanel
              callSheetId={callSheet.id}
              fileName={callSheet.original_file_name}
              parsedContacts={callSheet.parsed_contacts || []}
              parsedDate={callSheet.parsed_date}
              onComplete={handleComplete}
              userId={userId}
            />
          </div>
        </div>
      </div>
    </>
  );
}
