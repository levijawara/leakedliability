import { FolderOpen, Video, Youtube, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatFullViewCount } from "@/lib/youtubeHelpers";

interface ProjectCallSheet {
  id: string;
  user_label: string | null;
  global_call_sheets: {
    id: string;
    original_file_name: string;
    status: string;
  };
}

interface ProjectVideo {
  id: string;
  video_id: string;
  title: string | null;
  view_count: number | null;
  thumbnail_url: string | null;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  callSheets: ProjectCallSheet[];
  videos: ProjectVideo[];
  totalViews: number;
}

interface ProjectFolderCardProps {
  project: Project;
  isSelected?: boolean;
  onSelect?: (projectId: string, selected: boolean, event?: React.MouseEvent) => void;
  onClick: (project: Project) => void;
}

export function ProjectFolderCard({
  project,
  isSelected = false,
  onSelect,
  onClick,
}: ProjectFolderCardProps) {
  const sheetCount = project.callSheets.length;
  const videoCount = project.videos.length;
  const maxSheetsToShow = 3;
  const displayedSheets = project.callSheets.slice(0, maxSheetsToShow);
  const extraSheets = sheetCount - maxSheetsToShow;

  return (
    <Card 
      className={`hover:border-primary/50 transition-colors cursor-pointer ${isSelected ? 'border-primary ring-1 ring-primary' : ''}`}
      onClick={() => onClick(project)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: Checkbox + Folder badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => {}}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(project.id, !isSelected, e as unknown as React.MouseEvent);
                }}
              />
            )}
            <Badge variant="secondary" className="gap-1">
              <FolderOpen className="h-3 w-3" />
              Project
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>{sheetCount}</span>
          </div>
        </div>

        {/* Project Name */}
        <div className="flex items-start gap-2">
          <FolderOpen className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium truncate" title={project.name}>
            {project.name}
          </p>
        </div>

        {/* Separator */}
        <div className="border-t pt-2">
          {/* Call sheet filenames list */}
          <div className="space-y-1 text-xs text-muted-foreground">
            {displayedSheets.map((cs) => (
              <p key={cs.id} className="truncate pl-1">
                • {cs.user_label || cs.global_call_sheets.original_file_name}
              </p>
            ))}
            {extraSheets > 0 && (
              <p className="text-muted-foreground/70 pl-1">
                +{extraSheets} more...
              </p>
            )}
          </div>
        </div>

        {/* Video count & views */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Video className="h-3 w-3" />
            <span>{videoCount} video{videoCount !== 1 ? 's' : ''}</span>
          </div>
          {project.totalViews > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
              <Youtube className="h-3 w-3 text-destructive" />
              {formatFullViewCount(project.totalViews)} views
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
