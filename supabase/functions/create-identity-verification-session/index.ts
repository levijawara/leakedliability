import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-IDENTITY-SESSION] ${step}${detailsStr}`);
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

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    const userId = user.id;
    const userEmail = user.email;
    logStep("User authenticated", { userId, email: userEmail });

    // Parse request body
    const { producer_id } = await req.json();
    if (!producer_id) {
      throw new Error("producer_id is required");
    }
    logStep("Request parsed", { producer_id });

    // CRITICAL: Check subscription status FIRST
    const { data: entitlement, error: entitlementError } = await supabaseClient
      .from("user_entitlements")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("subscription_tier", ["producer_t1", "producer_t2"])
      .maybeSingle();

    if (entitlementError) {
      logStep("Error checking entitlement", { error: entitlementError.message });
    }

    if (!entitlement) {
      logStep("No active producer subscription found");
      return new Response(JSON.stringify({
        error: "subscription_required",
        message: "A producer subscription is required to claim this profile.",
        redirect_url: "/subscribe"
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("Active subscription confirmed", { tier: entitlement.subscription_tier });

    // Get producer details
    const { data: producer, error: producerError } = await supabaseClient
      .from("producers")
      .select("*")
      .eq("id", producer_id)
      .single();

    if (producerError || !producer) {
      throw new Error("Producer not found");
    }
    logStep("Producer found", { name: producer.name, is_placeholder: producer.is_placeholder });

    // Check if producer is claimable
    if (producer.has_claimed_account && producer.claimed_by_user_id !== userId) {
      throw new Error("This producer profile has already been claimed by another user");
    }

    // Check if user already verified for this producer
    if (producer.stripe_verification_status === "verified" && producer.claimed_by_user_id === userId) {
      logStep("Already verified for this producer");
      return new Response(JSON.stringify({
        status: "already_verified",
        message: "You have already verified and claimed this profile."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if there's an existing pending session
    if (producer.stripe_verification_status === "pending" && producer.stripe_verification_session_id) {
      logStep("Existing pending session found, retrieving");
      
      // STRIPE GUARDRAIL: Use shared validation (throws if missing)
      const { getStripeClient } = await import("../_shared/stripeValidation.ts");
      const stripe = getStripeClient();

      try {
        const existingSession = await stripe.identity.verificationSessions.retrieve(
          producer.stripe_verification_session_id
        );

        // If session is still open, return the client secret
        if (existingSession.status === "requires_input") {
          logStep("Returning existing session client secret");
          return new Response(JSON.stringify({
            client_secret: existingSession.client_secret,
            session_id: existingSession.id,
            status: "pending"
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        logStep("Existing session invalid or expired, will create new one");
      }
    }

    // STRIPE GUARDRAIL: Use shared validation (throws if missing)
    const { getStripeClient } = await import("../_shared/stripeValidation.ts");
    const stripe = getStripeClient();

    // Create new Stripe Identity Verification Session
    logStep("Creating new Stripe Identity Verification session");
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      options: {
        document: {
          require_matching_selfie: true,
          require_live_capture: true,
          allowed_types: ["driving_license", "passport", "id_card"],
        },
      },
      metadata: {
        producer_id: producer_id,
        user_id: userId,
        producer_name: producer.name,
        user_email: userEmail || "",
      },
    });
    logStep("Session created", { session_id: session.id });

    // Update producer with session ID and status
    const { error: updateError } = await supabaseClient
      .from("producers")
      .update({
        stripe_verification_session_id: session.id,
        stripe_verification_status: "pending",
      })
      .eq("id", producer_id);

    if (updateError) {
      logStep("Error updating producer", { error: updateError.message });
      throw new Error("Failed to update producer with verification session");
    }

    // Log to identity_claim_history
    await supabaseClient.from("identity_claim_history").insert({
      producer_id: producer_id,
      user_id: userId,
      old_status: producer.stripe_verification_status || "unverified",
      new_status: "pending",
      stripe_session_id: session.id,
    });
    logStep("Claim history logged");

    return new Response(JSON.stringify({
      client_secret: session.client_secret,
      session_id: session.id,
      status: "pending"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
