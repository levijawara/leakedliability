import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-SETUP-CHECK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    if (!userData.user) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: userData.user.id });

    // Check Stripe secret key (existence only, never log the value)
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const hasStripeKey = !!stripeKey;
    logStep("Stripe key check", { exists: hasStripeKey });

    if (!hasStripeKey) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "STRIPE_SECRET_KEY not configured" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Detect test vs live mode
    const isTestMode = stripeKey!.startsWith("sk_test_");
    const isLiveMode = stripeKey!.startsWith("sk_live_");
    const mode = isTestMode ? "test" : isLiveMode ? "live" : "unknown";
    logStep("Stripe mode detected", { mode });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey!, { apiVersion: "2022-11-15" });

    // Check leaderboard price
    const priceId = Deno.env.get("STRIPE_LEADERBOARD_PRICE_ID");
    if (!priceId) {
      logStep("No price ID configured");
      return new Response(JSON.stringify({
        ok: false,
        error: "STRIPE_LEADERBOARD_PRICE_ID not configured",
        mode
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Fetching price", { priceId });
    const price = await stripe.prices.retrieve(priceId);
    
    const priceActive = price.active;
    const priceRecurring = price.type === "recurring";
    const currency = price.currency;
    const amount = price.unit_amount;

    logStep("Price retrieved", { 
      active: priceActive, 
      recurring: priceRecurring, 
      currency, 
      amount 
    });

    return new Response(JSON.stringify({
      ok: true,
      price_active: priceActive,
      price_recurring: priceRecurring,
      currency,
      amount,
      mode
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      ok: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
