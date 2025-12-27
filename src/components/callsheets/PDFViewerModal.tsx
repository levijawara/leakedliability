import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";

interface PDFViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string;
  fileName: string;
}

export function PDFViewerModal({
  open,
  onOpenChange,
  filePath,
  fileName,
}: PDFViewerModalProps) {
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && filePath) {
      loadPDF();
    }
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [open, filePath]);

  const loadPDF = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Please sign in to view files");
      }

      const { data, error: downloadError } = await supabase.storage
        .from("call_sheets")
        .download(filePath);

      if (downloadError) throw downloadError;

      const url = URL.createObjectURL(data);
      setPdfUrl(url);
    } catch (err: any) {
      setError(err.message || "Failed to load PDF");
      toast.error(err.message || "Failed to load PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = fileName;
      a.click();
    }
  };

  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span className="truncate">{fileName}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-80px)]">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">{error}</p>
              <Button variant="outline" onClick={loadPDF}>
                Try Again
              </Button>
            </div>
          ) : pdfUrl ? (
            <>
              <div className="flex-1 bg-muted">
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  title={fileName}
                />
              </div>
              <div className="flex gap-2 p-4 border-t bg-background">
                <Button variant="outline" onClick={handleDownload} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" onClick={handleOpenInNewTab} className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
