import { useState, useEffect } from "react";
import { 
  FileText, 
  Clock, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Eye,
  RefreshCw,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ParsedContactsViewer } from "./ParsedContactsViewer";
import { format } from "date-fns";

interface CallSheet {
  id: string;
  file_name: string;
  file_path: string;
  status: string;
  contacts_extracted: number | null;
  error_message: string | null;
  uploaded_at: string;
  parsed_contacts: unknown;
}

interface CallSheetListProps {
  userId: string;
}

export function CallSheetList({ userId }: CallSheetListProps) {
  const [callSheets, setCallSheets] = useState<CallSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSheet, setSelectedSheet] = useState<CallSheet | null>(null);
  const [deleteSheet, setDeleteSheet] = useState<CallSheet | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // Fetch call sheets
  const fetchCallSheets = async () => {
    try {
      const { data, error } = await supabase
        .from('call_sheets')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setCallSheets(data || []);
    } catch (error: any) {
      console.error('[CallSheetList] Fetch error:', error);
      toast({
        title: "Failed to load call sheets",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and realtime subscription
  useEffect(() => {
    fetchCallSheets();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('call_sheets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_sheets',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('[CallSheetList] Realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setCallSheets(prev => [payload.new as CallSheet, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setCallSheets(prev => 
              prev.map(sheet => 
                sheet.id === payload.new.id ? payload.new as CallSheet : sheet
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setCallSheets(prev => 
              prev.filter(sheet => sheet.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Delete handler
  const handleDelete = async () => {
    if (!deleteSheet) return;
    
    setDeleting(true);
    try {
      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('call_sheets')
        .remove([deleteSheet.file_path]);

      if (storageError) {
        console.warn('[CallSheetList] Storage delete warning:', storageError);
      }

      // Delete record
      const { error: dbError } = await supabase
        .from('call_sheets')
        .delete()
        .eq('id', deleteSheet.id);

      if (dbError) throw dbError;

      toast({
        title: "Call sheet deleted",
        description: `${deleteSheet.file_name} has been removed.`
      });

      setDeleteSheet(null);
    } catch (error: any) {
      console.error('[CallSheetList] Delete error:', error);
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  // Retry parsing - resets all Phase 6 retry tracking fields
  const handleRetry = async (sheet: CallSheet) => {
    try {
      // Reset status to queued and clear all retry tracking state
      // This is a manual retry, so we reset retry_count to 0
      const { error: updateError } = await supabase
        .from('call_sheets')
        .update({ 
          status: 'queued', 
          error_message: null,
          retry_count: 0,
          parsing_started_at: null,
          last_error_at: null
        })
        .eq('id', sheet.id);

      if (updateError) throw updateError;

      toast({
        title: "Retry initiated",
        description: "The call sheet has been queued for re-processing."
      });
    } catch (error: any) {
      console.error('[CallSheetList] Retry error:', error);
      toast({
        title: "Retry failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Status badge renderer
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Queued
          </Badge>
        );
      case 'parsing':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Parsing
          </Badge>
        );
      case 'parsed':
        return (
          <Badge className="gap-1 bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Complete
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (callSheets.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No call sheets yet</p>
        <p className="text-sm text-muted-foreground">
          Upload your first call sheet to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Contacts</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {callSheets.map((sheet) => (
              <TableRow key={sheet.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate max-w-[200px]">{sheet.file_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {getStatusBadge(sheet.status)}
                    {sheet.status === 'error' && sheet.error_message && (
                      <p className="text-xs text-destructive truncate max-w-[200px]" title={sheet.error_message}>
                        {sheet.error_message}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {sheet.status === 'parsed' && sheet.contacts_extracted !== null ? (
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span>{sheet.contacts_extracted}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {sheet.uploaded_at ? format(new Date(sheet.uploaded_at), 'MMM d, yyyy') : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {sheet.status === 'parsed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSheet(sheet)}
                        title="View contacts"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {sheet.status === 'error' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRetry(sheet)}
                        title="Retry parsing"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteSheet(sheet)}
                      title="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Parsed Contacts Viewer */}
      {selectedSheet && (
        <ParsedContactsViewer
          callSheet={selectedSheet}
          onClose={() => setSelectedSheet(null)}
          userId={userId}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSheet} onOpenChange={() => setDeleteSheet(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Call Sheet?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteSheet?.file_name}" and all extracted contacts.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
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
