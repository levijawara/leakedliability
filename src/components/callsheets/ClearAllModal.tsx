import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface ClearAllModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCount: number;
  itemType?: string;
  onConfirm: () => void;
}

export function ClearAllModal({
  open,
  onOpenChange,
  itemCount,
  itemType = "contact",
  onConfirm,
}: ClearAllModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const isConfirmed = confirmText === "DELETE";

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
      setConfirmText("");
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmText("");
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete All {itemType}s?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              This will permanently delete <strong>{itemCount}</strong> {itemType}
              {itemCount !== 1 ? "s" : ""} from your database. This action cannot be undone.
            </p>
            <div className="space-y-2">
              <Label htmlFor="confirm-delete" className="text-foreground">
                Type <span className="font-mono font-bold">DELETE</span> to confirm:
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="font-mono"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed}
          >
            Delete All
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
