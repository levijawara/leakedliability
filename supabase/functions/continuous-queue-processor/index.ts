import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternalSecret } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration
const SHEET_TIMEOUT_MS = 60000; // 60 seconds per sheet
const MAX_RETRIES = 3;

interface ProcessingResult {
  callSheetId: string;
  fileName: string;
  status: "success" | "error" | "timeout";
  message: string;
  durationMs: number;
}

function logStep(step: string, details?: Record<string, unknown>) {
  console.log(`[CONTINUOUS_QUEUE] ${step}`, details ? JSON.stringify(details) : "");
}

serve(async (req) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require internal secret (cron/internal function)
  const denied = requireInternalSecret(req, corsHeaders);
  if (denied) return denied;

  try {
    logStep("Starting continuous queue processor");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch the NEXT queued sheet (single, FIFO)
    const { data: nextSheet, error: fetchError } = await supabase
      .from("global_call_sheets")
      .select("id, original_file_name, retry_count")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      logStep("Error fetching next sheet", { error: fetchError.message });
      throw new Error(`Failed to fetch queued sheet: ${fetchError.message}`);
    }

    if (!nextSheet) {
      logStep("Queue empty - all sheets processed");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Queue empty - processing complete",
          processed: 0,
          queueComplete: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    logStep("Processing sheet", { id: nextSheet.id, fileName: nextSheet.original_file_name });

    const currentRetryCount = nextSheet.retry_count || 0;
    let result: ProcessingResult;

    // Mark as parsing
    const { error: updateError } = await supabase
      .from("global_call_sheets")
      .update({
        status: "parsing",
        parsing_started_at: new Date().toISOString(),
      })
      .eq("id", nextSheet.id)
      .eq("status", "queued");

    if (updateError) {
      logStep("Failed to mark as parsing", { id: nextSheet.id, error: updateError.message });
      result = {
        callSheetId: nextSheet.id,
        fileName: nextSheet.original_file_name,
        status: "error",
        message: `Failed to acquire lock: ${updateError.message}`,
        durationMs: Date.now() - startTime,
      };
    } else {
      // Process with timeout using Promise.race
      const sheetStartTime = Date.now();
      
      try {
        const parsePromise = supabase.functions.invoke("parse-call-sheet", {
          body: { call_sheet_id: nextSheet.id },
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("TIMEOUT")), SHEET_TIMEOUT_MS);
        });

        const { data: parseResult, error: parseError } = await Promise.race([
          parsePromise,
          timeoutPromise,
        ]) as { data: any; error: any };

        const durationMs = Date.now() - sheetStartTime;

        if (parseError) {
          logStep("Parse error", { id: nextSheet.id, error: parseError.message });
          
          const newRetryCount = currentRetryCount + 1;
          
          if (newRetryCount >= MAX_RETRIES) {
            await supabase
              .from("global_call_sheets")
              .update({
                status: "error",
                error_message: `Max retries (${MAX_RETRIES}) exceeded. Last error: ${parseError.message}`.substring(0, 500),
                retry_count: newRetryCount,
                parsing_started_at: null,
              })
              .eq("id", nextSheet.id);
          } else {
            await supabase
              .from("global_call_sheets")
              .update({
                status: "queued",
                error_message: `Retry ${newRetryCount}/${MAX_RETRIES}: ${parseError.message}`.substring(0, 500),
                retry_count: newRetryCount,
                parsing_started_at: null,
              })
              .eq("id", nextSheet.id);
          }

          result = {
            callSheetId: nextSheet.id,
            fileName: nextSheet.original_file_name,
            status: "error",
            message: parseError.message,
            durationMs,
          };
        } else if (parseResult?.error_code === "quality_too_low") {
          logStep("Quality too low (terminal)", { id: nextSheet.id });
          
          await supabase
            .from("global_call_sheets")
            .update({ parsing_started_at: null })
            .eq("id", nextSheet.id);

          result = {
            callSheetId: nextSheet.id,
            fileName: nextSheet.original_file_name,
            status: "error",
            message: "Quality too low (terminal - no retry)",
            durationMs,
          };
        } else {
          logStep("Parse success", { id: nextSheet.id, durationMs });
          
          await supabase
            .from("global_call_sheets")
            .update({ parsing_started_at: null })
            .eq("id", nextSheet.id);

          result = {
            callSheetId: nextSheet.id,
            fileName: nextSheet.original_file_name,
            status: "success",
            message: parseResult?.message || "Parsed successfully",
            durationMs,
          };
        }
      } catch (error) {
        const durationMs = Date.now() - sheetStartTime;
        const isTimeout = error instanceof Error && error.message === "TIMEOUT";
        
        if (isTimeout) {
          logStep("Sheet timed out", { id: nextSheet.id, timeoutMs: SHEET_TIMEOUT_MS });
          
          // Mark as error with timeout message
          await supabase
            .from("global_call_sheets")
            .update({
              status: "error",
              error_message: "Timeout: exceeded 60s limit. May require manual review or re-parse.",
              retry_count: currentRetryCount + 1,
              parsing_started_at: null,
            })
            .eq("id", nextSheet.id);

          result = {
            callSheetId: nextSheet.id,
            fileName: nextSheet.original_file_name,
            status: "timeout",
            message: "Timeout after 60 seconds",
            durationMs,
          };
        } else {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          logStep("Unexpected error", { id: nextSheet.id, error: errorMsg });
          
          const newRetryCount = currentRetryCount + 1;
          
          if (newRetryCount >= MAX_RETRIES) {
            await supabase
              .from("global_call_sheets")
              .update({
                status: "error",
                error_message: `Max retries (${MAX_RETRIES}) exceeded. Last error: ${errorMsg}`.substring(0, 500),
                retry_count: newRetryCount,
                parsing_started_at: null,
              })
              .eq("id", nextSheet.id);
          } else {
            await supabase
              .from("global_call_sheets")
              .update({
                status: "queued",
                error_message: `Retry ${newRetryCount}/${MAX_RETRIES}: ${errorMsg}`.substring(0, 500),
                retry_count: newRetryCount,
                parsing_started_at: null,
              })
              .eq("id", nextSheet.id);
          }

          result = {
            callSheetId: nextSheet.id,
            fileName: nextSheet.original_file_name,
            status: "error",
            message: errorMsg,
            durationMs,
          };
        }
      }
    }

    // Check if more sheets remain queued
    const { count: remainingCount } = await supabase
      .from("global_call_sheets")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued");

    logStep("Checking remaining queue", { remaining: remainingCount });

    // Self-invoke if more sheets remain
    if (remainingCount && remainingCount > 0) {
      logStep("Self-invoking for next sheet", { remaining: remainingCount });
      
      // Fire-and-forget: trigger next invocation
      supabase.functions.invoke("continuous-queue-processor", { headers: { "x-internal-secret": Deno.env.get("INTERNAL_SECRET") || "" } }).catch((err) => {
        logStep("Self-invoke error (non-fatal)", { error: err?.message });
      });
    }

    // Log to audit
    await supabase.from("audit_logs").insert({
      event_type: "continuous_queue_processor_sheet",
      payload: {
        sheetId: result.callSheetId,
        status: result.status,
        durationMs: result.durationMs,
        remainingInQueue: remainingCount || 0,
      },
    });

    const totalDurationMs = Date.now() - startTime;
    logStep("Processing complete", { 
      result: result.status, 
      durationMs: totalDurationMs,
      remaining: remainingCount 
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed 1 sheet (${result.status})`,
        result,
        remainingInQueue: remainingCount || 0,
        totalDurationMs,
        queueComplete: (remainingCount || 0) === 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logStep("Fatal error", { error: errorMsg });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
