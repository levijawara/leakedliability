import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-GRACE-PERIODS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Cron job started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find all entitlements where grace period has expired
    const { data: expiredEntitlements, error: queryError } = await supabase
      .from("user_entitlements")
      .select("id, user_id, subscription_tier, grace_period_ends_at, profiles!inner(email, legal_first_name, legal_last_name)")
      .eq("status", "grace_period")
      .lt("grace_period_ends_at", new Date().toISOString());

    if (queryError) {
      logStep("ERROR querying expired grace periods", { error: queryError });
      throw queryError;
    }

    if (!expiredEntitlements || expiredEntitlements.length === 0) {
      logStep("No expired grace periods found");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No expired grace periods",
        processed: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found expired grace periods", { count: expiredEntitlements.length });

    let successCount = 0;
    let errorCount = 0;

    // Process each expired entitlement
    for (const entitlement of expiredEntitlements) {
      try {
        // Update status to cancelled
        const { error: updateError } = await supabase
          .from("user_entitlements")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", entitlement.id);

        if (updateError) {
          logStep("ERROR updating entitlement", { entitlementId: entitlement.id, error: updateError });
          errorCount++;
          continue;
        }

        // Send cancellation email
        const profile = Array.isArray(entitlement.profiles) 
          ? entitlement.profiles[0] 
          : entitlement.profiles;

        if (profile?.email) {
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'subscription_canceled',
              to: profile.email,
              data: {
                userName: `${profile.legal_first_name} ${profile.legal_last_name}`,
                subscriptionTier: entitlement.subscription_tier,
                resubscribeUrl: `${Deno.env.get("SUPABASE_URL")}/subscribe`,
                reason: 'grace_period_expired',
              }
            }
          });

          logStep("Cancellation email sent", { userId: entitlement.user_id });
        }

        // Log to audit_logs
        await supabase
          .from("audit_logs")
          .insert({
            user_id: entitlement.user_id,
            event_type: "subscription_cancelled_grace_period_expired",
            payload: {
              entitlement_id: entitlement.id,
              grace_period_ended: entitlement.grace_period_ends_at,
              cancelled_at: new Date().toISOString(),
            }
          });

        successCount++;
        logStep("Processed successfully", { userId: entitlement.user_id });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logStep("ERROR processing entitlement", { 
          entitlementId: entitlement.id, 
          error: errorMessage 
        });
        errorCount++;
      }
    }

    logStep("Cron job completed", { 
      total: expiredEntitlements.length,
      success: successCount,
      errors: errorCount 
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: "Grace period check completed",
      total: expiredEntitlements.length,
      processed: successCount,
      errors: errorCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("FATAL ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
