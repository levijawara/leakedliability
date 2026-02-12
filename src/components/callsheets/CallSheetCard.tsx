import { useState } from "react";
import { FileText, Users, Eye, Trash2, RefreshCw, Clock, Loader2, CheckCircle, AlertCircle, FileType, List, Youtube, Layers } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PaymentStatusRadio } from "./PaymentStatusRadio";
import { YouTubeUrlEditor } from "./YouTubeUrlEditor";
import { formatViewCount } from "@/lib/youtubeHelpers";

interface GlobalCallSheet {
  id: string;
  original_file_name: string;
  master_file_path: string;
  status: string;
  contacts_extracted: number | null;
  error_message: string | null;
  created_at: string;
  parsed_contacts: unknown;
  parsed_date: string | null;
  youtube_url: string | null;
  youtube_view_count: number | null;
  youtube_last_synced: string | null;
  youtube_video_id?: string | null;
}

interface YouTubeVideo {
  id: string;
  video_id: string | null;
  title: string | null;
  canonical_title?: string | null;
  source_count?: number | null;
}

interface UserCallSheetLink {
  id: string;
  user_label: string | null;
  created_at: string;
  global_call_sheet_id: string;
  global_call_sheets: GlobalCallSheet;
  payment_status: string;
  payment_status_locked: boolean;
  project?: YouTubeVideo | null;
}

interface CallSheetCardProps {
  link: UserCallSheetLink;
  sortField: 'uploadDate' | 'shootDate';
  isSelected?: boolean;
  isAdmin?: boolean;
  needsReview?: boolean;
  onSelect?: (linkId: string, selected: boolean, event?: React.MouseEvent) => void;
  onView: (sheet: GlobalCallSheet) => void;
  onViewPdf: (sheet: GlobalCallSheet) => void;
  onCredits: (sheet: GlobalCallSheet) => void;
  onRetry: (sheet: GlobalCallSheet) => void;
  onDelete: (link: UserCallSheetLink) => void;
  onPaymentStatusChange?: (linkId: string, status: string, locked: boolean) => void;
}

/**
 * Get the display name for a call sheet using priority:
 * 1. Project canonical_title (admin override)
 * 2. Project title (YouTube API)
 * 3. User label (custom name)
 * 4. Original filename (upload fallback)
 */
function getDisplayName(
  project: YouTubeVideo | null | undefined,
  userLabel: string | null,
  originalFileName: string
): { displayName: string; isProjectTitle: boolean } {
  // Priority 1: Project canonical title
  if (project?.canonical_title) {
    return { displayName: project.canonical_title, isProjectTitle: true };
  }
  
  // Priority 2: Project title from YouTube
  if (project?.title) {
    return { displayName: project.title, isProjectTitle: true };
  }
  
  // Priority 3: User custom label
  if (userLabel) {
    return { displayName: userLabel, isProjectTitle: false };
  }
  
  // Priority 4: Original filename
  return { displayName: originalFileName, isProjectTitle: false };
}

export function CallSheetCard({ 
  link, 
  sortField,
  isSelected = false,
  isAdmin = false,
  needsReview = false,
  onSelect,
  onView, 
  onViewPdf, 
  onCredits, 
  onRetry, 
  onDelete,
  onPaymentStatusChange
}: CallSheetCardProps) {
  const [youtubeUrl, setYoutubeUrl] = useState(link.global_call_sheets.youtube_url);
  const [youtubeViewCount, setYoutubeViewCount] = useState(link.global_call_sheets.youtube_view_count);
  
  const sheet = link.global_call_sheets;
  const { displayName, isProjectTitle } = getDisplayName(link.project, link.user_label, sheet.original_file_name);
  
  const paymentStatus = link.payment_status as 'unanswered' | 'waiting' | 'paid' | 'unpaid_needs_proof' | 'free_labor';
  const paymentLocked = link.payment_status_locked;
  
  // Check if this is a grouped project (placeholder without YouTube)
  const isGroupedProject = sheet.youtube_video_id && !link.project?.video_id;
  const sourceCount = link.project?.source_count || 1;

  const handleYoutubeUrlUpdate = (newUrl: string | null) => {
    setYoutubeUrl(newUrl);
    // Clear view count when URL changes (will be re-synced)
    if (newUrl !== sheet.youtube_url) {
      setYoutubeViewCount(null);
    }
  };

  const getStatusBadge = (status: string, showNeedsReview: boolean) => {
    // Check for "Needs Review" first - parsed but unsaved
    if (status === 'parsed' && showNeedsReview) {
      return (
        <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400">
          <AlertCircle className="h-3 w-3" />
          Needs Review
        </Badge>
      );
    }
    
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
        {/* Header: Checkbox + Status + Contact Count + Grouped Badge */}
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
            {getStatusBadge(sheet.status, needsReview)}
            {/* Show grouped badge for multi-sheet projects */}
            {sourceCount > 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Layers className="h-3 w-3" />
                    {sourceCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {sourceCount} call sheets linked to this project
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {(sheet.status === 'parsed' || sheet.status === 'complete') && sheet.contacts_extracted !== null && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{sheet.contacts_extracted}</span>
            </div>
          )}
        </div>

        {/* Display Name (project title or filename) */}
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" title={displayName}>
              {displayName}
            </p>
            {/* Show original filename when displaying project title */}
            {isProjectTitle && (
              <p className="text-xs text-muted-foreground truncate" title={sheet.original_file_name}>
                from: {sheet.original_file_name}
              </p>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="text-xs text-muted-foreground space-y-1">
          {sheet.parsed_date && (
            <p>Shoot: {format(new Date(sheet.parsed_date), 'MMM d, yyyy')}</p>
          )}
          <p>
            {sortField === 'shootDate' && !sheet.parsed_date ? 'Added: ' : 'Added: '}
            {format(new Date(link.created_at), 'MMM d, yyyy')}
          </p>
        </div>

        {/* Error message */}
        {sheet.status === 'error' && sheet.error_message && (
          <p className="text-xs text-destructive truncate" title={sheet.error_message}>
            {sheet.error_message}
          </p>
        )}

        {/* YouTube Link */}
        <div className="flex items-center justify-between pt-2 border-t">
          <YouTubeUrlEditor
            callSheetId={sheet.id}
            currentUrl={youtubeUrl}
            projectId={sheet.youtube_video_id}
            onUpdate={handleYoutubeUrlUpdate}
          />
          {youtubeViewCount !== null && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Youtube className="h-3 w-3 text-destructive" />
              {formatViewCount(youtubeViewCount)} views
            </span>
          )}
        </div>

        {/* Payment Status - show for everyone, hide when locked */}
        {!paymentLocked && (
          <div className="pt-2 border-t">
            <PaymentStatusRadio
              linkId={link.id}
              currentStatus={paymentStatus}
              isLocked={paymentLocked}
              onStatusChange={(newStatus, locked) => {
                onPaymentStatusChange?.(link.id, newStatus, locked);
              }}
              
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1 pt-1 border-t">
          <TooltipProvider delayDuration={300}>
            {(sheet.status === 'parsed' || sheet.status === 'complete') && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => onView(sheet)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View contacts</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => onViewPdf(sheet)}>
                      <FileType className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View PDF</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => onCredits(sheet)}>
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Generate credits</TooltipContent>
                </Tooltip>
              </>
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
