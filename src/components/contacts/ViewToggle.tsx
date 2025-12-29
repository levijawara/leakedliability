import { List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  view: 'list' | 'cards';
  onViewChange: (view: 'list' | 'cards') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 border border-border rounded-lg p-1">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0",
          view === 'list' && "bg-accent text-accent-foreground"
        )}
        onClick={() => onViewChange('list')}
        aria-label="List view"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0",
          view === 'cards' && "bg-accent text-accent-foreground"
        )}
        onClick={() => onViewChange('cards')}
        aria-label="Cards view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}
