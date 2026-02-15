import { useState, useEffect } from "react";
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
  "Interview",
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

interface ProjectDetailsPanelProps {
  hasPendingUpload: boolean;
  onSubmit: (projectType: string | null, projectSubject: string | null) => Promise<void>;
  onSkip: () => void;
}

export function ProjectDetailsPanel({
  hasPendingUpload,
  onSubmit,
  onSkip,
}: ProjectDetailsPanelProps) {
  const [projectType, setProjectType] = useState<string>("");
  const [projectSubject, setProjectSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hasPendingUpload) {
      setProjectType("");
      setProjectSubject("");
    }
  }, [hasPendingUpload]);

  const handleSubmit = async () => {
    if (!hasPendingUpload) return;
    setSubmitting(true);
    try {
      await onSubmit(
        projectType && projectType !== "(Other)" ? projectType : null,
        projectSubject.trim() || null
      );
      setProjectType("");
      setProjectSubject("");
    } catch {
      // Error handled by parent (toast)
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    setProjectType("");
    setProjectSubject("");
    onSkip();
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="font-semibold text-lg mb-2">Project summary?</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {hasPendingUpload ? (
          <>
            WHAT was this job? WHO was this job for?
            <br />
            <span className="text-xs">Telling us is optional, but it helps us help you.</span>
          </>
        ) : (
          <span className="text-xs">Upload a call sheet to optionally add project details.</span>
        )}
      </p>
      <div className="space-y-4 flex-1">
        <div className="space-y-2">
          <Label htmlFor="project-type">Job type</Label>
          <Select value={projectType} onValueChange={setProjectType}>
            <SelectTrigger id="project-type" disabled={!hasPendingUpload}>
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
          <Label htmlFor="project-subject">Talent, client, brand, etc.</Label>
          <Input
            id="project-subject"
            placeholder="on-screen-talent, client, brand, celebrity, movie title, company, musician, athlete, show title, influencer, etc."
            value={projectSubject}
            onChange={(e) => setProjectSubject(e.target.value)}
            disabled={!hasPendingUpload}
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          disabled={submitting || !hasPendingUpload}
        >
          Skip
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !hasPendingUpload}
        >
          {submitting ? "Saving..." : "Submit"}
        </Button>
      </div>
    </div>
  );
}
