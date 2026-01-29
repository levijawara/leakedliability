import { useState } from "react";
import { FolderOpen, X, Loader2, Unlink, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { CallSheetCard } from "./CallSheetCard";
import { ProjectVideoLinker } from "./ProjectVideoLinker";
import { Project } from "./ProjectFolderCard";

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

interface UserCallSheetLink {
  id: string;
  user_label: string | null;
  created_at: string;
  global_call_sheet_id: string;
  global_call_sheets: GlobalCallSheet;
  payment_status: string;
  payment_status_locked: boolean;
  savedContactCount?: number;
}

interface ProjectDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  userLinks: UserCallSheetLink[];
  onProjectChange: () => void;
  onDeleteLink?: (link: UserCallSheetLink) => void;
}

export function ProjectDetailModal({
  open,
  onOpenChange,
  project,
  userLinks,
  onProjectChange,
  onDeleteLink,
}: ProjectDetailModalProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showUngroupConfirm, setShowUngroupConfirm] = useState(false);
  const [isUngrouping, setIsUngrouping] = useState(false);
  const [videos, setVideos] = useState(project?.videos || []);

  // Get full call sheet data for cards
  const projectCallSheets = project
    ? userLinks.filter((link) =>
        project.callSheets.some((cs) => cs.id === link.id)
      )
    : [];

  const handleStartEdit = () => {
    setEditName(project?.name || "");
    setIsEditing(true);
  };

  const handleSaveName = async () => {
    if (!project || !editName.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ name: editName.trim(), updated_at: new Date().toISOString() })
        .eq("id", project.id);

      if (error) throw error;

      toast({ title: "Project renamed" });
      setIsEditing(false);
      onProjectChange();
    } catch (error: any) {
      toast({
        title: "Failed to rename",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUngroup = async () => {
    if (!project) return;

    setIsUngrouping(true);
    try {
      // Delete the project (cascade deletes junction links)
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id);

      if (error) throw error;

      toast({
        title: "Project ungrouped",
        description: "Call sheets are now individual items.",
      });

      setShowUngroupConfirm(false);
      onOpenChange(false);
      onProjectChange();
    } catch (error: any) {
      toast({
        title: "Failed to ungroup",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUngrouping(false);
    }
  };

  // Dummy handlers for CallSheetCard props
  const handleRetry = async () => {};
  const handlePaymentStatusChange = () => {};

  if (!project) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              {isEditing ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 max-w-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") setIsEditing(false);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveName}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{project.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleStartEdit}
                    className="h-6 w-6 p-0"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-auto space-y-6 pr-2">
            {/* Videos Section */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">
                Project Videos ({videos.length})
              </h3>
              <ProjectVideoLinker
                projectId={project.id}
                videos={videos}
                onVideosChange={setVideos}
              />
            </div>

            {/* Call Sheets Section */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">
                Call Sheets ({projectCallSheets.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectCallSheets.map((link) => {
                  const needsReview =
                    link.global_call_sheets.status === "parsed" &&
                    (link.savedContactCount === undefined ||
                      link.savedContactCount === 0);

                  return (
                    <CallSheetCard
                      key={link.id}
                      link={link}
                      sortField="uploadDate"
                      needsReview={needsReview}
                      onView={(sheet) => {
                        onOpenChange(false);
                        navigate(`/call-sheets/${sheet.id}/review`);
                      }}
                      onViewPdf={() => {}}
                      onCredits={() => {}}
                      onRetry={handleRetry}
                      onDelete={(link) => {
                        onDeleteLink?.(link);
                      }}
                      onPaymentStatusChange={handlePaymentStatusChange}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 pt-4 border-t mt-4 flex justify-between">
            <Button
              variant="outline"
              onClick={() => setShowUngroupConfirm(true)}
              className="text-destructive hover:text-destructive"
            >
              <Unlink className="h-4 w-4 mr-2" />
              Ungroup Project
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ungroup Confirmation */}
      <AlertDialog open={showUngroupConfirm} onOpenChange={setShowUngroupConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ungroup "{project.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the project folder. All {project.callSheets.length}{" "}
              call sheets will return to the main list as individual items. Video
              links will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUngrouping}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUngroup} disabled={isUngrouping}>
              {isUngrouping ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ungrouping...
                </>
              ) : (
                "Ungroup"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
