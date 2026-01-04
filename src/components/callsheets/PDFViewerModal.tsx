import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PdfViewer } from "./PdfViewer";

interface PDFViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string;
  fileName: string;
}

export function PDFViewerModal({ open, onOpenChange, filePath, fileName }: PDFViewerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="truncate pr-8">{fileName}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <PdfViewer filePath={filePath} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
