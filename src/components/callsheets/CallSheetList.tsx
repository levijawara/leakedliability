import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  FileText, 
  Loader2, 
  Trash2, 
  Search,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SortToggle, SortField, SortDirection } from "./SortToggle";
import { ViewToggle } from "@/components/contacts/ViewToggle";
import { CallSheetCard } from "./CallSheetCard";
import { PDFViewerModal } from "./PDFViewerModal";
import { CallSheetBulkActionsBar } from "./CallSheetBulkActionsBar";

interface GlobalCallSheet {
  id: string;
  original_file_name: string;
  master_file_path: string;
  status: string;
  error_message: string | null;
  created_at: string;
  parsed_date: string | null;
}

interface UserCallSheetLink {
  id: string;
  user_label: string | null;
  created_at: string;
  global_call_sheet_id: string;
  global_call_sheets: GlobalCallSheet;
}

interface CallSheetListProps {}

// Custom hook for debounced value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export function CallSheetList({}: CallSheetListProps) {
  const [searchParams] = useSearchParams();
  
  // Get userId from session to prevent RLS race conditions
  const [userId, setUserId] = useState<string | null>(null);
  
  const [userLinks, setUserLinks] = useState<UserCallSheetLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLink, setDeleteLink] = useState<UserCallSheetLink | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // Sorting and search state
  const [sortField, setSortField] = useState<SortField>('uploadDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // View mode state - default to cards view
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');
  
  // PDF viewer modal state
  const [viewingPdf, setViewingPdf] = useState<{ filePath: string; fileName: string } | null>(null);

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  
  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);

  // Initialize search from URL param
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchQuery(decodeURIComponent(searchParam));
    }
  }, []);

  // Sort handler
  const handleSortChange = useCallback((field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  }, []);

  // Fetch user's call sheet links with global call sheet data
  const fetchUserCallSheets = async () => {
    // GUARD: Abort if userId is not yet available (prevents stale closure errors)
    if (!userId) {
      console.warn('[CallSheetList] fetchUserCallSheets called without userId, skipping');
      return;
    }
    
    try {
      // Step 1: Fetch user call sheets with global data
      const { data, error } = await supabase
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
            error_message,
            created_at,
            parsed_date
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
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

  // Get userId from session on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };
    getUser();
  }, []);

  // Initial fetch and realtime subscription - wait for userId
  useEffect(() => {
    if (!userId) return;
    
    fetchUserCallSheets();
    
    // Check if user is admin
    const checkAdmin = async () => {
      const { data: isAdminData } = await supabase.rpc('has_role', { 
        _user_id: userId, 
        _role: 'admin' 
      });
      setIsAdmin(!!isAdminData);
    };
    checkAdmin();

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
  }, [userId]);

  // Delete handler - Only removes user's personal link (Library of Alexandria model)
  const handleDelete = async () => {
    if (!deleteLink) return;
    
    setDeleting(true);
    const sheet = deleteLink.global_call_sheets;
    
    try {
      console.log('[CallSheetList] Removing user link for:', sheet.original_file_name);
      
      // Only delete THIS user's link - preserve global artifact forever
      const { error: dbError } = await supabase
        .from('user_call_sheets')
        .delete()
        .eq('id', deleteLink.id)
        .eq('user_id', userId); // Extra safety

      if (dbError) throw dbError;
      console.log('[CallSheetList] User link removed, global artifact preserved:', sheet.id);

      toast({
        title: "Call sheet removed",
        description: `${sheet.original_file_name} has been removed from your library.`
      });

      setUserLinks(prev => prev.filter(link => link.id !== deleteLink.id));
      setDeleteLink(null);
    } catch (error: any) {
      console.error('[CallSheetList] Remove link error:', error);
      toast({
        title: "Remove failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  // Retry parsing - removed (admin-only now)

  // Sorting logic
  const sortedSheets = useMemo(() => {
    const sorted = [...userLinks];
    
    if (sortField === 'uploadDate') {
      sorted.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else if (sortField === 'shootDate') {
      // Split into with/without parsed_date
      const withDate = sorted.filter(link => link.global_call_sheets.parsed_date);
      const withoutDate = sorted.filter(link => !link.global_call_sheets.parsed_date);
      
      // Sort withDate by parsed_date
      withDate.sort((a, b) => {
        const dateA = new Date(a.global_call_sheets.parsed_date!).getTime();
        const dateB = new Date(b.global_call_sheets.parsed_date!).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
      
      // Sort withoutDate alphabetically by filename
      withoutDate.sort((a, b) => {
        const nameA = (a.user_label || a.global_call_sheets.original_file_name).toLowerCase();
        const nameB = (b.user_label || b.global_call_sheets.original_file_name).toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      // Sheets with dates first, then those without
      return [...withDate, ...withoutDate];
    }
    
    return sorted;
  }, [userLinks, sortField, sortDirection]);

  // Search/filter - filename only
  const filteredSheets = useMemo(() => {
    if (!debouncedSearch.trim()) return sortedSheets;
    const query = debouncedSearch.toLowerCase().trim();
    return sortedSheets.filter(link => {
      const displayName = link.user_label || link.global_call_sheets.original_file_name;
      return displayName.toLowerCase().includes(query);
    });
  }, [sortedSheets, debouncedSearch]);

  // Selection helpers with Shift-click range support
  const handleSelectOne = useCallback((linkId: string, selected: boolean, event?: React.MouseEvent) => {
    // Get ordered list of IDs in current filtered view
    const orderedIds = filteredSheets.map(link => link.id);
    const currentIndex = orderedIds.indexOf(linkId);
    
    // SHIFT-CLICK: Range selection
    if (event?.shiftKey && lastClickedId !== null) {
      const lastIndex = orderedIds.indexOf(lastClickedId);
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        
        // Add all items in range to selection
        setSelectedIds(prev => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) {
            next.add(orderedIds[i]);
          }
          return next;
        });
        setLastClickedId(linkId);
        return;
      }
    }
    
    // REGULAR CLICK / CMD-CTRL-CLICK: Toggle single item
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(linkId);
      } else {
        next.delete(linkId);
      }
      return next;
    });
    
    setLastClickedId(linkId);
  }, [filteredSheets, lastClickedId]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredSheets.map(link => link.id)));
  }, [filteredSheets]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkComplete = useCallback(() => {
    setSelectedIds(new Set());
    fetchUserCallSheets();
  }, []);


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
          No call sheets yet
        </p>
        <p className="text-sm text-muted-foreground">
          Upload your first call sheet to get started
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Sticky Toolbar Container */}
      <div className="sticky top-[73px] z-10 bg-background pb-4 pt-2 -mx-4 px-4 md:-mx-6 md:px-6">
        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <SortToggle
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
          />
          <ViewToggle view={viewMode} onViewChange={setViewMode} />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && userId && (
        <CallSheetBulkActionsBar
          selectedIds={Array.from(selectedIds)}
          totalCount={filteredSheets.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onBulkComplete={handleBulkComplete}
          userId={userId}
        />
      )}

      {/* No results message */}
      {filteredSheets.length === 0 && debouncedSearch && (
        <div className="text-center py-8">
          <Search className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No call sheets match "{debouncedSearch}"
          </p>
        </div>
      )}

      {filteredSheets.length > 0 && viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSheets.map((link) => (
            <CallSheetCard
              key={link.id}
              link={link}
              sortField={sortField}
              isSelected={selectedIds.has(link.id)}
              isAdmin={isAdmin}
              onSelect={handleSelectOne}
              onViewPdf={(sheet) => setViewingPdf({ 
                filePath: sheet.master_file_path, 
                fileName: sheet.original_file_name 
              })}
              onDelete={(l) => setDeleteLink(l)}
            />
          ))}
        </div>
      )}

      {filteredSheets.length > 0 && viewMode === 'list' && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedIds.size === filteredSheets.length && filteredSheets.length > 0}
                    onCheckedChange={(checked) => checked ? handleSelectAll() : handleDeselectAll()}
                  />
                </TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>{sortField === 'shootDate' ? 'Shoot Date' : 'Added'}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSheets.map((link) => {
                const sheet = link.global_call_sheets;
                const displayName = link.user_label || sheet.original_file_name;
              
              return (
                <TableRow key={link.id} className={selectedIds.has(link.id) ? 'bg-muted/50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(link.id)}
                      onCheckedChange={() => {}}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectOne(link.id, !selectedIds.has(link.id), e as unknown as React.MouseEvent);
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate max-w-[200px]">{displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {sortField === 'shootDate' && sheet.parsed_date
                      ? format(new Date(sheet.parsed_date), 'MMM d, yyyy')
                      : link.created_at 
                        ? format(new Date(link.created_at), 'MMM d, yyyy') 
                        : '—'
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider delayDuration={300}>
                      <div className="flex items-center justify-end gap-1">
                        {sheet.master_file_path && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingPdf({ 
                                  filePath: sheet.master_file_path, 
                                  fileName: sheet.original_file_name 
                                })}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View PDF</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteLink(link)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove from library</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      )}

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        open={!!viewingPdf}
        onOpenChange={(open) => !open && setViewingPdf(null)}
        filePath={viewingPdf?.filePath || ''}
        fileName={viewingPdf?.fileName || ''}
      />

      {/* Remove from Library Confirmation - preserves global artifact */}
      <AlertDialog open={!!deleteLink} onOpenChange={() => setDeleteLink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Call Sheet from Your Library?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>This will remove "{deleteLink?.global_call_sheets.original_file_name}" from your personal library.</p>
                <p className="mt-2 text-muted-foreground text-sm">
                  The original file and parsed data remain in the platform archive and may still be accessible to other users who uploaded the same document.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
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
