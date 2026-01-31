import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  PlayCircle, 
  Loader2, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StatusCounts {
  pending: number;
  queued: number;
  parsing: number;
  parsed: number;
  error: number;
}

interface ReparseControlPanelProps {
  statusCounts: StatusCounts;
  pendingSheetIds: string[];
  errorSheetIds: string[];
  onQueueComplete: () => void;
}

export function ReparseControlPanel({
  statusCounts,
  pendingSheetIds,
  errorSheetIds,
  onQueueComplete,
}: ReparseControlPanelProps) {
  const { toast } = useToast();
  const [batchSize, setBatchSize] = useState<string>("10");
  const [isQueueing, setIsQueueing] = useState(false);
  const [isRetryingErrors, setIsRetryingErrors] = useState(false);

  const totalPending = statusCounts.pending;
  const totalErrors = statusCounts.error;
  const hasWork = totalPending > 0 || totalErrors > 0;

  // Queue next batch for parsing with Firecrawl priority
  const handleQueueBatch = async () => {
    const size = parseInt(batchSize);
    const toQueue = pendingSheetIds.slice(0, size);
    
    if (toQueue.length === 0) {
      toast({
        title: "No sheets to queue",
        description: "All pending sheets have been queued.",
      });
      return;
    }

    setIsQueueing(true);
    try {
      // Update status to queued with firecrawl priority
      const { error: updateError } = await supabase
        .from('global_call_sheets')
        .update({ 
          status: 'queued',
          extraction_mode: 'firecrawl_priority',
          error_message: null,
          retry_count: 0,
          parsing_started_at: null
        })
        .in('id', toQueue);

      if (updateError) throw updateError;

      // Trigger continuous queue processor (self-continues until queue empty)
      await supabase.functions.invoke('continuous-queue-processor', {});

      toast({
        title: "Batch queued",
        description: `${toQueue.length} call sheet(s) queued for Firecrawl parsing.`,
      });

      onQueueComplete();
    } catch (error: any) {
      console.error('[ReparseControlPanel] Queue error:', error);
      toast({
        title: "Queue failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsQueueing(false);
    }
  };

  // Retry all error sheets
  const handleRetryErrors = async () => {
    if (errorSheetIds.length === 0) return;

    setIsRetryingErrors(true);
    try {
      const { error: updateError } = await supabase
        .from('global_call_sheets')
        .update({ 
          status: 'queued',
          extraction_mode: 'firecrawl_priority',
          error_message: null,
          retry_count: 0,
          parsing_started_at: null
        })
        .in('id', errorSheetIds);

      if (updateError) throw updateError;

      // Trigger continuous queue processor (self-continues until queue empty)
      await supabase.functions.invoke('continuous-queue-processor', {});

      toast({
        title: "Errors queued for retry",
        description: `${errorSheetIds.length} failed sheet(s) queued for re-parsing.`,
      });

      onQueueComplete();
    } catch (error: any) {
      console.error('[ReparseControlPanel] Retry error:', error);
      toast({
        title: "Retry failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRetryingErrors(false);
    }
  };

  if (!hasWork && statusCounts.queued === 0 && statusCounts.parsing === 0) {
    return null;
  }

  return (
    <Card className="mb-6 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Summary */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">Reparse Status:</span>
            
            {statusCounts.pending > 0 && (
              <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                <Clock className="h-3 w-3" />
                {statusCounts.pending} Pending
              </Badge>
            )}
            
            {statusCounts.queued > 0 && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {statusCounts.queued} Queued
              </Badge>
            )}
            
            {statusCounts.parsing > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {statusCounts.parsing} Parsing
              </Badge>
            )}
            
            {statusCounts.parsed > 0 && (
              <Badge className="gap-1 bg-green-500 hover:bg-green-600">
                <CheckCircle className="h-3 w-3" />
                {statusCounts.parsed} Complete
              </Badge>
            )}
            
            {statusCounts.error > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {statusCounts.error} Failed
              </Badge>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {totalPending > 0 && (
              <>
                <Select value={batchSize} onValueChange={setBatchSize}>
                  <SelectTrigger className="w-[100px] bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="5">5 sheets</SelectItem>
                    <SelectItem value="10">10 sheets</SelectItem>
                    <SelectItem value="25">25 sheets</SelectItem>
                    <SelectItem value="50">50 sheets</SelectItem>
                    <SelectItem value="100">100 sheets</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleQueueBatch}
                  disabled={isQueueing || pendingSheetIds.length === 0}
                  className="gap-2"
                >
                  {isQueueing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                  Queue Batch
                </Button>
              </>
            )}

            {totalErrors > 0 && (
              <Button
                variant="outline"
                onClick={handleRetryErrors}
                disabled={isRetryingErrors}
                className="gap-2"
              >
                {isRetryingErrors ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Retry {totalErrors} Failed
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
