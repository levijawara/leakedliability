import { ArrowUp, ArrowDown, Calendar, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SortField = 'uploadDate' | 'shootDate';
export type SortDirection = 'asc' | 'desc';

interface SortToggleProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
}

export function SortToggle({ sortField, sortDirection, onSortChange }: SortToggleProps) {
  const toggleDirection = () => {
    onSortChange(sortField, sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const setField = (field: SortField) => {
    if (field === sortField) {
      toggleDirection();
    } else {
      onSortChange(field, 'desc'); // Default to newest first when switching fields
    }
  };

  const DirectionIcon = sortDirection === 'asc' ? ArrowUp : ArrowDown;
  const fieldLabel = sortField === 'uploadDate' ? 'Upload Date' : 'Shoot Date';

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {sortField === 'uploadDate' ? (
              <Upload className="h-3.5 w-3.5" />
            ) : (
              <Calendar className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{fieldLabel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem 
            onClick={() => setField('uploadDate')}
            className={sortField === 'uploadDate' ? 'bg-accent' : ''}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Date
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setField('shootDate')}
            className={sortField === 'shootDate' ? 'bg-accent' : ''}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Shoot Date
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleDirection}
        title={sortDirection === 'asc' ? 'Oldest first' : 'Newest first'}
        className="px-2"
      >
        <DirectionIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
