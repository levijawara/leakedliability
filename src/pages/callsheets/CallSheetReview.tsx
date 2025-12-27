import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, FileText, Eye } from "lucide-react";
import { ParseReviewPortal } from "@/components/callsheets/ParseReviewPortal";
import { PDFViewerModal } from "@/components/callsheets/PDFViewerModal";
import type { CallSheet } from "@/types/callSheet";

export const CallSheetReview = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [callSheet, setCallSheet] = useState<CallSheet | null>(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);

  useEffect(() => {
    const fetchCallSheet = async () => {
      if (!id) {
        navigate("/call-sheets");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("call_sheets")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        toast({
          title: "Call sheet not found",
          description: "The call sheet may have been deleted or you don't have access.",
          variant: "destructive",
        });
        navigate("/call-sheets");
        return;
      }

      setCallSheet(data as unknown as CallSheet);
      setLoading(false);
    };

    fetchCallSheet();
  }, [id, navigate, toast]);

  const handleReviewComplete = () => {
    toast({ title: "Contacts imported successfully!" });
    navigate("/my-contacts");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!callSheet) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20">
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Call sheet not found</h3>
              <p className="text-muted-foreground mb-4">
                This call sheet may have been deleted or moved.
              </p>
              <Button onClick={() => navigate("/call-sheets")}>
                Back to Call Sheets
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/call-sheets")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold truncate max-w-md">
                {callSheet.filename}
              </h1>
              <p className="text-muted-foreground">
                Review and import parsed contacts
              </p>
            </div>
          </div>
          {callSheet.file_path && (
            <Button
              variant="outline"
              onClick={() => setShowPDFViewer(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Original PDF
            </Button>
          )}
        </div>

        {/* Review Portal */}
        <ParseReviewPortal
          callSheetId={callSheet.id}
          onBack={() => navigate("/call-sheets")}
          onComplete={handleReviewComplete}
        />
      </div>

      {/* PDF Viewer Modal */}
      {callSheet.file_path && (
        <PDFViewerModal
          open={showPDFViewer}
          onOpenChange={setShowPDFViewer}
          filePath={callSheet.file_path}
          fileName={callSheet.filename}
        />
      )}

      <Footer />
    </div>
  );
};
