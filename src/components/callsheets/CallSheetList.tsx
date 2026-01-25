import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  FileText, 
  Clock, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Eye,
  RefreshCw,
  Users,
  Search,
  X,
  FileType,
  List,
  PlayCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CreditsModal } from "./CreditsModal";
import { CallSheetBulkActionsBar } from "./CallSheetBulkActionsBar";
import { PaymentStatusRadio } from "./PaymentStatusRadio";
import { ReparseControlPanel } from "./ReparseControlPanel";

interface GlobalCallSheet {
  id: string;
  original_file_name: string;
  master_file_path: string;
  status: string;
  contacts_extracted: number | null;
  error_message: string | null;
  created_at: string;
  parsed_contacts: unknown;
  parsed_date: string | null;
  youtube_url: string | null;
  youtube_view_count: number | null;
  youtube_last_synced: string | null;
}

interface UserCallSheetLink {
  id: string;
  user_label: string | null;
  created_at: string;
  global_call_sheet_id: string;
  global_call_sheets: GlobalCallSheet;
  payment_status: string;
  payment_status_locked: boolean;
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
  const navigate = useNavigate();
  const contactIdFilter = searchParams.get('contact_id');
  
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
  
  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  
  // PDF viewer modal state
  const [viewingPdf, setViewingPdf] = useState<{ filePath: string; fileName: string } | null>(null);
  
