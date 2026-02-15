import { FileText, Trash2, RefreshCw, Clock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  global_call_sheets: GlobalCallSheet;
}

interface CallSheetCardProps {
  link: UserCallSheetLink;
  sortField: 'uploadDate' | 'shootDate';
  isSelected?: boolean;
  isAdmin?: boolean;
  onSelect?: (linkId: string, selected: boolean, event?: React.MouseEvent) => void;
  onViewPdf: (sheet: GlobalCallSheet) => void;
  onRetry: (sheet: GlobalCallSheet) => void;
  onDelete: (link: UserCallSheetLink) => void;
}

export function CallSheetCard({ 
  link, 
  sortField,
  isSelected = false,
  isAdmin = false,
  onSelect,
  onViewPdf, 
  onRetry, 
  onDelete
}: CallSheetCardProps) {
  const sheet = link.global_call_sheets;
  const displayName = link.user_label || sheet.original_file_name;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Queued
          </Badge>
        );
      case 'parsing':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Parsing
          </Badge>
        );
      case 'parsed':
      case 'complete':
        return (
          <Badge className="gap-1 bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Complete
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className={`hover:border-primary/50 transition-colors ${isSelected ? 'border-primary ring-1 ring-primary' : ''}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header: Checkbox + Status */}
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
            {getStatusBadge(sheet.status)}
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
            {(sheet.status === 'parsed' || sheet.status === 'complete') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => onViewPdf(sheet)}>
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View PDF</TooltipContent>
              </Tooltip>
            )}
            
            {sheet.status === 'error' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => onRetry(sheet)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Retry parsing</TooltipContent>
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
