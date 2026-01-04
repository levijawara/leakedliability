import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Clock, 
  CheckSquare, 
  Filter, 
  List, 
  LayoutGrid,
  Eye,
  EyeOff,
  GitMerge,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContactsToolbarProps {
  // View
  view: 'list' | 'cards';
  onViewChange: (view: 'list' | 'cards') => void;
  // Recently Added
  recentlyAddedActive: boolean;
  onRecentlyAddedToggle: () => void;
  recentlyAddedCount: number;
  // Select Mode
  selectMode: boolean;
  onSelectModeToggle: () => void;
  selectedCount: number;
  // Filter
  activeFilterCount: number;
  onFilterClick: () => void;
  // Search
  searchQuery: string;
  onSearchChange: (value: string) => void;
  // Contact count
  filteredCount: number;
  totalCount: number;
  // Privacy
  showContactInfo: boolean;
  onShowContactInfoChange: (value: boolean) => void;
  // Duplicates
  onFindDuplicates?: () => void;
  duplicateCount?: number;
  findingDuplicates?: boolean;
}

export function ContactsToolbar({
  view,
  onViewChange,
  recentlyAddedActive,
  onRecentlyAddedToggle,
  recentlyAddedCount,
  selectMode,
  onSelectModeToggle,
  selectedCount,
  activeFilterCount,
  onFilterClick,
  searchQuery,
  onSearchChange,
  filteredCount,
  totalCount,
  showContactInfo,
  onShowContactInfoChange,
  onFindDuplicates,
  duplicateCount,
  findingDuplicates,
}: ContactsToolbarProps) {
  return (
    <div className="sticky top-[73px] z-10 bg-background pb-4 pt-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* View Toggle */}
        <div className="flex items-center border rounded-lg overflow-hidden">
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none h-9 px-3"
            onClick={() => onViewChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'cards' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none h-9 px-3"
            onClick={() => onViewChange('cards')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>

        {/* Recently Added */}
        <Button
          variant={recentlyAddedActive ? 'default' : 'outline'}
          size="sm"
          onClick={onRecentlyAddedToggle}
          className="h-9"
        >
          <Clock className="h-4 w-4 mr-2" />
          Recently Added
          {recentlyAddedActive && recentlyAddedCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5">
              {recentlyAddedCount}
            </Badge>
          )}
        </Button>

        {/* Select Mode */}
        <Button
          variant={selectMode ? 'default' : 'outline'}
          size="sm"
          onClick={onSelectModeToggle}
          className="h-9"
        >
          <CheckSquare className="h-4 w-4 mr-2" />
          Select
          {selectMode && selectedCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5">
              {selectedCount}
            </Badge>
          )}
        </Button>

        {/* Filter */}
        <Button
          variant={activeFilterCount > 0 ? 'default' : 'outline'}
          size="sm"
          onClick={onFilterClick}
          className="h-9"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filter
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* Find Duplicates */}
        {onFindDuplicates && (
          <Button
            variant={duplicateCount && duplicateCount > 0 ? 'default' : 'outline'}
            size="sm"
            onClick={onFindDuplicates}
            disabled={findingDuplicates}
            className="h-9"
          >
            {findingDuplicates ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <GitMerge className="h-4 w-4 mr-2" />
            )}
            {findingDuplicates ? 'Scanning...' : 'Find Duplicates'}
            {duplicateCount !== undefined && duplicateCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {duplicateCount}
              </Badge>
            )}
          </Button>
        )}

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search contacts..."
            className="pl-9 h-9"
          />
        </div>

        {/* Privacy Toggle */}
        <Button
          variant={showContactInfo ? 'default' : 'outline'}
          size="sm"
          onClick={() => onShowContactInfoChange(!showContactInfo)}
          className="h-9"
          title={showContactInfo ? "Hide contact info" : "Show contact info"}
        >
          {showContactInfo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>

        {/* Contact Count */}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {filteredCount === totalCount 
            ? `${totalCount} contacts` 
            : `${filteredCount} of ${totalCount}`}
        </span>
      </div>
    </div>
  );
}