  // Credits modal state
  const [creditsSheet, setCreditsSheet] = useState<{ id: string; fileName: string } | null>(null);

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
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
    try {
      let query = supabase
        .from('user_call_sheets')
        .select(`
          id,
          user_label,
          created_at,
          global_call_sheet_id,
          payment_status,
          payment_status_locked,
          global_call_sheets (
            id,
            original_file_name,
            master_file_path,
            status,
            contacts_extracted,
            error_message,
            created_at,
            parsed_contacts,
            parsed_date,
            youtube_url,
            youtube_view_count,
            youtube_last_synced
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
      
      // Filter out any links where global_call_sheets is null, and ensure defaults for payment fields
      const validLinks = (data || [])
        .filter(link => link.global_call_sheets)
        .map(link => ({
          ...link,
          payment_status: link.payment_status || 'unanswered',
          payment_status_locked: link.payment_status_locked ?? false
        })) as UserCallSheetLink[];
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
  }, [userId, contactIdFilter]);

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
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
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

  // Search/filter logic
  const filteredSheets = useMemo(() => {
    if (!debouncedSearch.trim()) return sortedSheets;
    
    const query = debouncedSearch.toLowerCase().trim();
    
    return sortedSheets.filter(link => {
      const sheet = link.global_call_sheets;
      const displayName = link.user_label || sheet.original_file_name;
      
      // 1. Filename match
      if (displayName.toLowerCase().includes(query)) return true;
      
      // 2. Parsed contacts match
      if (sheet.parsed_contacts && Array.isArray(sheet.parsed_contacts)) {
        const hasMatch = (sheet.parsed_contacts as any[]).some((contact: any) => {
          const nameMatch = contact.name?.toLowerCase().includes(query);
          const roleMatch = contact.roles?.some((r: string) => 
            r.toLowerCase().includes(query)
          );
          const deptMatch = contact.departments?.some((d: string) => 
            d.toLowerCase().includes(query)
          );
          return nameMatch || roleMatch || deptMatch;
        });
        if (hasMatch) return true;
      }
      
      return false;
    });
  }, [sortedSheets, debouncedSearch]);

  // Selection helpers
  const handleSelectOne = useCallback((linkId: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(linkId);
      } else {
        next.delete(linkId);
      }
      return next;
    });
  }, []);

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

  // Payment status change handler
  const handlePaymentStatusChange = useCallback((linkId: string, newStatus: string, locked: boolean) => {
    setUserLinks(prev => prev.map(link => 
      link.id === linkId 
        ? { ...link, payment_status: newStatus, payment_status_locked: locked }
        : link
    ));
  }, []);

  // Get global IDs for selected links (for re-parse)
  const selectedGlobalIds = useMemo(() => {
    return filteredSheets
      .filter(link => selectedIds.has(link.id))
      .map(link => link.global_call_sheet_id);
  }, [filteredSheets, selectedIds]);

  // Calculate status counts for reparse panel
  const statusCounts = useMemo(() => {
    const counts = { pending: 0, queued: 0, parsing: 0, parsed: 0, error: 0 };
    userLinks.forEach(link => {
      const status = link.global_call_sheets.status;
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [userLinks]);

  // Get pending and error sheet IDs for reparse panel
  const pendingSheetIds = useMemo(() => {
    return userLinks
      .filter(link => link.global_call_sheets.status === 'pending')
      .map(link => link.global_call_sheet_id);
  }, [userLinks]);

  const errorSheetIds = useMemo(() => {
    return userLinks
      .filter(link => link.global_call_sheets.status === 'error')
      .map(link => link.global_call_sheet_id);
  }, [userLinks]);

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
      {/* Filter banner for contact filter */}
      {contactIdFilter && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {searchParams.get('contact_name') 
              ? `Showing call sheets for ${decodeURIComponent(searchParams.get('contact_name')!)}`
              : "Showing call sheets linked to selected contact"
            }
          </p>
        </div>
      )}

      {/* Reparse Control Panel - shows when pending/error sheets exist */}
      <ReparseControlPanel
        statusCounts={statusCounts}
        pendingSheetIds={pendingSheetIds}
        errorSheetIds={errorSheetIds}
        onQueueComplete={fetchUserCallSheets}
      />

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by filename or contact..."
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

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <CallSheetBulkActionsBar
          selectedIds={Array.from(selectedIds)}
          selectedGlobalIds={selectedGlobalIds}
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
              onView={(sheet) => navigate(`/call-sheets/${sheet.id}/review`)}
              onViewPdf={(sheet) => setViewingPdf({ 
                filePath: sheet.master_file_path, 
                fileName: sheet.original_file_name 
              })}
              onCredits={(sheet) => setCreditsSheet({ 
                id: sheet.id, 
                fileName: sheet.original_file_name 
              })}
              onRetry={handleRetry}
              onDelete={(link) => setDeleteLink(link)}
              onPaymentStatusChange={handlePaymentStatusChange}
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
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Contacts</TableHead>
                <TableHead>Have you been paid yet?</TableHead>
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
                      onCheckedChange={(checked) => handleSelectOne(link.id, !!checked)}
                    />
                  </TableCell>
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
                  {/* Payment Status Column */}
                  <TableCell>
                    {!link.payment_status_locked ? (
                      <PaymentStatusRadio
                        linkId={link.id}
                        currentStatus={link.payment_status as 'unanswered' | 'waiting' | 'paid' | 'unpaid_needs_proof' | 'free_labor'}
                        isLocked={link.payment_status_locked}
                        onStatusChange={(newStatus, locked) => handlePaymentStatusChange(link.id, newStatus, locked)}
                      />
                    ) : null}
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
                        {sheet.status === 'parsed' && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/call-sheets/${sheet.id}/review`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View contacts</TooltipContent>
                            </Tooltip>
                            
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
                                  <FileType className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View PDF</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCreditsSheet({ 
                                    id: sheet.id, 
                                    fileName: sheet.original_file_name 
                                  })}
                                >
                                  <List className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Generate credits</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        {sheet.status === 'error' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRetry(sheet)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Retry parsing</TooltipContent>
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

      {/* Credits Modal */}
      <CreditsModal
        open={!!creditsSheet}
        onOpenChange={(open) => !open && setCreditsSheet(null)}
        callSheetId={creditsSheet?.id || ''}
        fileName={creditsSheet?.fileName || ''}
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
