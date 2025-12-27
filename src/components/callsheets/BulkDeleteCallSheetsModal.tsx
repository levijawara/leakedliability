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
import { AlertTriangle } from "lucide-react";

interface BulkDeleteCallSheetsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  onConfirm: () => void;
}

export function BulkDeleteCallSheetsModal({
  open,
  onOpenChange,
  count,
  onConfirm,
}: BulkDeleteCallSheetsModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {count} Call Sheet{count !== 1 ? "s" : ""}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This will permanently delete {count} call sheet{count !== 1 ? "s" : ""} and remove the uploaded files from storage.
            </p>
            <p className="font-medium text-destructive">
              Note: Contacts already imported from these sheets will NOT be deleted.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete {count} Sheet{count !== 1 ? "s" : ""}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
