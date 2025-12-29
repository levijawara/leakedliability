import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration
const BATCH_SIZE = 5; // Process up to 5 call sheets per invocation
const PROCESSING_TIMEOUT_MS = 55000; // 55 seconds (leave buffer for 60s edge function limit)

interface ProcessingResult {
  callSheetId: string;
  fileName: string;
  status: "success" | "error" | "skipped";
  message: string;
  durationMs?: number;
}

function logStep(step: string, details?: Record<string, unknown>) {
  console.log(`[QUEUE_PROCESSOR] ${step}`, details ? JSON.stringify(details) : "");
}

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting queue processor");

    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch queued call sheets
    const { data: queuedSheets, error: fetchError } = await supabase
      .from("call_sheets")
      .select("id, file_name, file_path, user_id, uploaded_at")
      .eq("status", "queued")
      .order("uploaded_at", { ascending: true }) // FIFO processing
      .limit(BATCH_SIZE);

    if (fetchError) {
      logStep("Error fetching queued sheets", { error: fetchError.message });
      throw new Error(`Failed to fetch queued sheets: ${fetchError.message}`);
    }

    if (!queuedSheets || queuedSheets.length === 0) {
      logStep("No queued call sheets found");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No call sheets in queue",
          processed: 0,
          results: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    logStep("Found queued call sheets", { count: queuedSheets.length });

    const results: ProcessingResult[] = [];
    let processedCount = 0;
    let errorCount = 0;

    // Process each call sheet
    for (const sheet of queuedSheets) {
      // Check if we're approaching timeout
      if (Date.now() - startTime > PROCESSING_TIMEOUT_MS) {
        logStep("Approaching timeout, stopping processing", {
          processed: processedCount,
          remaining: queuedSheets.length - processedCount,
        });
        break;
      }

      const sheetStartTime = Date.now();
      logStep("Processing call sheet", { id: sheet.id, fileName: sheet.file_name });

      try {
        // Mark as processing to prevent duplicate processing
        const { error: updateError } = await supabase
          .from("call_sheets")
          .update({ status: "parsing" })
          .eq("id", sheet.id)
          .eq("status", "queued"); // Only update if still queued (race condition protection)

        if (updateError) {
          logStep("Failed to mark as parsing", { id: sheet.id, error: updateError.message });
          results.push({
            callSheetId: sheet.id,
            fileName: sheet.file_name,
            status: "skipped",
            message: `Failed to acquire lock: ${updateError.message}`,
          });
          continue;
        }

        // Invoke the parse-call-sheet function
        const { data: parseResult, error: parseError } = await supabase.functions.invoke(
          "parse-call-sheet",
          {
            body: { call_sheet_id: sheet.id },
          }
        );

        const durationMs = Date.now() - sheetStartTime;

        if (parseError) {
          logStep("Parse function error", { id: sheet.id, error: parseError.message });
          
          // Mark as error
          await supabase
            .from("call_sheets")
            .update({
              status: "error",
              error_message: `Queue processor error: ${parseError.message}`.substring(0, 500),
            })
            .eq("id", sheet.id);

          results.push({
            callSheetId: sheet.id,
            fileName: sheet.file_name,
            status: "error",
            message: parseError.message,
            durationMs,
          });
          errorCount++;
        } else {
          logStep("Parse completed", { id: sheet.id, result: parseResult });
          
          results.push({
            callSheetId: sheet.id,
            fileName: sheet.file_name,
            status: "success",
            message: parseResult?.message || "Parsed successfully",
            durationMs,
          });
          processedCount++;
        }
      } catch (sheetError) {
        const errorMsg = sheetError instanceof Error ? sheetError.message : "Unknown error";
        logStep("Unexpected error processing sheet", { id: sheet.id, error: errorMsg });

        // Mark as error
        await supabase
          .from("call_sheets")
          .update({
            status: "error",
            error_message: `Queue processor exception: ${errorMsg}`.substring(0, 500),
          })
          .eq("id", sheet.id);

        results.push({
          callSheetId: sheet.id,
          fileName: sheet.file_name,
          status: "error",
          message: errorMsg,
          durationMs: Date.now() - sheetStartTime,
        });
        errorCount++;
      }
    }

    const totalDurationMs = Date.now() - startTime;
    logStep("Queue processing complete", {
      processed: processedCount,
      errors: errorCount,
      skipped: results.filter((r) => r.status === "skipped").length,
      totalDurationMs,
    });

    // Log to audit_logs for visibility
    await supabase.from("audit_logs").insert({
      event_type: "queue_processor_run",
      payload: {
        processed: processedCount,
        errors: errorCount,
        skipped: results.filter((r) => r.status === "skipped").length,
        totalDurationMs,
        results: results.map((r) => ({
          id: r.callSheetId,
          status: r.status,
          durationMs: r.durationMs,
        })),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} call sheets`,
        processed: processedCount,
        errors: errorCount,
        skipped: results.filter((r) => r.status === "skipped").length,
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
    logStep("Fatal error in queue processor", { error: errorMsg });

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
