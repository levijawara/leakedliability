import { useNavigate } from "react-router-dom";
import { FileWarning, Replace, Copy, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { CallSheet } from "@/types/callSheet";

interface DuplicateCallSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSheet: CallSheet;
  newFileName: string;
  onReplace: () => void;
  onKeepBoth: () => void;
}

export function DuplicateCallSheetModal({
  isOpen,
  onClose,
  existingSheet,
  newFileName,
  onReplace,
  onKeepBoth,
}: DuplicateCallSheetModalProps) {
  const navigate = useNavigate();

  const handleViewExisting = () => {
    onClose();
    navigate(`/call-sheets?search=${encodeURIComponent(existingSheet.filename)}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown date";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Count parsed contacts if available
  const contactCount = existingSheet.parsed_contacts?.length || 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/20">
              <FileWarning className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle>Duplicate File Detected</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>
              A call sheet with a similar name already exists in your collection.
            </p>
            <div className="p-3 rounded-lg bg-muted text-sm">
              <div className="font-medium text-foreground mb-1">
                Existing: {existingSheet.filename}
              </div>
              <div className="text-muted-foreground">
                Uploaded: {formatDate(existingSheet.created_at)}
                {contactCount > 0 && (
                  <> • {contactCount} contacts</>
                )}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-dashed text-sm">
              <div className="font-medium text-foreground mb-1">
                New: {newFileName}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </AlertDialogCancel>
          <Button variant="outline" onClick={handleViewExisting}>
            View Existing
          </Button>
          <Button variant="outline" onClick={onKeepBoth}>
            <Copy className="h-4 w-4 mr-1" />
            Keep Both
          </Button>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={onReplace}>
              <Replace className="h-4 w-4 mr-1" />
              Replace
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}