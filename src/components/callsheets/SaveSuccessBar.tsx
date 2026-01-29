import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, X } from "lucide-react";

interface SaveSuccessBarProps {
  savedCount: number;
  mergedCount: number;
  onGoToMatching: () => void;
  onGoToNOVAMatching?: () => void;
  onDismiss: () => void;
}

export function SaveSuccessBar({
  savedCount,
  mergedCount,
  onGoToMatching,
  onGoToNOVAMatching,
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
          <span className="font-medium">{summary}. Ready for matching?</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onGoToMatching}
            className="gap-1"
          >
            IG Matching
            <ArrowRight className="h-4 w-4" />
          </Button>
          {onGoToNOVAMatching && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onGoToNOVAMatching}
              className="gap-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              NOVA Matching
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4 mr-1" />
            Stay Here
          </Button>
        </div>
      </div>
    </div>
  );
}
