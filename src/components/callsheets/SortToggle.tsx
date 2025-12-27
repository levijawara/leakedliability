import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortField, SortDirection } from "@/types/callSheet";
import { cn } from "@/lib/utils";

interface SortToggleProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  className?: string;
}

const sortOptions: { field: SortField; label: string }[] = [
  { field: "name", label: "Name" },
  { field: "departments", label: "Department" },
  { field: "roles", label: "Role" },
  { field: "created_at", label: "Date Added" },
  { field: "updated_at", label: "Last Updated" },
];

export function SortToggle({
  sortField,
  sortDirection,
  onSortChange,
  className,
}: SortToggleProps) {
  const currentLabel = sortOptions.find((o) => o.field === sortField)?.label || "Sort";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <ArrowUpDown className="h-4 w-4" />
          {currentLabel}
          <span className="text-xs text-muted-foreground">
            ({sortDirection === "asc" ? "A-Z" : "Z-A"})
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.field}
            onClick={() =>
              onSortChange(
                option.field,
                option.field === sortField && sortDirection === "asc" ? "desc" : "asc"
              )
            }
          >
            {option.label}
            {option.field === sortField && (
              <span className="ml-auto text-xs text-muted-foreground">
                {sortDirection === "asc" ? "↑" : "↓"}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
