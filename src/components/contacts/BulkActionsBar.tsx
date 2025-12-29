import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Star, 
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

interface BulkActionsBarProps {
  selectedIds: string[];
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkFavorite: () => void;
  onBulkDelete: (ids: string[]) => void;
  userId: string;
}

export function BulkActionsBar({
  selectedIds,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkFavorite,
  onBulkDelete,
  userId,
}: BulkActionsBarProps) {
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);

  const handleBulkFavorite = async () => {
    if (selectedIds.length === 0) return;
    
    setIsFavoriting(true);
    try {
      const { error } = await supabase
        .from('crew_contacts')
        .update({ is_favorite: true })
        .in('id', selectedIds)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Contacts favorited",
        description: `${selectedIds.length} contact(s) added to favorites.`
      });
      onBulkFavorite();
    } catch (error: any) {
      console.error('[BulkActionsBar] Favorite error:', error);
      toast({
        title: "Failed to favorite contacts",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsFavoriting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('crew_contacts')
        .delete()
        .in('id', selectedIds)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Contacts deleted",
        description: `${selectedIds.length} contact(s) removed.`
      });
      onBulkDelete(selectedIds);
      setShowDeleteConfirm(false);
    } catch (error: any) {
      console.error('[BulkActionsBar] Delete error:', error);
      toast({
        title: "Failed to delete contacts",
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
      <div className="flex items-center justify-between gap-4 p-3 bg-muted/50 border rounded-lg">
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
            onClick={handleBulkFavorite}
            disabled={selectedIds.length === 0 || isFavoriting}
            className="h-8"
          >
            {isFavoriting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Star className="h-4 w-4 mr-2" />
            )}
            Favorite
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={selectedIds.length === 0}
            className="h-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Contact(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected contacts.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
