import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Star, ArrowUpDown, Youtube, FileSpreadsheet, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export interface ContactFilters {
  selectedRoles: string[];
  selectedDepartments: string[];
  contactInfoFilter: 'all' | 'phone' | 'email' | 'ig' | 'nova' | 'none';
  favoritesOnly: boolean;
  sortByAppearances: 'asc' | 'desc' | null;
  sortByYouTubeViews: 'asc' | 'desc' | null;
  selectedCallSheetIds: string[];
}

interface CallSheetOption {
  id: string;
  displayName: string;
  createdAt: string;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ContactFilters;
  onFiltersChange: (filters: ContactFilters) => void;
  availableRoles: { role: string; count: number; department: string }[];
  availableDepartments: string[];
  userId?: string;
}

export function FilterModal({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  availableRoles,
  availableDepartments,
  userId,
}: FilterModalProps) {
  const [roleSearch, setRoleSearch] = useState("");
  const [localFilters, setLocalFilters] = useState<ContactFilters>(filters);
  const [callSheets, setCallSheets] = useState<CallSheetOption[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);

  // Reset local filters when modal opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setLocalFilters(filters);
      setRoleSearch("");
      if (userId) fetchCallSheets();
    } else {
      onClose();
    }
  };

  const fetchCallSheets = async () => {
    if (!userId) return;
    setLoadingSheets(true);
    try {
      const { data, error } = await supabase
        .from('user_call_sheets')
        .select(`
          global_call_sheet_id,
          created_at,
          global_call_sheets!inner (
            id,
            original_file_name,
            status,
            youtube_video_id,
            youtube_videos ( title )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const sheets: CallSheetOption[] = (data || [])
        .filter((row: any) => row.global_call_sheets?.status === 'complete')
        .map((row: any) => {
          const gcs = row.global_call_sheets;
          const videoTitle = gcs?.youtube_videos?.title;
          return {
            id: gcs.id,
            displayName: videoTitle || gcs.original_file_name || 'Unknown',
            createdAt: row.created_at,
          };
        });

      setCallSheets(sheets);
    } catch (err) {
      console.error('[FilterModal] Failed to fetch call sheets:', err);
    } finally {
      setLoadingSheets(false);
    }
  };

  // Group roles by department
  const rolesByDepartment = useMemo(() => {
    const grouped: Record<string, { role: string; count: number }[]> = {};
    
    availableRoles
      .filter(r => 
        roleSearch === "" || 
        r.role.toLowerCase().includes(roleSearch.toLowerCase())
      )
      .forEach(r => {
        const dept = r.department || "Other";
        if (!grouped[dept]) grouped[dept] = [];
        grouped[dept].push({ role: r.role, count: r.count });
      });

    if (localFilters.sortByAppearances) {
      Object.values(grouped).forEach(roles => {
        roles.sort((a, b) => 
          localFilters.sortByAppearances === 'desc' 
            ? b.count - a.count 
            : a.count - b.count
        );
      });
    }

    return grouped;
  }, [availableRoles, roleSearch, localFilters.sortByAppearances]);

  const toggleRole = (role: string) => {
    setLocalFilters(prev => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(role)
        ? prev.selectedRoles.filter(r => r !== role)
        : [...prev.selectedRoles, role]
    }));
  };

  const toggleDepartment = (dept: string) => {
    setLocalFilters(prev => ({
      ...prev,
      selectedDepartments: prev.selectedDepartments.includes(dept)
        ? prev.selectedDepartments.filter(d => d !== dept)
        : [...prev.selectedDepartments, dept]
    }));
  };

  const toggleCallSheet = (sheetId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      selectedCallSheetIds: prev.selectedCallSheetIds.includes(sheetId)
        ? prev.selectedCallSheetIds.filter(id => id !== sheetId)
        : [...prev.selectedCallSheetIds, sheetId]
    }));
  };

  const setContactInfoFilter = (filter: ContactFilters['contactInfoFilter']) => {
    setLocalFilters(prev => ({
      ...prev,
      contactInfoFilter: prev.contactInfoFilter === filter ? 'all' : filter
    }));
  };

  const toggleSortByAppearances = () => {
    setLocalFilters(prev => ({
      ...prev,
      sortByAppearances: 
        prev.sortByAppearances === null ? 'desc' :
        prev.sortByAppearances === 'desc' ? 'asc' : null
    }));
  };

  const toggleSortByYouTubeViews = () => {
    setLocalFilters(prev => ({
      ...prev,
      sortByYouTubeViews: 
        prev.sortByYouTubeViews === null ? 'desc' :
        prev.sortByYouTubeViews === 'desc' ? 'asc' : null
    }));
  };

  const clearAll = () => {
    setLocalFilters({
      selectedRoles: [],
      selectedDepartments: [],
      contactInfoFilter: 'all',
      favoritesOnly: false,
      sortByAppearances: null,
      sortByYouTubeViews: null,
      selectedCallSheetIds: [],
    });
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const activeCount = 
    localFilters.selectedRoles.length + 
    localFilters.selectedDepartments.length + 
    (localFilters.contactInfoFilter !== 'all' ? 1 : 0) +
    (localFilters.favoritesOnly ? 1 : 0) +
    localFilters.selectedCallSheetIds.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col overflow-hidden min-h-0">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Filter Contacts</span>
            {activeCount > 0 && (
              <Badge variant="secondary">{activeCount} active</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-[1fr_1.5fr] gap-4">
          {/* LEFT PANEL: Call Sheets */}
          <div className="flex flex-col min-h-0 border rounded-md">
            <div className="p-3 border-b">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <FileSpreadsheet className="h-4 w-4" />
                From Call Sheets
              </Label>
              {localFilters.selectedCallSheetIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {localFilters.selectedCallSheetIds.length} selected
                </p>
              )}
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-1">
                {loadingSheets ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : callSheets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 px-4">
                    No parsed call sheets yet
                  </p>
                ) : (
                  callSheets.map(sheet => {
                    const isSelected = localFilters.selectedCallSheetIds.includes(sheet.id);
                    return (
                      <div
                        key={sheet.id}
                        className={cn(
                          "flex items-start gap-3 p-2.5 rounded-md cursor-pointer transition-colors",
                          isSelected
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted border border-transparent"
                        )}
                        onClick={() => toggleCallSheet(sheet.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          className="mt-0.5"
                          onCheckedChange={() => toggleCallSheet(sheet.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            isSelected && "text-primary"
                          )}>
                            {sheet.displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(sheet.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT PANEL: Existing Filters */}
          <ScrollArea className="min-h-0 pr-4">
            <div className="space-y-6">
              {/* Search Roles */}
              <div className="space-y-2">
                <Label>Search Roles</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    placeholder="Search roles..."
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Sort & Quick Filters */}
              <div className="flex items-center gap-4 flex-wrap">
                <Button
                  variant={localFilters.sortByAppearances ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleSortByAppearances}
                >
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Sort by Appearances
                  {localFilters.sortByAppearances && (
                    <span className="ml-1">({localFilters.sortByAppearances})</span>
                  )}
                </Button>

                <Button
                  variant={localFilters.sortByYouTubeViews ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleSortByYouTubeViews}
                >
                  <Youtube className="h-4 w-4 mr-2" />
                  Sort by YouTube Views
                  {localFilters.sortByYouTubeViews && (
                    <span className="ml-1">({localFilters.sortByYouTubeViews})</span>
                  )}
                </Button>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="favorites-filter"
                    checked={localFilters.favoritesOnly}
                    onCheckedChange={(checked) => 
                      setLocalFilters(prev => ({ ...prev, favoritesOnly: checked === true }))
                    }
                  />
                  <Label htmlFor="favorites-filter" className="flex items-center gap-1 cursor-pointer">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    Favorites only
                  </Label>
                </div>
              </div>

              {/* Contact Info Filter */}
              <div className="space-y-2">
                <Label>Filter by Contact Info</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'phone' as const, label: 'Has Phone' },
                    { key: 'email' as const, label: 'Has Email' },
                    { key: 'ig' as const, label: 'Has Instagram' },
                    { key: 'nova' as const, label: 'Has NOVA' },
                    { key: 'none' as const, label: 'No Contact Info' },
                  ].map(({ key, label }) => (
                    <Button
                      key={key}
                      variant={localFilters.contactInfoFilter === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setContactInfoFilter(key)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Departments */}
              <div className="space-y-2">
                <Label>Departments</Label>
                <div className="flex flex-wrap gap-2">
                  {availableDepartments.map(dept => (
                    <Badge
                      key={dept}
                      variant={localFilters.selectedDepartments.includes(dept) ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-primary/80 transition-colors"
                      onClick={() => toggleDepartment(dept)}
                    >
                      {dept}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Roles by Department */}
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto">
                  {Object.entries(rolesByDepartment).map(([dept, roles]) => (
                    <div key={dept} className="mb-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">{dept}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {roles.map(({ role, count }) => (
                          <Badge
                            key={role}
                            variant={localFilters.selectedRoles.includes(role) ? 'default' : 'outline'}
                            className={cn(
                              "cursor-pointer transition-colors text-xs",
                              localFilters.selectedRoles.includes(role) 
                                ? "hover:bg-primary/80" 
                                : "hover:bg-muted"
                            )}
                            onClick={() => toggleRole(role)}
                          >
                            {role}
                            <span className="ml-1 opacity-60">({count})</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                  {Object.keys(rolesByDepartment).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No roles found
                    </p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="ghost" onClick={clearAll}>
            Clear All
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
