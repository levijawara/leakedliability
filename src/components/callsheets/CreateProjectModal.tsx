import { useState } from "react";
import { FolderPlus, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SelectedSheet {
  id: string;
  fileName: string;
}

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSheets: SelectedSheet[];
  userId: string;
  onProjectCreated: () => void;
}

export function CreateProjectModal({
  open,
  onOpenChange,
  selectedSheets,
  userId,
  onProjectCreated,
}: CreateProjectModalProps) {
  const { toast } = useToast();
  const [projectName, setProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!projectName.trim()) return;
    if (selectedSheets.length < 2) return;

    setIsCreating(true);
    try {
      // 1. Create the project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          name: projectName.trim(),
        })
        .select("id")
        .single();

      if (projectError) throw projectError;

      // 2. Link all selected call sheets to the project
      const linkInserts = selectedSheets.map((sheet) => ({
        project_id: project.id,
        user_call_sheet_id: sheet.id,
      }));

      const { error: linksError } = await supabase
        .from("project_call_sheets")
        .insert(linkInserts);

      if (linksError) throw linksError;

      toast({
        title: "Project created",
        description: `"${projectName}" now contains ${selectedSheets.length} call sheets.`,
      });

      setProjectName("");
      onOpenChange(false);
      onProjectCreated();
    } catch (error: any) {
      console.error("[CreateProjectModal] Error:", error);
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Create Project Folder
          </DialogTitle>
          <DialogDescription>
            Group {selectedSheets.length} call sheets into a single project folder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="e.g., Arin Ray Music Videos"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Selected sheets preview */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">
              Call sheets to include:
            </Label>
            <div className="max-h-32 overflow-auto rounded border p-2 space-y-1 bg-muted/30">
              {selectedSheets.map((sheet) => (
                <div key={sheet.id} className="flex items-center gap-2 text-xs">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">{sheet.fileName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !projectName.trim() || selectedSheets.length < 2}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
