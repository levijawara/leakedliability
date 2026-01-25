import { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ParsedContact {
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
  confidence: number;
}

interface InteractivePdfViewerProps {
  filePath: string;
  parsedContacts: ParsedContact[];
  onContactClick: (contact: ParsedContact, originalIndex: number) => void;
  savedContactIndices?: Set<number>;
  skippedContactIndices?: Set<number>;
}

export function InteractivePdfViewer({
  filePath,
  parsedContacts,
  onContactClick,
  savedContactIndices = new Set(),
  skippedContactIndices = new Set(),
}: InteractivePdfViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [textLayerReady, setTextLayerReady] = useState(false);

  useEffect(() => {
    async function fetchPdf() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: signedUrlError } = await supabase.storage
          .from("call_sheets")
          .createSignedUrl(filePath, 3600);

        if (signedUrlError) throw signedUrlError;
        if (!data?.signedUrl) throw new Error("Failed to get PDF URL");

        setPdfUrl(data.signedUrl);
      } catch (err: any) {
        console.error("[InteractivePdfViewer] Error fetching PDF:", err);
        setError(err.message || "Failed to load PDF");
      } finally {
        setLoading(false);
      }
    }

    if (filePath) {
      fetchPdf();
    }
  }, [filePath]);

  // Reset text layer ready state when page changes
  useEffect(() => {
    setTextLayerReady(false);
  }, [pageNumber]);

  // Attach click handlers when text layer is ready
  const attachClickHandlers = useCallback(() => {
    if (!pageRef.current || !parsedContacts.length) return;

    const textLayer = pageRef.current.querySelector('.react-pdf__Page__textContent');
    if (!textLayer) {
      console.log('[PDF] No text layer found');
      return;
    }

    const spans = Array.from(textLayer.querySelectorAll('span')) as HTMLSpanElement[];
    console.log('[PDF] Found spans:', spans.length);
    console.log('[PDF] Searching for contacts:', parsedContacts.map(c => c.name));

    // First, remove any existing handlers/classes to avoid duplicates
    spans.forEach(span => {
      span.classList.remove('clickable-contact', 'saved', 'skipped');
      span.onclick = null;
    });

    parsedContacts.forEach((contact, originalIndex) => {
      // Split name into words and search for FIRST word only
      const nameParts = contact.name.trim().split(/\s+/);
      const firstName = nameParts[0];

      if (firstName.length < 2) return; // Skip very short names

      // Escape special regex characters in the name
      const escapedFirstName = firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      spans.forEach((span) => {
        const spanText = span.textContent?.trim() || '';

        // Match if span contains the first name (case-insensitive, word boundary)
        const regex = new RegExp(`\\b${escapedFirstName}\\b`, 'i');

        if (regex.test(spanText)) {
          // Check if already processed (avoid duplicate handlers)
          if (span.classList.contains('clickable-contact')) return;

          console.log('[PDF] Match found:', spanText, '→', contact.name);

          // Determine state
          const isSaved = savedContactIndices.has(originalIndex);
          const isSkipped = skippedContactIndices.has(originalIndex);

          // Add classes
          span.classList.add('clickable-contact');
          if (isSaved) span.classList.add('saved');
          if (isSkipped) span.classList.add('skipped');

          // Add click handler
          span.style.cursor = 'pointer';
          span.onclick = (e) => {
            e.stopPropagation();
            console.log('[PDF] Clicked:', contact.name);
            onContactClick(contact, originalIndex);
          };
        }
      });
    });
  }, [parsedContacts, savedContactIndices, skippedContactIndices, onContactClick]);

  // Run attachment when text layer becomes ready
  useEffect(() => {
    if (textLayerReady) {
      attachClickHandlers();
    }
  }, [textLayerReady, attachClickHandlers]);

  const handleTextLayerSuccess = useCallback(() => {
    console.log('[PDF] Text layer rendered successfully');
    setTextLayerReady(true);
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function onDocumentLoadError(err: Error) {
    console.error("[InteractivePdfViewer] Document load error:", err);
    setError("Failed to load PDF document");
  }

  const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages));
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <div className="text-center p-6">
          <p className="text-destructive font-medium">Error loading PDF</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-muted/10 relative">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={zoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="outline" size="icon" onClick={zoomIn} disabled={scale >= 3}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevPage} disabled={pageNumber <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[80px] text-center">
            {pageNumber} / {numPages}
          </span>
          <Button variant="outline" size="icon" onClick={goToNextPage} disabled={pageNumber >= numPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-center" ref={pageRef}>
          {pdfUrl && (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                className="shadow-lg"
                renderTextLayer={true}
                onRenderTextLayerSuccess={handleTextLayerSuccess}
                renderAnnotationLayer={true}
              />
            </Document>
          )}
        </div>
      </div>

      {/* CSS for clickable contacts */}
      <style>{`
        .clickable-contact {
          cursor: pointer !important;
          background: rgba(255, 200, 0, 0.15) !important;
          border-radius: 2px !important;
          transition: background 0.15s ease !important;
          padding: 1px 2px !important;
        }
        .clickable-contact:hover {
          background: rgba(255, 200, 0, 0.4) !important;
        }
        .clickable-contact.saved {
          background: rgba(34, 197, 94, 0.2) !important;
        }
        .clickable-contact.skipped {
          background: rgba(156, 163, 175, 0.2) !important;
          opacity: 0.6 !important;
        }
      `}</style>
    </div>
  );
}
