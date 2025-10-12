import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-LEADERBOARD-ACCESS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // 1. Check if admin (always free access)
    const { data: adminRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (adminRole) {
      logStep("Admin user - granted free access");
      return new Response(JSON.stringify({ 
        hasAccess: true, 
        canPurchase: false, 
        reason: 'admin',
        accountType: 'admin',
        hasVerifiedReport: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Check threshold lock status
    const { data: config } = await supabaseClient
      .from('leaderboard_config')
      .select('threshold_locked, producer_count_at_lock')
      .single();

    const thresholdLocked = config?.threshold_locked || false;
    logStep("Threshold status", { thresholdLocked, producerCount: config?.producer_count_at_lock });

    // 3. Check for admin override
    const { data: override } = await supabaseClient
      .from('user_entitlements')
      .select('*')
      .eq('user_id', user.id)
      .eq('entitlement_type', 'leaderboard')
      .eq('source', 'admin_override')
      .eq('status', 'active')
      .maybeSingle();

    if (override) {
      logStep("Admin override found - granted access");
      return new Response(JSON.stringify({ 
        hasAccess: true, 
        canPurchase: false, 
        reason: 'admin_override'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 4. Check for active paid subscription
    const { data: subscription } = await supabaseClient
      .from('user_entitlements')
      .select('*')
      .eq('user_id', user.id)
      .eq('entitlement_type', 'leaderboard')
      .eq('source', 'stripe_subscription')
      .eq('status', 'active')
      .maybeSingle();

    if (subscription) {
      logStep("Active subscription found");
      return new Response(JSON.stringify({ 
        hasAccess: true, 
        canPurchase: false, 
        reason: 'subscription_active',
        subscriptionEnd: subscription.subscription_end
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 5. Get user profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('account_type')
      .eq('user_id', user.id)
      .single();

    const accountType = profile?.account_type || 'crew';
    logStep("User profile", { accountType });

    // 6. Check for verified crew report
    const { data: verifiedReport } = await supabaseClient
      .from('submissions')
      .select('id')
      .eq('user_id', user.id)
      .eq('submission_type', 'crew_report')
      .eq('status', 'verified')
      .maybeSingle();

    const hasVerifiedReport = !!verifiedReport;
    logStep("Verified report check", { hasVerifiedReport });

    // 7. If threshold locked, everyone must pay
    if (thresholdLocked) {
      logStep("Threshold locked - access denied");
      return new Response(JSON.stringify({ 
        hasAccess: false, 
        canPurchase: true, 
        reason: 'threshold_locked',
        accountType,
        hasVerifiedReport,
        message: 'The leaderboard now requires a paid subscription for all users.'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 8. Pre-threshold: Check contributor access (crew with verified report)
    if (accountType === 'crew' && hasVerifiedReport) {
      logStep("Contributor access granted");
      return new Response(JSON.stringify({ 
        hasAccess: true, 
        canPurchase: false, 
        reason: 'contributor_free',
        accountType,
        hasVerifiedReport
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 9. Default: no access, can purchase
    const reason = accountType === 'producer' || accountType === 'production_company' 
      ? 'producer_unpaid' 
      : 'crew_no_report_unpaid';

    logStep("No access - can purchase", { reason });
    return new Response(JSON.stringify({ 
      hasAccess: false, 
      canPurchase: true, 
      reason,
      accountType,
      hasVerifiedReport
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});