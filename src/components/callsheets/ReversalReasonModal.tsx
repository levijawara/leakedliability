import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const REVERSAL_REASONS = [
  { value: "honest_mistake", label: "Honest mistake" },
  { value: "bounced_check", label: "Bounced check" },
  { value: "payment_reversed", label: "Payment reversed or rescinded" },
  { value: "other", label: "Other" },
] as const;

export type ReversalReason = typeof REVERSAL_REASONS[number]["value"];

interface ReversalReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: ReversalReason, reasonOther?: string) => void;
  loading?: boolean;
}

export function ReversalReasonModal({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: ReversalReasonModalProps) {
  const [selected, setSelected] = useState<ReversalReason | "">("");
  const [otherText, setOtherText] = useState("");

  const handleSubmit = () => {
    if (!selected) return;
    if (selected === "other" && !otherText.trim()) return;
    onSubmit(selected as ReversalReason, selected === "other" ? otherText.trim() : undefined);
    setSelected("");
    setOtherText("");
  };

  const handleCancel = () => {
    setSelected("");
    setOtherText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Why are you changing your mind?</DialogTitle>
          <DialogDescription>
            You previously confirmed you were paid. Please tell us what happened.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {REVERSAL_REASONS.map((r) => (
              <label
                key={r.value}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <input
                  type="radio"
                  name="reversal"
                  value={r.value}
                  checked={selected === r.value}
                  onChange={() => setSelected(r.value)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">{r.label}</span>
              </label>
            ))}
          </div>
          {selected === "other" && (
            <div className="space-y-2">
              <Label htmlFor="reason-other">Please explain</Label>
              <Textarea
                id="reason-other"
                placeholder="Describe what happened..."
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !selected || (selected === "other" && !otherText.trim())}
          >
            {loading ? "Updating..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
