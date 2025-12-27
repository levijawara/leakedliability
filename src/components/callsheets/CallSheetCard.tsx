import { FileText, Calendar, Users, MoreVertical, Eye, Trash2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReviewStatusBadge } from "./ReviewStatusBadge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface CallSheetCardProps {
  id: string;
  fileName: string;
  status: string;
  contactsExtracted: number | null;
  uploadedAt: string;
  parsedDate: string | null;
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReparse?: (id: string) => void;
  className?: string;
}

export function CallSheetCard({
  id,
  fileName,
  status,
  contactsExtracted,
  uploadedAt,
  parsedDate,
  onView,
  onDelete,
  onReparse,
  className,
}: CallSheetCardProps) {
  const timeAgo = formatDistanceToNow(new Date(uploadedAt), { addSuffix: true });

  return (
    <Card className={cn("group hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate" title={fileName}>
                {fileName}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{timeAgo}</span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {status === "parsed" && onView && (
                <DropdownMenuItem onClick={() => onView(id)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Review Contacts
                </DropdownMenuItem>
              )}
              {(status === "error" || status === "parsed") && onReparse && (
                <DropdownMenuItem onClick={() => onReparse(id)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-parse
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <ReviewStatusBadge status={status} />

          {contactsExtracted !== null && contactsExtracted > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {contactsExtracted} contacts
            </Badge>
          )}
        </div>

        {status === "parsed" && onView && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
            onClick={() => onView(id)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Review & Import
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
