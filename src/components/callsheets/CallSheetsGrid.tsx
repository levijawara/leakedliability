import { CallSheetCard } from "./CallSheetCard";
import { ViewToggle } from "./ViewToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { FileQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

interface CallSheet {
  id: string;
  file_name: string;
  status: string | null;
  contacts_extracted: number | null;
  uploaded_at: string | null;
  parsed_date: string | null;
}

interface CallSheetsGridProps {
  callSheets: CallSheet[];
  isLoading?: boolean;
  view?: "grid" | "list";
  onViewChange?: (view: "grid" | "list") => void;
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReparse?: (id: string) => void;
  className?: string;
}

export function CallSheetsGrid({
  callSheets,
  isLoading = false,
  view = "grid",
  onViewChange,
  onView,
  onDelete,
  onReparse,
  className,
}: CallSheetsGridProps) {
  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[160px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (callSheets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground">No call sheets yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your first call sheet to get started
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {onViewChange && (
        <div className="flex justify-end">
          <ViewToggle view={view} onViewChange={onViewChange} />
        </div>
      )}

      <div
        className={cn(
          view === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-3"
        )}
      >
        {callSheets.map((sheet) => (
          <CallSheetCard
            key={sheet.id}
            id={sheet.id}
            fileName={sheet.file_name}
            status={sheet.status || "queued"}
            contactsExtracted={sheet.contacts_extracted}
            uploadedAt={sheet.uploaded_at || new Date().toISOString()}
            parsedDate={sheet.parsed_date}
            onView={onView}
            onDelete={onDelete}
            onReparse={onReparse}
          />
        ))}
      </div>
    </div>
  );
}
