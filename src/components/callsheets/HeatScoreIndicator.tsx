import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Flame, ThermometerSun, Snowflake, AlertTriangle } from "lucide-react";

interface HeatScoreIndicatorProps {
  heatScore: number | null;
  paidCount?: number;
  neverPaidCount?: number;
  compact?: boolean;
}

export function HeatScoreIndicator({ 
  heatScore, 
  paidCount = 0, 
  neverPaidCount = 0,
  compact = false 
}: HeatScoreIndicatorProps) {
  if (heatScore === null || heatScore === undefined) {
    return (
      <span className="text-muted-foreground text-sm">—</span>
    );
  }

  // Determine color and icon based on heat score
  // < 0 = Green (reliable), 0-0.3 = Yellow, 0.3-0.6 = Orange, > 0.6 = Red
  let color: string;
  let bgColor: string;
  let textColor: string;
  let Icon = Snowflake;
  let label = "Healthy";

  if (heatScore < 0) {
    color = "text-green-500";
    bgColor = "bg-green-500/10";
    textColor = "text-green-700 dark:text-green-400";
    Icon = Snowflake;
    label = "Reliable";
  } else if (heatScore < 0.3) {
    color = "text-yellow-500";
    bgColor = "bg-yellow-500/10";
    textColor = "text-yellow-700 dark:text-yellow-400";
    Icon = ThermometerSun;
    label = "Mixed";
  } else if (heatScore < 0.6) {
    color = "text-orange-500";
    bgColor = "bg-orange-500/10";
    textColor = "text-orange-700 dark:text-orange-400";
    Icon = AlertTriangle;
    label = "Warning";
  } else {
    color = "text-red-500";
    bgColor = "bg-red-500/10";
    textColor = "text-red-700 dark:text-red-400";
    Icon = Flame;
    label = "High Risk";
  }

  const formattedScore = heatScore.toFixed(2);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${bgColor}`}>
              <Icon className={`h-3 w-3 ${color}`} />
              <span className={`text-xs font-medium ${textColor}`}>{formattedScore}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p className="font-medium">{label}</p>
              <p>🟢 Paid: {paidCount}</p>
              <p>🔴 Unpaid: {neverPaidCount}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 ${bgColor} ${textColor} border-0`}>
            <Icon className={`h-3 w-3 ${color}`} />
            <span>{formattedScore}</span>
            <span className="text-[10px] opacity-75">{label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p className="font-medium">Heat Score: {formattedScore}</p>
            <p>Formula: (unpaid×1.0 - paid×0.25) / total</p>
            <div className="mt-2 pt-2 border-t">
              <p>🟢 Paid: {paidCount}</p>
              <p>🔴 Unpaid: {neverPaidCount}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
