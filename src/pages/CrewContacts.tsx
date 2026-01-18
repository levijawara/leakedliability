import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { VirtualizedContactsTable } from "@/components/contacts/VirtualizedContactsTable";
import { VirtualizedContactsGrid } from "@/components/contacts/VirtualizedContactsGrid";
import { ContactsToolbar } from "@/components/contacts/ContactsToolbar";
import { FilterModal, ContactFilters } from "@/components/contacts/FilterModal";
import { BulkActionsBar } from "@/components/contacts/BulkActionsBar";
import { ExportButton } from "@/components/contacts/ExportButton";
import { DuplicateMergeModal } from "@/components/contacts/DuplicateMergeModal";
import { Button } from "@/components/ui/button";
import { Users, Database, Loader2, FileSpreadsheet, Instagram } from "lucide-react";
import { findDuplicateGroups, DuplicateGroup, ContactForMatching } from "@/lib/duplicateDetection";

export interface CrewContact {
  id: string;
  name: string;
  emails: string[] | null;
  phones: string[] | null;
  roles: string[] | null;
  departments: string[] | null;
  ig_handle: string | null;
  project_title: string | null;
  source_files: string[] | null;
  confidence: number | null;
  needs_review: boolean | null;
  is_favorite: boolean | null;
  created_at: string | null;
}

const VIEW_STORAGE_KEY = 'crew-contacts-view';
const PRIVACY_STORAGE_KEY = 'crew-contacts-show-info';
const RECENTLY_ADDED_THRESHOLD_MINUTES = 5;

const defaultFilters: ContactFilters = {
  selectedRoles: [],
  selectedDepartments: [],
  contactInfoFilter: 'all',
  favoritesOnly: false,
  sortByAppearances: null,
};

