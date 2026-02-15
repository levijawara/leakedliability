import { FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GlobalCallSheet {
  id: string;
  original_file_name: string;
  master_file_path: string;
  status: string;
  error_message: string | null;
  created_at: string;
  parsed_date: string | null;
}

interface UserCallSheetLink {
  id: string;
  user_label: string | null;
  created_at: string;
  global_call_sheet_id: string;
  payment_status: string | null;
  payment_status_confirmed_at: string | null;
  payment_reversal_reason: string | null;
  payment_reversal_reason_other: string | null;
  global_call_sheets: GlobalCallSheet;
}

interface CallSheetCardProps {
  link: UserCallSheetLink;
  sortField: 'uploadDate' | 'shootDate';
  isSelected?: boolean;
  isAdmin?: boolean;
  onSelect?: (linkId: string, selected: boolean, event?: React.MouseEvent) => void;
  onViewPdf: (sheet: GlobalCallSheet) => void;
  onMarkPaid: (link: UserCallSheetLink, status: 'paid') => void;
  onRequestNo: (link: UserCallSheetLink) => void;
  canReverse: (link: UserCallSheetLink) => boolean;
  getNextReversalDate: (link: UserCallSheetLink) => string | null;
  onDelete: (link: UserCallSheetLink) => void;
}

export function CallSheetCard({ 
  link, 
  sortField,
  isSelected = false,
  isAdmin = false,
  onSelect,
  onViewPdf,
  onMarkPaid,
  onRequestNo,
  canReverse,
  getNextReversalDate,
  onDelete
}: CallSheetCardProps) {
  const sheet = link.global_call_sheets;
  const displayName = link.user_label || sheet.original_file_name;

  return (
    <Card className={`hover:border-primary/50 transition-colors ${isSelected ? 'border-primary ring-1 ring-primary' : ''}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header: Checkbox */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => {}}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(link.id, !isSelected, e as unknown as React.MouseEvent);
                }}
              />
            )}
          </div>
        </div>

        {/* Display Name */}
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" title={displayName}>
              {displayName}
            </p>
          </div>
        </div>

        {/* Dates */}
        <div className="text-xs text-muted-foreground space-y-1">
          {sheet.parsed_date && (
            <p>Shoot: {format(new Date(sheet.parsed_date), 'MMM d, yyyy')}</p>
          )}
          <p>Added: {format(new Date(link.created_at), 'MMM d, yyyy')}</p>
        </div>

        {/* Error message */}
        {sheet.status === 'error' && sheet.error_message && (
          <p className="text-xs text-destructive truncate" title={sheet.error_message}>
            {sheet.error_message}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1 pt-1 border-t">
          <TooltipProvider delayDuration={300}>
            {sheet.master_file_path && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => onViewPdf(sheet)}>
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View PDF</TooltipContent>
              </Tooltip>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-green-600 hover:text-green-500 hover:bg-green-600/10"
              onClick={() => onMarkPaid(link, 'paid')}
            >
              Yes
            </Button>
            {canReverse(link) ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-red-600 hover:text-red-500 hover:bg-red-600/10"
                onClick={() => onRequestNo(link)}
              >
                No
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-muted-foreground cursor-not-allowed"
                      disabled
                    >
                      No
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  You can change your answer on {getNextReversalDate(link) ?? 'the next business day'}
                </TooltipContent>
              </Tooltip>
            )}
            <div className="flex-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => onDelete(link)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove from library</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
