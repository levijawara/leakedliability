import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PdfViewer } from "./PdfViewer";

interface PDFViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string;
  fileName: string;
}

type ViewerType = "pdf" | "image" | "text" | "download";

function getViewerType(fileName: string): ViewerType {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg"].includes(ext)) return "image";
  if (["csv", "txt"].includes(ext)) return "text";
  if (["doc", "docx", "xlsx"].includes(ext)) return "download";
  return "download"; // fallback: offer download for unknown types
}

export function PDFViewerModal({ open, onOpenChange, filePath, fileName }: PDFViewerModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const viewerType = getViewerType(fileName);

  useEffect(() => {
    if (!open || !filePath) {
      setSignedUrl(null);
      setTextContent(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (viewerType === "pdf") {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: signedError } = await supabase.storage
          .from("call_sheets")
          .createSignedUrl(filePath, 3600);

        if (signedError) throw signedError;
        if (!data?.signedUrl) throw new Error("Failed to get file URL");
        if (cancelled) return;

        setSignedUrl(data.signedUrl);

        if (viewerType === "text") {
          const res = await fetch(data.signedUrl);
          if (!res.ok) throw new Error("Failed to load file");
          const text = await res.text();
          if (!cancelled) setTextContent(text);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load file");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, filePath, viewerType]);

  const renderContent = () => {
    if (viewerType === "pdf") {
      return (
        <div className="flex-1 min-h-0">
          <PdfViewer filePath={filePath} />
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex flex-1 items-center justify-center bg-muted/20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-1 items-center justify-center bg-muted/20">
          <div className="text-center p-6">
            <p className="text-destructive font-medium">Error loading file</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      );
    }

    switch (viewerType) {
      case "image":
        return signedUrl ? (
          <div className="flex-1 min-h-0 overflow-auto p-4 flex items-center justify-center bg-muted/10">
            <img
              src={signedUrl}
              alt={fileName}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : null;
      case "text":
        return (
          <div className="flex-1 min-h-0 overflow-auto p-4 bg-muted/10">
            <pre className="text-sm whitespace-pre-wrap font-mono text-foreground">
              {textContent ?? ""}
            </pre>
          </div>
        );
      case "download":
        return signedUrl ? (
          <div className="flex flex-1 items-center justify-center bg-muted/20 p-8">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                This file type cannot be previewed in the browser.
              </p>
              <Button asChild>
                <a href={signedUrl} download={fileName} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        ) : null;
      default:
        return (
          <div className="flex flex-1 items-center justify-center bg-muted/20">
            <p className="text-sm text-muted-foreground">Unsupported file type</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="truncate pr-8">{fileName}</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
