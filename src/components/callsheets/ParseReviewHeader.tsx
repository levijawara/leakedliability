import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle2, Download, FileText, Mail, Phone, ChevronDown } from "lucide-react";

interface ParseReviewHeaderProps {
  totalContacts: number;
  excludedCount: number;
  selectedCount: number;
  onSaveAll: () => void;
  onSaveSelected: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onExportTXT: () => void;
  onTogglePdf: () => void;
  onSelectWithContact: () => void;
  showPdf: boolean;
  saving?: boolean;
}

export function ParseReviewHeader({
  totalContacts,
  excludedCount,
  selectedCount,
  onSaveAll,
  onSaveSelected,
  onExportJSON,
  onExportCSV,
  onExportTXT,
  onTogglePdf,
  onSelectWithContact,
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

          {selectedCount > 0 && (
            <Button
              variant="secondary"
              onClick={onSaveSelected}
              disabled={saving}
            >
              Save Selected ({selectedCount})
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectWithContact}
            title="Select contacts with email or phone"
          >
            <Mail className="h-4 w-4 mr-1" />
            <Phone className="h-4 w-4 mr-1" />
            Select
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onExportJSON}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportCSV}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportTXT}>
                Export as TXT
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
