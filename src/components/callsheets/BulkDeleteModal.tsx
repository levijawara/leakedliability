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

interface BulkDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  itemType?: string;
  onConfirm: () => void;
}

export function BulkDeleteModal({
  open,
  onOpenChange,
  count,
  itemType = "contact",
  onConfirm,
}: BulkDeleteModalProps) {
  const plural = count === 1 ? itemType : `${itemType}s`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {count} {plural}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. {count === 1 ? "This" : "These"} {count} {plural} will be permanently removed from your database.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete {count} {plural}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
