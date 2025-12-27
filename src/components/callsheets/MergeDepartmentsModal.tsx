import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Merge } from "lucide-react";

interface MergeDepartmentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableDepartments: string[];
  onMerge: (source: string, target: string) => Promise<void>;
}

export function MergeDepartmentsModal({
  open,
  onOpenChange,
  availableDepartments,
  onMerge,
}: MergeDepartmentsModalProps) {
  const [sourceDept, setSourceDept] = useState("");
  const [targetDept, setTargetDept] = useState("");
  const [merging, setMerging] = useState(false);

  const handleMerge = async () => {
    if (!sourceDept || !targetDept) {
      toast.error("Please select both departments");
      return;
    }

    if (sourceDept === targetDept) {
      toast.error("Source and target must be different");
      return;
    }

    setMerging(true);
    try {
      await onMerge(sourceDept, targetDept);
      toast.success(`Merged "${sourceDept}" into "${targetDept}"`);
      setSourceDept("");
      setTargetDept("");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to merge departments");
    } finally {
      setMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Merge Departments
          </DialogTitle>
          <DialogDescription>
            Combine two departments into one. All contacts from the source will be moved to the target.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Source (will be removed)</Label>
            <Select value={sourceDept} onValueChange={setSourceDept}>
              <SelectTrigger>
                <SelectValue placeholder="Select source..." />
              </SelectTrigger>
              <SelectContent>
                {availableDepartments
                  .filter((d) => d !== targetDept)
                  .map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <Label>Target (will be kept)</Label>
            <Select value={targetDept} onValueChange={setTargetDept}>
              <SelectTrigger>
                <SelectValue placeholder="Select target..." />
              </SelectTrigger>
              <SelectContent>
                {availableDepartments
                  .filter((d) => d !== sourceDept)
                  .map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMerge} disabled={merging || !sourceDept || !targetDept}>
            {merging ? "Merging..." : "Merge Departments"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
