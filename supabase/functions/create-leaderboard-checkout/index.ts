import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-LEADERBOARD-CHECKOUT] ${step}${detailsStr}`);
};

interface CheckoutRequest {
  tier?: string;
  billing_frequency?: string;
  return_to?: string;
}

serve(async (req) => {
  logStep("Request received", { method: req.method });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Environment validation - check all required secrets upfront
    const envCheck = {
      crew_t1_monthly: !!Deno.env.get("STRIPE_CREW_T1_MONTHLY_PRICE_ID"),
      crew_t1_annual: !!Deno.env.get("STRIPE_CREW_T1_ANNUAL_PRICE_ID"),
      producer_t1_monthly: !!Deno.env.get("STRIPE_PRODUCER_T1_MONTHLY_PRICE_ID"),
      producer_t1_annual: !!Deno.env.get("STRIPE_PRODUCER_T1_ANNUAL_PRICE_ID"),
      producer_t2_monthly: !!Deno.env.get("STRIPE_PRODUCER_T2_MONTHLY_PRICE_ID"),
      producer_t2_annual: !!Deno.env.get("STRIPE_PRODUCER_T2_ANNUAL_PRICE_ID"),
      stripe_key_set: !!Deno.env.get("STRIPE_SECRET_KEY"),
      supabase_url_set: !!Deno.env.get("SUPABASE_URL"),
      supabase_anon_key_set: !!Deno.env.get("SUPABASE_ANON_KEY"),
    };
    logStep("Environment check", envCheck);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body for tier selection
    const body: CheckoutRequest = await req.json().catch(() => ({}));
    const { tier = 'crew_t1', billing_frequency = 'monthly', return_to } = body;
    logStep("Request body parsed", { tier, billing_frequency, return_to });
    
    // Validate tier and billing frequency
    const validTiers = ['crew_t1', 'producer_t1', 'producer_t2'];
    const validFrequencies = ['monthly', 'annual'];
    
    if (!validTiers.includes(tier)) {
      throw new Error(`Invalid tier: ${tier}. Must be one of: ${validTiers.join(', ')}`);
    }
    
    if (!validFrequencies.includes(billing_frequency)) {
      throw new Error(`Invalid billing frequency: ${billing_frequency}. Must be: monthly or annual`);
    }

    // Build price ID key and get from environment
    const priceIdKey = `${tier}_${billing_frequency}`;
    const envKeyMap: Record<string, string> = {
      'crew_t1_monthly': 'STRIPE_CREW_T1_MONTHLY_PRICE_ID',
      'crew_t1_annual': 'STRIPE_CREW_T1_ANNUAL_PRICE_ID',
      'producer_t1_monthly': 'STRIPE_PRODUCER_T1_MONTHLY_PRICE_ID',
      'producer_t1_annual': 'STRIPE_PRODUCER_T1_ANNUAL_PRICE_ID',
      'producer_t2_monthly': 'STRIPE_PRODUCER_T2_MONTHLY_PRICE_ID',
      'producer_t2_annual': 'STRIPE_PRODUCER_T2_ANNUAL_PRICE_ID',
    };
    
    const envKey = envKeyMap[priceIdKey];
    if (!envKey) {
      throw new Error(`No environment key mapping for ${priceIdKey}`);
    }
    
    const priceId = Deno.env.get(envKey);
    logStep("Price ID lookup", { priceIdKey, envKey, priceIdFound: !!priceId, priceIdValue: priceId?.substring(0, 10) + '...' });
    
    if (!priceId) {
      throw new Error(`Missing price ID for ${envKey}. Please configure this secret in Supabase.`);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    } else {
      logStep("No existing customer - will create during checkout");
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    // Build success URL - use return_to if provided, otherwise default to leaderboard
    const successPath = return_to ? return_to : '/leaderboard';
    const successUrl = `${origin}${successPath}?session_id={CHECKOUT_SESSION_ID}`;
    
    logStep("Creating checkout session", { origin, successUrl, priceId });
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: `${origin}/subscribe`,
      metadata: {
        user_id: user.id,
        entitlement_type: 'leaderboard',
        subscription_tier: tier,
        billing_frequency: billing_frequency,
      },
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
      url: session.url,
      tier,
      billing_frequency
    });

    return new Response(JSON.stringify({ url: session.url }), {
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
