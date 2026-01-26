import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileJson, FileSpreadsheet, FileText } from "lucide-react";

interface ParseReviewHeaderProps {
  totalContacts: number;
  excludedCount: number;
  onSaveAll: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onTogglePdf: () => void;
  showPdf: boolean;
  saving?: boolean;
}

export function ParseReviewHeader({
  totalContacts,
  excludedCount,
  onSaveAll,
  onExportJSON,
  onExportCSV,
  onTogglePdf,
  showPdf,
  saving = false,
}: ParseReviewHeaderProps) {
  const includedCount = totalContacts - excludedCount;

  return (
    <div className="bg-card border rounded-lg p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Status */}
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">
              {includedCount} contact{includedCount !== 1 ? 's' : ''} ready to save
            </h2>
            {excludedCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {excludedCount} excluded
              </p>
            )}
          </div>
          <Badge variant="secondary" className="ml-2">
            {includedCount} / {totalContacts}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={onSaveAll}
            disabled={saving || includedCount === 0}
            className="min-w-[120px]"
          >
            {saving ? 'Saving...' : 'Save All'}
          </Button>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onExportJSON}
              title="Export as JSON"
            >
              <FileJson className="h-4 w-4 mr-1" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCSV}
              title="Export as CSV"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePdf}
          >
            <FileText className="h-4 w-4 mr-1" />
            {showPdf ? 'Hide PDF' : 'Verify Source'}
          </Button>
        </div>
      </div>
    </div>
  );
}
