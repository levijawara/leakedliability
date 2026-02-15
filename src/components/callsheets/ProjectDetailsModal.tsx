import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PROJECT_TYPES = [
  "Commercial",
  "Documentary",
  "Editorial",
  "Feature Film",
  "Live Performance",
  "Live Stream",
  "Music Video",
  "Passion Project",
  "Podcast",
  "Runway Show",
  "Short Film",
  "Social Media Content",
  "TV Show",
  "Visualizer",
  "Web Series",
  "(Other)",
] as const;

interface ProjectDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (projectType: string | null, projectSubject: string | null) => Promise<void>;
  fileName?: string;
}

export function ProjectDetailsModal({
  open,
  onOpenChange,
  onSubmit,
  fileName,
}: ProjectDetailsModalProps) {
  const [projectType, setProjectType] = useState<string>("");
  const [projectSubject, setProjectSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setProjectType("");
      setProjectSubject("");
    }
  }, [open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(
        projectType && projectType !== "(Other)" ? projectType : null,
        projectSubject.trim() || null
      );
      setProjectType("");
      setProjectSubject("");
      onOpenChange(false);
    } catch {
      // Error handled by parent (toast)
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    setProjectType("");
    setProjectSubject("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>What was this job?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1">
              <p>
                <strong>WHAT</strong> was this job? <strong>WHO</strong> was this job for?
              </p>
              <p className="text-muted-foreground text-sm">
                Telling us is optional, but it helps us help you.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-type">Job type</Label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger id="project-type">
                <SelectValue placeholder="Select type (optional)" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-subject">
              Talent, client, brand, etc.
            </Label>
            <Input
              id="project-subject"
              placeholder="Drake, Target, StarTalk, Kai Cenat"
              value={projectSubject}
              onChange={(e) => setProjectSubject(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleSkip} disabled={submitting}>
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
