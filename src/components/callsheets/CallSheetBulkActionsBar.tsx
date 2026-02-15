import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Trash2, 
  X, 
  CheckSquare,
  Square,
  Loader2,
  RefreshCw
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

interface SelectedSheet {
  id: string;
  fileName: string;
}

interface CallSheetBulkActionsBarProps {
  selectedIds: string[]; // user_call_sheets IDs
  selectedGlobalIds: string[]; // global_call_sheets IDs for re-parse
  selectedSheets: SelectedSheet[]; // For project creation
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkComplete: () => void;
  userId: string;
}

export function CallSheetBulkActionsBar({
  selectedIds,
  selectedGlobalIds,
  selectedSheets,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkComplete,
  userId,
}: CallSheetBulkActionsBarProps) {
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReparsing, setIsReparsing] = useState(false);

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

  const handleBulkReparse = async () => {
    if (selectedGlobalIds.length === 0) return;
    
    setIsReparsing(true);
    try {
      // Reset status to queued for all selected global sheets
      const { error: updateError } = await supabase
        .from('global_call_sheets')
        .update({ 
          status: 'queued', 
          error_message: null,
          retry_count: 0,
          parsing_started_at: null
        })
        .in('id', selectedGlobalIds);

      if (updateError) throw updateError;

      // Trigger parsing for each (sequentially to avoid overwhelming the function)
      for (const globalId of selectedGlobalIds) {
        await supabase.functions.invoke('parse-call-sheet', {
          body: { call_sheet_id: globalId }
        });
      }

      toast({
        title: "Re-parse initiated",
        description: `${selectedGlobalIds.length} call sheet(s) queued for re-processing.`
      });
      onBulkComplete();
    } catch (error: any) {
      console.error('[CallSheetBulkActionsBar] Re-parse error:', error);
      toast({
        title: "Failed to re-parse call sheets",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsReparsing(false);
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
            onClick={handleBulkReparse}
            disabled={selectedIds.length === 0 || isReparsing}
            className="h-8"
          >
            {isReparsing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Re-parse
          </Button>

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
