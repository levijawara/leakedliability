import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ExpandableValueListProps {
  values: string[] | null | undefined;
  maxVisible?: number;
  label?: string;
  className?: string;
}

export function ExpandableValueList({
  values,
  maxVisible = 2,
  label,
  className = "",
}: ExpandableValueListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!values || values.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const visibleValues = isExpanded ? values : values.slice(0, maxVisible);
  const hiddenCount = values.length - maxVisible;
  const hasMore = hiddenCount > 0;

  if (values.length <= maxVisible) {
    return (
      <div className={`flex flex-wrap gap-1 ${className}`}>
        {values.map((value, index) => (
          <span
            key={index}
            className="inline-block px-2 py-0.5 bg-muted rounded text-sm"
          >
            {value}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {visibleValues.map((value, index) => (
        <span
          key={index}
          className="inline-block px-2 py-0.5 bg-muted rounded text-sm"
        >
          {value}
        </span>
      ))}
      
      {hasMore && !isExpanded && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              +{hiddenCount} more
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto max-w-xs p-2" align="start">
            <div className="flex flex-wrap gap-1">
              {values.slice(maxVisible).map((value, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-0.5 bg-muted rounded text-sm"
                >
                  {value}
                </span>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
