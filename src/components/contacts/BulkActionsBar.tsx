import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Star, 
  Trash2, 
  X, 
  CheckSquare,
  Square,
  Loader2,
  GitMerge
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

const BATCH_SIZE = 100;

const batchArray = <T,>(array: T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size));
  }
  return batches;
};

interface BulkActionsBarProps {
  selectedIds: string[];
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkFavorite: () => void;
  onBulkDelete: (ids: string[]) => void;
  onManualMerge?: () => void;
  userId: string;
}

export function BulkActionsBar({
  selectedIds,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkFavorite,
  onBulkDelete,
  onManualMerge,
  userId,
}: BulkActionsBarProps) {
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });

  const handleBulkFavorite = async () => {
    if (selectedIds.length === 0) return;
    
    setIsFavoriting(true);
    try {
      const batches = batchArray(selectedIds, BATCH_SIZE);
      let totalFavorited = 0;

      console.log('[BulkActionsBar] Starting batch favorite:', {
        totalContacts: selectedIds.length,
        batchCount: batches.length
      });

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const { data, error } = await supabase
          .from('crew_contacts')
          .update({ is_favorite: true })
          .in('id', batch)
          .eq('user_id', userId)
          .select();

        if (error) {
          console.error(`[BulkActionsBar] Favorite batch ${i + 1} failed:`, error);
          throw error;
        }
        totalFavorited += data?.length ?? 0;
      }

      console.log('[BulkActionsBar] Batch favorite complete:', { totalFavorited });

      toast({
        title: "Contacts favorited",
        description: `${totalFavorited} contact(s) added to favorites.`
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
    setDeleteProgress({ current: 0, total: 0 });
    
    try {
      const batches = batchArray(selectedIds, BATCH_SIZE);
      let totalDeleted = 0;
      
      console.log('[BulkActionsBar] Starting batch delete:', {
        totalContacts: selectedIds.length,
        batchCount: batches.length,
        batchSize: BATCH_SIZE
      });

      setDeleteProgress({ current: 0, total: batches.length });

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        setDeleteProgress({ current: i + 1, total: batches.length });
        
        console.log(`[BulkActionsBar] Deleting batch ${i + 1}/${batches.length} (${batch.length} contacts)`);
        
        const { data, error } = await supabase
          .from('crew_contacts')
          .delete()
          .in('id', batch)
          .eq('user_id', userId)
          .select();

        if (error) {
          console.error(`[BulkActionsBar] Batch ${i + 1} failed:`, error);
          throw error;
        }
        
        totalDeleted += data?.length ?? 0;
      }

      console.log('[BulkActionsBar] Batch delete complete:', { totalDeleted });

      toast({
        title: "Contacts deleted",
        description: `${totalDeleted} contact(s) removed.`
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
      setDeleteProgress({ current: 0, total: 0 });
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

          {onManualMerge && (
            <Button
              variant="outline"
              size="sm"
              onClick={onManualMerge}
              disabled={selectedIds.length < 2}
              className="h-8"
            >
              <GitMerge className="h-4 w-4 mr-2" />
              Manual Merge
            </Button>
          )}

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
                  {deleteProgress.total > 1 
                    ? `Batch ${deleteProgress.current}/${deleteProgress.total}...`
                    : "Deleting..."}
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
