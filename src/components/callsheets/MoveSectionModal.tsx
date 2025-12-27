import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

interface MoveSectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactIds: string[];
  currentDepartment: string;
  availableDepartments: string[];
  onMoveComplete: () => void;
}

export function MoveSectionModal({
  open,
  onOpenChange,
  contactIds,
  currentDepartment,
  availableDepartments,
  onMoveComplete,
}: MoveSectionModalProps) {
  const [targetDepartment, setTargetDepartment] = useState("");
  const [moving, setMoving] = useState(false);

  const handleMove = async () => {
    if (!targetDepartment) {
      toast.error("Please select a target section");
      return;
    }

    setMoving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        return;
      }

      // Update departments array for each contact
      for (const id of contactIds) {
        const { data: contact, error: fetchError } = await supabase
          .from("crew_contacts")
          .select("departments")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (fetchError) throw fetchError;

        const currentDepts = contact?.departments || [];
        const newDepts = currentDepts
          .filter((d: string) => d !== currentDepartment)
          .concat(targetDepartment);

        const { error: updateError } = await supabase
          .from("crew_contacts")
          .update({ departments: [...new Set(newDepts)] })
          .eq("id", id)
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      }

      toast.success(`Moved ${contactIds.length} contact(s) to ${targetDepartment}`);
      onMoveComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to move contacts");
    } finally {
      setMoving(false);
    }
  };

  const filteredDepartments = availableDepartments.filter((d) => d !== currentDepartment);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Move to Section</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-1 bg-muted rounded">{currentDepartment || "Uncategorized"}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">New section</span>
          </div>

          <div className="space-y-2">
            <Label>Target Section</Label>
            <Select value={targetDepartment} onValueChange={setTargetDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Select section..." />
              </SelectTrigger>
              <SelectContent>
                {filteredDepartments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">
            Moving {contactIds.length} contact{contactIds.length !== 1 ? "s" : ""}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={moving || !targetDepartment}>
            {moving ? "Moving..." : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
