import { useState, useMemo } from "react";
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
import { Search, Star, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContactFilters {
  selectedRoles: string[];
  selectedDepartments: string[];
  contactInfoFilter: 'all' | 'phone' | 'email' | 'ig' | 'none';
  favoritesOnly: boolean;
  sortByAppearances: 'asc' | 'desc' | null;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ContactFilters;
  onFiltersChange: (filters: ContactFilters) => void;
  availableRoles: { role: string; count: number; department: string }[];
  availableDepartments: string[];
}

export function FilterModal({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  availableRoles,
  availableDepartments,
}: FilterModalProps) {
  const [roleSearch, setRoleSearch] = useState("");
  const [localFilters, setLocalFilters] = useState<ContactFilters>(filters);

  // Reset local filters when modal opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setLocalFilters(filters);
      setRoleSearch("");
    } else {
      onClose();
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

    // Sort roles by count if sortByAppearances is set
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

  const clearAll = () => {
    setLocalFilters({
      selectedRoles: [],
      selectedDepartments: [],
      contactInfoFilter: 'all',
      favoritesOnly: false,
      sortByAppearances: null,
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
    (localFilters.favoritesOnly ? 1 : 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col overflow-hidden min-h-0">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Filter Contacts</span>
            {activeCount > 0 && (
              <Badge variant="secondary">{activeCount} active</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
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
