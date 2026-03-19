import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternalSecret } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration
const STUCK_THRESHOLD_MINUTES = 10; // Jobs parsing for longer than this are considered stuck
const MAX_RETRIES = 3; // Maximum retry attempts before terminal error

interface WatchdogResult {
  callSheetId: string;
  fileName: string;
  action: "reset_to_queued" | "marked_error" | "skipped";
  message: string;
  retryCount: number;
  stuckMinutes: number;
}

function logStep(step: string, details?: Record<string, unknown>) {
  console.log(`[WATCHDOG_CALL_SHEETS] ${step}`, details ? JSON.stringify(details) : "");
}

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require internal secret (cron-only function)
  const denied = requireInternalSecret(req, corsHeaders);
  if (denied) return denied;

  try {
    logStep("Starting watchdog scan");

    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Calculate threshold timestamp
    const thresholdTime = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000).toISOString();

    // Find stuck parsing jobs
    const { data: stuckSheets, error: fetchError } = await supabase
      .from("call_sheets")
      .select("id, file_name, retry_count, parsing_started_at, user_id")
      .eq("status", "parsing")
      .lt("parsing_started_at", thresholdTime);

    if (fetchError) {
      logStep("Error fetching stuck sheets", { error: fetchError.message });
      throw new Error(`Failed to fetch stuck sheets: ${fetchError.message}`);
    }

    if (!stuckSheets || stuckSheets.length === 0) {
      logStep("No stuck call sheets found");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No stuck call sheets found",
          recovered: 0,
          results: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    logStep("Found stuck call sheets", { count: stuckSheets.length });

    const results: WatchdogResult[] = [];
    let recoveredCount = 0;
    let errorCount = 0;

    // Process each stuck sheet
    for (const sheet of stuckSheets) {
      const currentRetryCount = sheet.retry_count || 0;
      const parsingStartedAt = new Date(sheet.parsing_started_at).getTime();
      const stuckMinutes = Math.floor((Date.now() - parsingStartedAt) / 60000);
      const now = new Date().toISOString();

      logStep("Processing stuck sheet", { 
        id: sheet.id, 
        fileName: sheet.file_name,
        stuckMinutes,
        retryCount: currentRetryCount
      });

      try {
        const newRetryCount = currentRetryCount + 1;

        if (newRetryCount >= MAX_RETRIES) {
          // Terminal error state - max retries exceeded
          logStep("Max retries exceeded, marking as terminal error", { 
            id: sheet.id, 
            retryCount: newRetryCount 
          });
          
          const { error: updateError } = await supabase
            .from("call_sheets")
            .update({
              status: "error",
              error_message: `Stuck processing - max retries (${MAX_RETRIES}) exceeded after ${stuckMinutes} minutes`,
              retry_count: newRetryCount,
              last_error_at: now,
              parsing_started_at: null,
            })
            .eq("id", sheet.id);

          if (updateError) {
            throw new Error(`Failed to update: ${updateError.message}`);
          }

          results.push({
            callSheetId: sheet.id,
            fileName: sheet.file_name,
            action: "marked_error",
            message: `Terminal error after ${stuckMinutes} minutes stuck`,
            retryCount: newRetryCount,
            stuckMinutes,
          });
          errorCount++;
        } else {
          // Reset to queued for retry
          logStep("Resetting stuck sheet to queued", { 
            id: sheet.id, 
            retryCount: newRetryCount 
          });
          
          const { error: updateError } = await supabase
            .from("call_sheets")
            .update({
              status: "queued",
              error_message: `Watchdog recovery (retry ${newRetryCount}/${MAX_RETRIES}): stuck for ${stuckMinutes} minutes`,
              retry_count: newRetryCount,
              last_error_at: now,
              parsing_started_at: null,
            })
            .eq("id", sheet.id);

          if (updateError) {
            throw new Error(`Failed to update: ${updateError.message}`);
          }

          results.push({
            callSheetId: sheet.id,
            fileName: sheet.file_name,
            action: "reset_to_queued",
            message: `Recovered after ${stuckMinutes} minutes stuck`,
            retryCount: newRetryCount,
            stuckMinutes,
          });
          recoveredCount++;
        }
      } catch (sheetError) {
        const errorMsg = sheetError instanceof Error ? sheetError.message : "Unknown error";
        logStep("Error processing stuck sheet", { id: sheet.id, error: errorMsg });

        results.push({
          callSheetId: sheet.id,
          fileName: sheet.file_name,
          action: "skipped",
          message: `Watchdog error: ${errorMsg}`,
          retryCount: currentRetryCount,
          stuckMinutes,
        });
      }
    }

    const totalDurationMs = Date.now() - startTime;
    logStep("Watchdog scan complete", {
      recovered: recoveredCount,
      errors: errorCount,
      skipped: results.filter((r) => r.action === "skipped").length,
      totalDurationMs,
    });

    // Log to audit_logs for visibility
    await supabase.from("audit_logs").insert({
      event_type: "watchdog_call_sheets_run",
      payload: {
        recovered: recoveredCount,
        errors: errorCount,
        skipped: results.filter((r) => r.action === "skipped").length,
        stuckThresholdMinutes: STUCK_THRESHOLD_MINUTES,
        maxRetries: MAX_RETRIES,
        totalDurationMs,
        results: results.map((r) => ({
          id: r.callSheetId,
          action: r.action,
          retryCount: r.retryCount,
          stuckMinutes: r.stuckMinutes,
        })),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Recovered ${recoveredCount} stuck call sheets`,
        recovered: recoveredCount,
        errors: errorCount,
        skipped: results.filter((r) => r.action === "skipped").length,
        totalDurationMs,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logStep("Fatal error in watchdog", { error: errorMsg });

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
