import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export const config = { verify_jwt: true };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-LEADERBOARD-ACCESS] ${step}${detailsStr}`);
};

// Owner email whitelist (hardcoded for now, can move to DB later)
const OWNER_EMAILS = [
  'leakedliability@gmail.com'
];

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
    const userEmail = user.email || '';
    logStep("User authenticated", { userId: user.id, email: userEmail });

    // 🚨 PRIORITY 1: Check global free access flag
    const { data: config } = await supabaseClient
      .from('leaderboard_config')
      .select('free_access_enabled, threshold_locked')
      .single();

    if (config?.free_access_enabled) {
      logStep("Global free access enabled - granting access");
      return new Response(JSON.stringify({ 
        hasAccess: true, 
        canPurchase: false, 
        reason: 'free_access_period',
        message: 'Free access period active'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 🚨 PRIORITY 2: Check owner email (for logging only, no auto-access)
    const isOwner = OWNER_EMAILS.includes(userEmail.toLowerCase());
    if (isOwner) {
      logStep("Owner email detected - checking subscription status normally");
    }

    // 🚨 PRIORITY 3: Check if admin role
    const { data: adminRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (adminRole) {
      logStep("Admin role - granting access");
      return new Response(JSON.stringify({ 
        hasAccess: true, 
        canPurchase: false, 
        reason: 'admin',
        accountType: 'admin'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 🚨 PRIORITY 4: Check for admin override entitlement
    const { data: override } = await supabaseClient
      .from('user_entitlements')
      .select('*')
      .eq('user_id', user.id)
      .eq('entitlement_type', 'leaderboard')
      .eq('source', 'admin_override')
      .eq('status', 'active')
      .maybeSingle();

    if (override) {
      logStep("Admin override entitlement - granting access");
      return new Response(JSON.stringify({ 
        hasAccess: true, 
        canPurchase: false, 
        reason: 'admin_override'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get user profile for logging purposes only
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('account_type')
      .eq('user_id', user.id)
      .single();

    const accountType = profile?.account_type || 'crew';
    logStep("User profile", { accountType });


    // 🚨 PRIORITY 6: Check for active paid subscription
    const { data: subscription } = await supabaseClient
      .from('user_entitlements')
      .select('*')
      .eq('user_id', user.id)
      .eq('entitlement_type', 'leaderboard')
      .eq('source', 'stripe_subscription')
      .eq('status', 'active')
      .maybeSingle();

    if (subscription) {
      logStep("Active subscription - granting access");
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


    // ❌ NO ACCESS: Everyone gets the same message
    const reason = 'no_access';
    const message = 'Subscribe to access the full leaderboard';

    logStep("No access granted", { reason, accountType });
    return new Response(JSON.stringify({ 
      hasAccess: false, 
      canPurchase: true, 
      reason,
      accountType,
      hasVerifiedReport: false,
      message
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
