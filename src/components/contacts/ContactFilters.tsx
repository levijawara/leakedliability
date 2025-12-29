import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Star, Eye, EyeOff } from "lucide-react";
import { ViewToggle } from "./ViewToggle";

interface ContactFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  departmentFilter: string;
  onDepartmentChange: (value: string) => void;
  departments: string[];
  favoritesOnly: boolean;
  onFavoritesChange: (value: boolean) => void;
  view: 'list' | 'cards';
  onViewChange: (view: 'list' | 'cards') => void;
  showContactInfo: boolean;
  onShowContactInfoChange: (value: boolean) => void;
}

export function ContactFilters({
  searchQuery,
  onSearchChange,
  departmentFilter,
  onDepartmentChange,
  departments,
  favoritesOnly,
  onFavoritesChange,
  view,
  onViewChange,
  showContactInfo,
  onShowContactInfoChange,
}: ContactFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-muted/50">
      {/* Search */}
      <div className="flex-1 space-y-2">
        <Label htmlFor="search" className="text-sm">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, email, role..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Department Filter */}
      <div className="w-full sm:w-[200px] space-y-2">
        <Label htmlFor="department" className="text-sm">Department</Label>
        <Select value={departmentFilter} onValueChange={onDepartmentChange}>
          <SelectTrigger id="department">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept.toLowerCase()}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Favorites Toggle */}
      <div className="flex items-end pb-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="favorites"
            checked={favoritesOnly}
            onCheckedChange={(checked) => onFavoritesChange(checked === true)}
          />
          <Label 
            htmlFor="favorites" 
            className="text-sm font-medium cursor-pointer flex items-center gap-1"
          >
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            Favorites only
          </Label>
        </div>
      </div>

      {/* Privacy Toggle */}
      <div className="flex items-end pb-1">
        <Button
          variant={showContactInfo ? "default" : "outline"}
          size="sm"
          onClick={() => onShowContactInfoChange(!showContactInfo)}
          className="flex items-center gap-2"
        >
          {showContactInfo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {showContactInfo ? "Hide Info" : "Show Info"}
        </Button>
      </div>

      {/* View Toggle */}
      <div className="flex items-end pb-1">
        <ViewToggle view={view} onViewChange={onViewChange} />
      </div>
    </div>
  );
}
