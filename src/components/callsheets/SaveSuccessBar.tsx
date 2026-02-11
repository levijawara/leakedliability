import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, X } from "lucide-react";

interface SaveSuccessBarProps {
  savedCount: number;
  mergedCount: number;
  onGoToMatching?: () => void;
  onGoToNOVAMatching?: () => void;
  onDismiss: () => void;
}

export function SaveSuccessBar({
  savedCount,
  mergedCount,
  onDismiss,
}: SaveSuccessBarProps) {
  const parts = [];
  if (savedCount > 0) parts.push(`${savedCount} saved`);
  if (mergedCount > 0) parts.push(`${mergedCount} merged`);
  const summary = parts.join(', ') || 'Contacts saved';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground py-3 px-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-between gap-4 max-w-5xl">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">{summary}.</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4 mr-1" />
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
