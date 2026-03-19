import { Button } from "@/components/ui/button";
import { FileJson, FileSpreadsheet, Save, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ParseToolbarProps {
  totalContacts: number;
  savedCount: number;
  skippedCount: number;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onSaveAll: () => void;
  onComplete: () => void;
}

export function ParseToolbar({
  totalContacts,
  savedCount,
  skippedCount,
  onExportJSON,
  onExportCSV,
  onSaveAll,
  onComplete,
}: ParseToolbarProps) {
  const { toast } = useToast();
  const remaining = totalContacts - savedCount - skippedCount;

  return (
    <div className="absolute top-4 right-4 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border rounded-lg shadow-lg p-3 flex flex-col gap-2 min-w-[200px]">
      {/* Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <Badge variant="secondary">
            {savedCount + skippedCount} / {totalContacts}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            {savedCount} saved
          </span>
          {skippedCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-gray-400" />
              {skippedCount} skipped
          </span>
          )}
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Actions */}
      <div className="flex flex-col gap-1.5">
        {remaining > 0 && (
          <Button
            variant="default"
            size="sm"
            onClick={onSaveAll}
            className="w-full justify-start"
          >
            <Save className="h-4 w-4 mr-2" />
            Save All Parsed ({remaining} remaining)
          </Button>
        )}

        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportJSON}
            className="flex-1"
          >
            <FileJson className="h-4 w-4 mr-1" />
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCSV}
            className="flex-1"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>

        {remaining === 0 && (
          <Button
            variant="default"
            size="sm"
            onClick={onComplete}
            className="w-full"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Done
          </Button>
        )}
      </div>
    </div>
  );
}
