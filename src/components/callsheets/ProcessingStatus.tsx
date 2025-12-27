import { Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessingStatusProps {
  status: "queued" | "processing" | "parsed" | "error" | "reviewed";
  message?: string;
  className?: string;
}

export function ProcessingStatus({
  status,
  message,
  className,
}: ProcessingStatusProps) {
  const config = {
    queued: {
      icon: Clock,
      label: "Queued",
      description: message || "Waiting to be processed",
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    processing: {
      icon: Loader2,
      label: "Processing",
      description: message || "Extracting contacts from your call sheet",
      color: "text-primary",
      bgColor: "bg-primary/10",
      isAnimated: true,
    },
    parsed: {
      icon: CheckCircle,
      label: "Ready for Review",
      description: message || "Contacts extracted successfully",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    reviewed: {
      icon: CheckCircle,
      label: "Reviewed",
      description: message || "Review completed",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    error: {
      icon: AlertCircle,
      label: "Error",
      description: message || "Failed to process call sheet",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  };

  const currentConfig = config[status];
  const Icon = currentConfig.icon;
  const isAnimated = "isAnimated" in currentConfig ? currentConfig.isAnimated : false;

  return (
    <div className={cn("flex items-center gap-3 p-4 rounded-lg", currentConfig.bgColor, className)}>
      <Icon className={cn("h-5 w-5", currentConfig.color, isAnimated && "animate-spin")} />
      <div>
        <p className={cn("font-medium", currentConfig.color)}>{currentConfig.label}</p>
        <p className="text-sm text-muted-foreground">{currentConfig.description}</p>
      </div>
    </div>
  );
}
