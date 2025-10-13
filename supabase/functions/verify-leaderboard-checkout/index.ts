import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    
    if (!sessionId) {
      logStep("ERROR: Missing session_id parameter");
      return new Response(
        JSON.stringify({ error: "missing_session_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Session ID received", { sessionId });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: Missing STRIPE_SECRET_KEY");
      throw new Error("Missing STRIPE_SECRET_KEY");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2022-11-15" });
    logStep("Stripe client initialized");

    // Authenticate the caller
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      return new Response(
        JSON.stringify({ error: "unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    
    if (userErr || !userRes.user) {
      logStep("ERROR: Invalid user", { error: userErr?.message });
      return new Response(
        JSON.stringify({ error: "invalid_user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    logStep("User authenticated", { userId: userRes.user.id, email: userRes.user.email });

    // Verify the Checkout session with Stripe
    logStep("Retrieving checkout session from Stripe");
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    logStep("Checkout session retrieved", {
      paymentStatus: session.payment_status,
      customerId: session.customer,
      subscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
    });

    if (session.payment_status !== "paid") {
      logStep("Payment not completed", { paymentStatus: session.payment_status });
      return new Response(
        JSON.stringify({ ok: false, reason: "not_paid", payment_status: session.payment_status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const subscription = typeof session.subscription === 'object' ? session.subscription : null;
    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : undefined;
    const stripeSubscriptionId = subscription?.id;

    logStep("Creating/updating entitlement", {
      userId: userRes.user.id,
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
    });

    // Grant entitlement
    const { error: upsertErr } = await supabase
      .from("user_entitlements")
      .upsert(
        {
          user_id: userRes.user.id,
          entitlement_type: "leaderboard",
          source: "stripe_subscription",
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId ?? null,
          status: "active",
          subscription_end: subscription?.cancel_at
            ? new Date(subscription.cancel_at * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,entitlement_type" }
      );

    if (upsertErr) {
      logStep("ERROR: Database upsert failed", { error: upsertErr.message });
      return new Response(
        JSON.stringify({ error: "db_upsert_failed", details: upsertErr.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    logStep("Entitlement granted successfully");

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    logStep("ERROR: Unexpected exception", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
