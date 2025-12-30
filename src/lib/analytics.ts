import { supabase } from "@/integrations/supabase/client";
import { trackAnalyticsFailure } from "./failureTracking";

let hasTracked = false;
let consecutiveFailures = 0;
const MAX_SILENT_FAILURES = 3; // After 3 failures, start logging errors

export async function trackVisit() {
  if (typeof window === "undefined") return;
  if (hasTracked) return;
  
  hasTracked = true;

  try {
    const { error } = await supabase.functions.invoke("track-visit", {
      body: {},
    });

    if (error) {
      consecutiveFailures++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Always track failures for visibility
      trackAnalyticsFailure('trackVisit', errorMsg, {
        consecutiveFailures,
        errorCode: error.code,
        errorMessage: error.message
      });

      // Only log to console after multiple failures (to avoid spam)
      if (consecutiveFailures >= MAX_SILENT_FAILURES || import.meta.env.DEV) {
        console.error("[analytics] Failed to track visit:", error);
        console.error("[analytics] This is failure #", consecutiveFailures);
      }
    } else {
      // Reset counter on success
      consecutiveFailures = 0;
    }
  } catch (err) {
    consecutiveFailures++;
    const errorMsg = err instanceof Error ? err.message : String(err);
    
    // Always track failures
    trackAnalyticsFailure('trackVisit', errorMsg, {
      consecutiveFailures,
      errorType: err instanceof Error ? err.constructor.name : typeof err
    });

    // Log errors after threshold or in dev
    if (consecutiveFailures >= MAX_SILENT_FAILURES || import.meta.env.DEV) {
      console.error("[analytics] Failed to track visit:", err);
      console.error("[analytics] This is failure #", consecutiveFailures);
    }
  }
}