export default function CrewContacts() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<CrewContact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 200);
  const [view, setView] = useState<'list' | 'cards'>(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    return (stored === 'cards' || stored === 'list') ? stored : 'list';
  });
  const [showContactInfo, setShowContactInfo] = useState<boolean>(() => {
    const stored = localStorage.getItem(PRIVACY_STORAGE_KEY);
    return stored === 'true';
  });
  const [callSheetCounts, setCallSheetCounts] = useState<Record<string, number>>({});
  
  // New state for enhanced features
  const [recentlyAddedActive, setRecentlyAddedActive] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<ContactFilters>(defaultFilters);
  
  // Duplicate detection state
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [findingDuplicates, setFindingDuplicates] = useState(false);
  
  // Admin backfill state
  const [isAdmin, setIsAdmin] = useState(false);
  const [backfillRunning, setBackfillRunning] = useState(false);
  
  // IG auto-match state
  const [autoMatchRunning, setAutoMatchRunning] = useState(false);

  // Persist view preference
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  // Persist privacy preference
  useEffect(() => {
    localStorage.setItem(PRIVACY_STORAGE_KEY, String(showContactInfo));
  }, [showContactInfo]);

  useEffect(() => {
    const loadContacts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Session and beta access are guaranteed by RequireAuth wrapper
      if (session) {
        setUser(session.user);
        fetchContacts(session.user.id);
        
        // Check admin status
        const { data: adminData } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: 'admin'
        });
        setIsAdmin(adminData === true);
      } else {
        setLoading(false);
      }
    };

    loadContacts();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Bug #2 Fix: Realtime subscription for crew_contacts updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('crew_contacts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crew_contacts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[CrewContacts] Contact update detected:', payload.eventType);
          // Debounce refetch to handle rapid updates (e.g., multiple merges)
          setTimeout(() => {
            fetchContacts(user.id);
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchContacts = async (userId: string) => {
    const PAGE_SIZE = 1000;
    const MAX_CONTACTS = 100000;
    let allContacts: CrewContact[] = [];
    let from = 0;

    try {
      while (from < MAX_CONTACTS) {
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from('crew_contacts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        if (!data || data.length === 0) break;

        allContacts = [...allContacts, ...data];
        console.log(`[CrewContacts] Fetched page: ${data.length} rows (total so far: ${allContacts.length})`);

        if (data.length < PAGE_SIZE) break;

        from += PAGE_SIZE;
      }

      console.log(`[CrewContacts] Total contacts loaded: ${allContacts.length}`);
      setContacts(allContacts);
      
      fetchCallSheetCounts(allContacts.map(c => c.id));
    } catch (error: any) {
      console.error('[CrewContacts] Fetch error:', error);
      toast({
        title: "Failed to load contacts",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCallSheetCounts = async (_contactIds: string[]) => {
    // Note: We don't use contactIds filter to avoid URL-length issues with large sets.
    // RLS ensures we only see rows belonging to the current user's contacts.
    const PAGE_SIZE = 1000;
    let allRows: { contact_id: string }[] = [];
    let from = 0;

    console.log(`[CrewContacts] Counting call sheet appearances for ${_contactIds.length} contacts...`);

    try {
      while (true) {
        const { data, error } = await supabase
          .from('contact_call_sheets')
          .select('contact_id')
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allRows = [...allRows, ...data];

        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      console.log(`[CrewContacts] Loaded ${allRows.length} contact_call_sheets rows`);

      const counts: Record<string, number> = {};
      allRows.forEach(row => {
        counts[row.contact_id] = (counts[row.contact_id] || 0) + 1;
      });

      const nonZeroCount = Object.keys(counts).length;
      console.log(`[CrewContacts] Contacts with appearances: ${nonZeroCount}`);

      setCallSheetCounts(counts);
    } catch (error: any) {
      console.error('[CrewContacts] Failed to fetch call sheet counts:', error);
    }
  };

  // Calculate recently added contacts (within threshold of most recent)
  const recentlyAddedContacts = useMemo(() => {
    if (contacts.length === 0) return [];
    
    const sortedByDate = [...contacts].sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    
    const mostRecent = new Date(sortedByDate[0]?.created_at || 0).getTime();
    const threshold = RECENTLY_ADDED_THRESHOLD_MINUTES * 60 * 1000;
    
    return sortedByDate.filter(c => {
      const contactTime = new Date(c.created_at || 0).getTime();
      return mostRecent - contactTime <= threshold;
    });
  }, [contacts]);

  // Calculate available roles with counts and departments
  const availableRoles = useMemo(() => {
    const roleCounts: Record<string, { count: number; department: string }> = {};
    
    contacts.forEach(c => {
      c.roles?.forEach((role, idx) => {
        const dept = c.departments?.[idx] || c.departments?.[0] || 'Other';
        if (!roleCounts[role]) {
          roleCounts[role] = { count: 0, department: dept };
        }
        roleCounts[role].count++;
      });
    });
    
    return Object.entries(roleCounts).map(([role, { count, department }]) => ({
      role,
      count,
      department
    }));
  }, [contacts]);

  // Get unique departments
  const availableDepartments = useMemo(() => {
    return Array.from(
      new Set(contacts.flatMap(c => c.departments || []).filter(Boolean))
    ).sort();
  }, [contacts]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    return (
      filters.selectedRoles.length +
      filters.selectedDepartments.length +
      (filters.contactInfoFilter !== 'all' ? 1 : 0) +
      (filters.favoritesOnly ? 1 : 0)
    );
  }, [filters]);

  // OPTIMIZED: Use useMemo instead of useEffect + setState for filtered contacts
  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    // Recently Added filter
    if (recentlyAddedActive) {
      const recentIds = new Set(recentlyAddedContacts.map(c => c.id));
      result = result.filter(c => recentIds.has(c.id));
    }

    // Search filter - use debounced value
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.emails?.some(e => e.toLowerCase().includes(query)) ||
        c.phones?.some(p => p.includes(query)) ||
        c.roles?.some(r => r.toLowerCase().includes(query)) ||
        c.departments?.some(d => d.toLowerCase().includes(query)) ||
        c.ig_handle?.toLowerCase().includes(query) ||
        c.project_title?.toLowerCase().includes(query)
      );
    }

    // Department filter
    if (filters.selectedDepartments.length > 0) {
      result = result.filter(c =>
        c.departments?.some(d => 
          filters.selectedDepartments.some(fd => fd.toLowerCase() === d.toLowerCase())
        )
      );
    }

    // Role filter
    if (filters.selectedRoles.length > 0) {
      result = result.filter(c =>
        c.roles?.some(r => filters.selectedRoles.includes(r))
      );
    }

    // Contact info filter
    if (filters.contactInfoFilter !== 'all') {
      result = result.filter(c => {
        const hasPhone = c.phones && c.phones.length > 0;
        const hasEmail = c.emails && c.emails.length > 0;
        const hasIg = !!c.ig_handle;
        
        switch (filters.contactInfoFilter) {
          case 'phone': return hasPhone;
          case 'email': return hasEmail;
          case 'ig': return hasIg;
          case 'none': return !hasPhone && !hasEmail && !hasIg;
          default: return true;
        }
      });
    }

    // Favorites filter
    if (filters.favoritesOnly) {
      result = result.filter(c => c.is_favorite === true);
    }

    // Sort by appearances if enabled (works independently of other filters)
    if (filters.sortByAppearances) {
      result.sort((a, b) => {
        const aCount = callSheetCounts[a.id] || 0;
        const bCount = callSheetCounts[b.id] || 0;
        return filters.sortByAppearances === 'desc' 
          ? bCount - aCount 
          : aCount - bCount;
      });
    }

    return result;
  }, [contacts, debouncedSearchQuery, filters, recentlyAddedActive, recentlyAddedContacts, callSheetCounts]);

  // Clear selection when exiting select mode
  useEffect(() => {
    if (!selectMode) {
      setSelectedIds(new Set());
    }
  }, [selectMode]);

  const handleContactUpdate = useCallback((updatedContact: CrewContact) => {
    setContacts(prev =>
      prev.map(c => c.id === updatedContact.id ? updatedContact : c)
    );
  }, []);

  const handleContactDelete = useCallback((contactId: string) => {
    setContacts(prev => prev.filter(c => c.id !== contactId));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(contactId);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback((ids: string[]) => {
    setContacts(prev => prev.filter(c => !ids.includes(c.id)));
    setSelectedIds(new Set());
  }, []);

  const handleBulkFavorite = useCallback(() => {
    setContacts(prev =>
      prev.map(c => selectedIds.has(c.id) ? { ...c, is_favorite: true } : c)
    );
  }, [selectedIds]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredContacts.map(c => c.id)));
  }, [filteredContacts]);

  // Find duplicates handler
  const handleFindDuplicates = useCallback(() => {
    setFindingDuplicates(true);
    
    // Run in next tick to allow UI to update
    setTimeout(() => {
      try {
        // Convert contacts to matching format
        const contactsForMatching: ContactForMatching[] = contacts.map(c => ({
          id: c.id,
          name: c.name,
          roles: c.roles,
          phones: c.phones,
          emails: c.emails,
          ig_handle: c.ig_handle
        }));
        
        const groups = findDuplicateGroups(contactsForMatching);
        console.log(`[CrewContacts] Found ${groups.length} duplicate groups`);
        
        setDuplicateGroups(groups);
        
        if (groups.length > 0) {
          setDuplicateModalOpen(true);
        } else {
          toast({
            title: "No duplicates found",
            description: "All your contacts appear to be unique."
          });
        }
      } catch (error) {
        console.error('[CrewContacts] Duplicate detection error:', error);
        toast({
          title: "Error finding duplicates",
          description: "An error occurred while scanning for duplicates.",
          variant: "destructive"
        });
      } finally {
        setFindingDuplicates(false);
      }
    }, 50);
  }, [contacts, toast]);

  // Handle merge complete
  const handleMergeComplete = useCallback((deletedIds: string[], updatedContacts: CrewContact[]) => {
    setContacts(prev => {
      // Remove deleted contacts
      let updated = prev.filter(c => !deletedIds.includes(c.id));
      // Update merged contacts
      updated = updated.map(c => {
        const updatedVersion = updatedContacts.find(u => u.id === c.id);
        return updatedVersion || c;
      });
      return updated;
    });
    setDuplicateGroups([]);
    // Exit select mode after merge
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  // Manual merge handler - creates a group from selected contacts
  const handleManualMerge = useCallback(() => {
    const selectedContacts = contacts.filter(c => selectedIds.has(c.id));
    
    if (selectedContacts.length < 2) {
      toast({
        title: "Select at least 2 contacts",
        description: "Manual merge requires 2 or more contacts.",
        variant: "destructive"
      });
      return;
    }
    
    // Convert to ContactForMatching format
    const contactsForMatching: ContactForMatching[] = selectedContacts.map(c => ({
      id: c.id,
      name: c.name,
      roles: c.roles,
      phones: c.phones,
      emails: c.emails,
      ig_handle: c.ig_handle
    }));
    
    // Create a single group with first contact as primary
    const [primary, ...rest] = contactsForMatching;
    const manualGroup: DuplicateGroup = {
      primary,
      duplicates: rest.map(contact => ({
        contact,
        matchedFields: ['name'] as ('name' | 'role' | 'phone' | 'email' | 'ig')[]
      }))
    };
    
    setDuplicateGroups([manualGroup]);
    setDuplicateModalOpen(true);
  }, [contacts, selectedIds, toast]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleRunBackfill = useCallback(async () => {
    if (!user || !isAdmin) return;
    
    setBackfillRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'backfill-contact-sheet-attributions'
      );
      
      if (error) throw error;
      
      toast({
        title: "Backfill Complete",
        description: `Scanned ${data.sheets_scanned} sheets, found ${data.matches_found} matches, inserted ${data.inserted} new attributions.`,
      });
      
      // Refresh call sheet counts
      await fetchCallSheetCounts(contacts.map(c => c.id));
      
    } catch (err: any) {
      console.error('[CrewContacts] Backfill error:', err);
      toast({
        title: "Backfill Failed",
        description: "Could not complete attribution backfill. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setBackfillRunning(false);
    }
  }, [user, isAdmin, contacts, toast]);

  const handleAutoMatchIG = useCallback(async () => {
    if (!user) return;
    
    setAutoMatchRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-backfill-ig-from-master');
      
      if (error) throw error;
      
      toast({
        title: "IG Handles Matched",
        description: `Matched ${data.matched} of ${data.total} contacts without IG handles.`,
      });
      
      // Refresh contacts to show updated IG handles
      if (data.matched > 0) {
        fetchContacts(user.id);
      }
      
    } catch (err: any) {
      console.error('[CrewContacts] Auto-match IG error:', err);
      toast({
        title: "Auto-Match Failed",
        description: err.message || "Could not complete IG auto-matching. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setAutoMatchRunning(false);
    }
  }, [user, toast]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:pt-24">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Crew Contacts</h1>
                <p className="text-muted-foreground">
                  Manage contacts extracted from your call sheets
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link to="/call-sheets">
                  <FileSpreadsheet className="h-4 w-4" />
                  Call Sheets
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoMatchIG}
                disabled={autoMatchRunning}
                className="gap-2"
              >
                {autoMatchRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Matching...
                  </>
                ) : (
                  <>
                    <Instagram className="h-4 w-4" />
                    Auto-Match IG
                  </>
                )}
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRunBackfill}
                  disabled={backfillRunning}
                  className="gap-2"
                >
                  {backfillRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4" />
                      Backfill Attributions
                    </>
                  )}
                </Button>
              )}
              <ExportButton 
                filteredContacts={filteredContacts} 
                allContacts={contacts}
                hasActiveFilters={activeFilterCount > 0 || !!debouncedSearchQuery.trim() || recentlyAddedActive}
              />
            </div>
          </div>

          {/* Toolbar */}
          <ContactsToolbar
            view={view}
            onViewChange={setView}
            recentlyAddedActive={recentlyAddedActive}
            onRecentlyAddedToggle={() => setRecentlyAddedActive(!recentlyAddedActive)}
            recentlyAddedCount={recentlyAddedContacts.length}
            selectMode={selectMode}
            onSelectModeToggle={() => setSelectMode(!selectMode)}
            selectedCount={selectedIds.size}
            activeFilterCount={activeFilterCount}
            onFilterClick={() => setFilterModalOpen(true)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filteredCount={filteredContacts.length}
            totalCount={contacts.length}
            showContactInfo={showContactInfo}
            onShowContactInfoChange={setShowContactInfo}
            onFindDuplicates={handleFindDuplicates}
            duplicateCount={duplicateGroups.length}
            findingDuplicates={findingDuplicates}
          />

          {/* Bulk Actions Bar */}
          {selectMode && (
            <BulkActionsBar
              selectedIds={Array.from(selectedIds)}
              totalCount={filteredContacts.length}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onBulkFavorite={handleBulkFavorite}
              onBulkDelete={handleBulkDelete}
              onManualMerge={handleManualMerge}
              userId={user?.id}
            />
          )}

          {/* Contacts Display - Now Virtualized */}
          {view === 'list' ? (
            <VirtualizedContactsTable
              contacts={filteredContacts}
              userId={user?.id}
              onContactUpdate={handleContactUpdate}
              onContactDelete={handleContactDelete}
              showContactInfo={showContactInfo}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          ) : (
            <VirtualizedContactsGrid
              contacts={filteredContacts}
              callSheetCounts={callSheetCounts}
              userId={user?.id}
              onContactUpdate={handleContactUpdate}
              onContactDelete={handleContactDelete}
              showContactInfo={showContactInfo}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          )}
        </div>
      </main>

      {/* Filter Modal */}
      <FilterModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        availableRoles={availableRoles}
        availableDepartments={availableDepartments}
      />

      {/* Duplicate Merge Modal */}
      <DuplicateMergeModal
        isOpen={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        duplicateGroups={duplicateGroups}
        contacts={contacts}
        userId={user?.id || ''}
        onMergeComplete={handleMergeComplete}
      />

      <Footer />
    </div>
  );
}
