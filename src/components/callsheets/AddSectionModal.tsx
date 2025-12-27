import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderPlus } from "lucide-react";

interface AddSectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSections: string[];
  onAdd: (sectionName: string) => void;
}

export function AddSectionModal({
  open,
  onOpenChange,
  existingSections,
  onAdd,
}: AddSectionModalProps) {
  const [sectionName, setSectionName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = sectionName.trim();

    if (!trimmed) {
      setError("Please enter a section name");
      return;
    }

    if (existingSections.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setError("A section with this name already exists");
      return;
    }

    onAdd(trimmed);
    setSectionName("");
    setError("");
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSectionName("");
      setError("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Add New Section
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="section-name">Section Name</Label>
            <Input
              id="section-name"
              value={sectionName}
              onChange={(e) => {
                setSectionName(e.target.value);
                setError("");
              }}
              placeholder="e.g., Production, Camera, Art"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Section</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
