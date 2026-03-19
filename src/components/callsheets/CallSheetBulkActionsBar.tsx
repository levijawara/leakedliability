import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Trash2, 
  X, 
  CheckSquare,
  Square,
  Loader2
} from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CallSheetBulkActionsBarProps {
  selectedIds: string[];
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkComplete: () => void;
  userId: string;
}

export function CallSheetBulkActionsBar({
  selectedIds,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkComplete,
  userId,
}: CallSheetBulkActionsBarProps) {
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('user_call_sheets')
        .delete()
        .in('id', selectedIds)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Call sheets removed",
        description: `${selectedIds.length} call sheet(s) removed from your library.`
      });
      onBulkComplete();
      setShowDeleteConfirm(false);
    } catch (error: any) {
      console.error('[CallSheetBulkActionsBar] Delete error:', error);
      toast({
        title: "Failed to remove call sheets",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const allSelected = selectedIds.length === totalCount && totalCount > 0;

  return (
    <>
      <div className="flex items-center justify-between gap-4 p-3 bg-muted/50 border rounded-lg mb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="h-8"
          >
            {allSelected ? (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                Deselect All
              </>
            ) : (
              <>
                <Square className="h-4 w-4 mr-2" />
                Select All ({totalCount})
              </>
            )}
          </Button>
          
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={selectedIds.length === 0}
            className="h-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDeselectAll}
            className="h-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedIds.length} Call Sheet(s)?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>This will remove the selected call sheets from your personal library.</p>
                <p className="mt-2 text-muted-foreground text-sm">
                  The original files remain in the platform archive and may still be accessible to other users.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove from My Library"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
