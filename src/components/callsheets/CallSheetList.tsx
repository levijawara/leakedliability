import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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

interface GlobalCallSheet {
  id: string;
  original_file_name: string;
  master_file_path: string;
  status: string;
  contacts_extracted: number | null;
  error_message: string | null;
  created_at: string;
  parsed_contacts: unknown;
}

interface UserCallSheetLink {
  id: string;
  user_label: string | null;
  created_at: string;
  global_call_sheet_id: string;
  global_call_sheets: GlobalCallSheet;
}

interface CallSheetListProps {
  userId: string;
}

export function CallSheetList({ userId }: CallSheetListProps) {
  const [searchParams] = useSearchParams();
  const contactIdFilter = searchParams.get('contact_id');
  
  const [userLinks, setUserLinks] = useState<UserCallSheetLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSheet, setSelectedSheet] = useState<GlobalCallSheet | null>(null);
  const [deleteLink, setDeleteLink] = useState<UserCallSheetLink | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // Fetch user's call sheet links with global call sheet data
  const fetchUserCallSheets = async () => {
    try {
      let query = supabase
        .from('user_call_sheets')
        .select(`
          id,
          user_label,
          created_at,
          global_call_sheet_id,
          global_call_sheets (
            id,
            original_file_name,
            master_file_path,
            status,
            contacts_extracted,
            error_message,
            created_at,
            parsed_contacts
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // If filtering by contact_id, get call sheets linked to that contact
      if (contactIdFilter) {
        const { data: contactLinks, error: contactError } = await supabase
          .from('contact_call_sheets')
          .select('call_sheet_id')
          .eq('contact_id', contactIdFilter);

        if (contactError) throw contactError;

        if (contactLinks && contactLinks.length > 0) {
          const callSheetIds = contactLinks.map(cl => cl.call_sheet_id);
          query = query.in('global_call_sheet_id', callSheetIds);
        } else {
          // No call sheets for this contact
          setUserLinks([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter out any links where global_call_sheets is null
      const validLinks = (data || []).filter(link => link.global_call_sheets) as UserCallSheetLink[];
      setUserLinks(validLinks);
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
    fetchUserCallSheets();

    // Subscribe to realtime updates on user_call_sheets
    const userChannel = supabase
      .channel('user_call_sheets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_call_sheets',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('[CallSheetList] User link update:', payload);
          // Refetch to get full data with joins
          fetchUserCallSheets();
        }
      )
      .subscribe();

    // Subscribe to global_call_sheets updates (for status changes)
    const globalChannel = supabase
      .channel('global_call_sheets_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'global_call_sheets'
        },
        (payload) => {
          console.log('[CallSheetList] Global sheet update:', payload);
          // Update local state if we have this sheet
          setUserLinks(prev => 
            prev.map(link => 
              link.global_call_sheet_id === payload.new.id 
                ? { ...link, global_call_sheets: payload.new as GlobalCallSheet }
                : link
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userChannel);
      supabase.removeChannel(globalChannel);
    };
  }, [userId, contactIdFilter]);

  // Delete handler - removes user's link, not the global artifact
  const handleDelete = async () => {
    if (!deleteLink) return;
    
    setDeleting(true);
    try {
      // Delete user's link only
      const { error: dbError } = await supabase
        .from('user_call_sheets')
        .delete()
        .eq('id', deleteLink.id);

      if (dbError) throw dbError;

      toast({
        title: "Call sheet removed",
        description: `${deleteLink.user_label || deleteLink.global_call_sheets.original_file_name} has been removed from your list.`
      });

      setUserLinks(prev => prev.filter(link => link.id !== deleteLink.id));
      setDeleteLink(null);
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

  // Retry parsing - updates the global artifact
  const handleRetry = async (sheet: GlobalCallSheet) => {
    try {
      // Reset status to queued
      const { error: updateError } = await supabase
        .from('global_call_sheets')
        .update({ 
          status: 'queued', 
          error_message: null,
          retry_count: 0,
          parsing_started_at: null
        })
        .eq('id', sheet.id);

      if (updateError) throw updateError;

      // Trigger parsing
      await supabase.functions.invoke('parse-call-sheet', {
        body: { call_sheet_id: sheet.id }
      });

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

  if (userLinks.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium">
          {contactIdFilter ? "No call sheets for this contact" : "No call sheets yet"}
        </p>
        <p className="text-sm text-muted-foreground">
          {contactIdFilter 
            ? "This contact hasn't been linked to any call sheets"
            : "Upload your first call sheet to get started"
          }
        </p>
      </div>
    );
  }

  return (
    <>
      {contactIdFilter && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Showing call sheets linked to selected contact
          </p>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Contacts</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userLinks.map((link) => {
              const sheet = link.global_call_sheets;
              const displayName = link.user_label || sheet.original_file_name;
              
              return (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate max-w-[200px]">{displayName}</span>
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
                    {link.created_at ? format(new Date(link.created_at), 'MMM d, yyyy') : '—'}
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
                        onClick={() => setDeleteLink(link)}
                        title="Remove from my list"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Parsed Contacts Viewer */}
      {selectedSheet && (
        <ParsedContactsViewer
          callSheet={{
            id: selectedSheet.id,
            file_name: selectedSheet.original_file_name,
            parsed_contacts: selectedSheet.parsed_contacts
          }}
          onClose={() => setSelectedSheet(null)}
          userId={userId}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteLink} onOpenChange={() => setDeleteLink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Call Sheet?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{deleteLink?.user_label || deleteLink?.global_call_sheets.original_file_name}" from your list.
              The call sheet data will remain in the system for other users who have it.
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
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
