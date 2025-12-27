import { useState } from "react";
import { FileText, Calendar, Users, Eye, Trash2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReviewStatusBadge } from "./ReviewStatusBadge";
import { ViewToggle } from "./ViewToggle";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface CallSheet {
  id: string;
  file_name: string;
  status: string | null;
  contacts_extracted: number | null;
  uploaded_at: string | null;
  parsed_date: string | null;
}

interface CallSheetsListProps {
  callSheets: CallSheet[];
  isLoading?: boolean;
  view?: "grid" | "list";
  onViewChange?: (view: "grid" | "list") => void;
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReparse?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  className?: string;
}

type SortField = "file_name" | "uploaded_at" | "status" | "contacts_extracted";
type SortDirection = "asc" | "desc";

export function CallSheetsList({
  callSheets,
  isLoading = false,
  view = "list",
  onViewChange,
  onView,
  onDelete,
  onReparse,
  onBulkDelete,
  className,
}: CallSheetsListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("uploaded_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === callSheets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(callSheets.map((s) => s.id)));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedSheets = [...callSheets].sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;
    switch (sortField) {
      case "file_name":
        return dir * a.file_name.localeCompare(b.file_name);
      case "uploaded_at":
        return dir * ((a.uploaded_at || "").localeCompare(b.uploaded_at || ""));
      case "status":
        return dir * ((a.status || "").localeCompare(b.status || ""));
      case "contacts_extracted":
        return dir * ((a.contacts_extracted || 0) - (b.contacts_extracted || 0));
      default:
        return 0;
    }
  });

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field &&
          (sortDirection === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          ))}
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-muted/50 rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  if (callSheets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground">No call sheets yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your first call sheet to get started
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        {selectedIds.size > 0 && onBulkDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onBulkDelete(Array.from(selectedIds));
              setSelectedIds(new Set());
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete {selectedIds.size} selected
          </Button>
        )}
        {onViewChange && (
          <div className="ml-auto">
            <ViewToggle view={view} onViewChange={onViewChange} />
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === callSheets.length && callSheets.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <SortHeader field="file_name">Name</SortHeader>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="contacts_extracted">Contacts</SortHeader>
              <SortHeader field="uploaded_at">Uploaded</SortHeader>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSheets.map((sheet) => (
              <TableRow key={sheet.id} className="group">
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(sheet.id)}
                    onCheckedChange={() => toggleSelect(sheet.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium truncate max-w-[200px]" title={sheet.file_name}>
                      {sheet.file_name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <ReviewStatusBadge status={sheet.status || "queued"} />
                </TableCell>
                <TableCell>
                  {sheet.contacts_extracted !== null && sheet.contacts_extracted > 0 ? (
                    <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                      <Users className="h-3 w-3" />
                      {sheet.contacts_extracted}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {sheet.uploaded_at
                      ? formatDistanceToNow(new Date(sheet.uploaded_at), { addSuffix: true })
                      : "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {sheet.status === "parsed" && onView && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(sheet.id)}
                        title="Review contacts"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {(sheet.status === "error" || sheet.status === "parsed") && onReparse && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onReparse(sheet.id)}
                        title="Re-parse"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(sheet.id)}
                        title="Delete"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
