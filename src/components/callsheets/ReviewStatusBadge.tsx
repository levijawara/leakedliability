import { Loader2, CheckCircle, AlertCircle, Clock, FileCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ReviewStatusBadgeProps {
  status: string;
  className?: string;
}

export function ReviewStatusBadge({ status, className }: ReviewStatusBadgeProps) {
  const config: Record<
    string,
    {
      icon: React.ElementType;
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
      className?: string;
    }
  > = {
    queued: {
      icon: Clock,
      label: "Queued",
      variant: "secondary",
    },
    processing: {
      icon: Loader2,
      label: "Processing",
      variant: "outline",
      className: "[&_svg]:animate-spin",
    },
    parsed: {
      icon: CheckCircle,
      label: "Ready",
      variant: "default",
      className: "bg-green-600 hover:bg-green-600/90",
    },
    reviewed: {
      icon: FileCheck,
      label: "Reviewed",
      variant: "secondary",
      className: "bg-blue-100 text-blue-700 hover:bg-blue-100",
    },
    error: {
      icon: AlertCircle,
      label: "Error",
      variant: "destructive",
    },
  };

  const { icon: Icon, label, variant, className: statusClassName } =
    config[status] || config.queued;

  return (
    <Badge
      variant={variant}
      className={cn("flex items-center gap-1 w-fit", statusClassName, className)}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
