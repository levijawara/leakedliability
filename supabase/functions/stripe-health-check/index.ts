/**
 * Stripe Health Check Endpoint
 * Mission-critical monitoring for Stripe integration
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getStripeClient, validateStripePriceIds } from "../_shared/stripeValidation.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthCheckResult {
  healthy: boolean;
  timestamp: string;
  checks: {
    secretKeyPresent: boolean;
    secretKeyFormatValid: boolean;
    stripeClientInitialized: boolean;
    apiReachable: boolean;
    pricesLoadable: boolean;
    priceIdsConfigured: boolean;
  };
  errors: string[];
  warnings: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const checks = {
    secretKeyPresent: false,
    secretKeyFormatValid: false,
    stripeClientInitialized: false,
    apiReachable: false,
    pricesLoadable: false,
    priceIdsConfigured: false,
  };

  try {
    // 1. Check secret key presence
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      errors.push("STRIPE_SECRET_KEY is missing");
      return new Response(
        JSON.stringify({
          healthy: false,
          timestamp: new Date().toISOString(),
          checks,
          errors,
          warnings,
        } as HealthCheckResult),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
    checks.secretKeyPresent = true;

    // 2. Check key format
    if (!stripeKey.startsWith("sk_test_") && !stripeKey.startsWith("sk_live_")) {
      errors.push("STRIPE_SECRET_KEY format invalid (must start with 'sk_test_' or 'sk_live_')");
      return new Response(
        JSON.stringify({
          healthy: false,
          timestamp: new Date().toISOString(),
          checks,
          errors,
          warnings,
        } as HealthCheckResult),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
    checks.secretKeyFormatValid = true;

    // 3. Initialize Stripe client
    let stripe: Stripe;
    try {
      stripe = getStripeClient();
      checks.stripeClientInitialized = true;
    } catch (error: any) {
      errors.push(`Stripe client initialization failed: ${error?.message || "Unknown error"}`);
      return new Response(
        JSON.stringify({
          healthy: false,
          timestamp: new Date().toISOString(),
          checks,
          errors,
          warnings,
        } as HealthCheckResult),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // 4. Test API reachability (ping products endpoint)
    try {
      await stripe.products.list({ limit: 1 });
      checks.apiReachable = true;
    } catch (error: any) {
      errors.push(`Stripe API unreachable: ${error?.message || "Unknown error"}`);
    }

    // 5. Test prices loadability
    try {
      await stripe.prices.list({ limit: 1 });
      checks.pricesLoadable = true;
    } catch (error: any) {
      errors.push(`Stripe prices endpoint unreachable: ${error?.message || "Unknown error"}`);
    }

    // 6. Check price IDs configuration
    const priceIdValidation = validateStripePriceIds();
    if (!priceIdValidation.valid) {
      warnings.push(`Missing price IDs: ${priceIdValidation.missing.join(", ")}`);
    } else {
      checks.priceIdsConfigured = true;
    }

    const healthy = errors.length === 0;

    return new Response(
      JSON.stringify({
        healthy,
        timestamp: new Date().toISOString(),
        checks,
        errors,
        warnings,
      } as HealthCheckResult),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: healthy ? 200 : 500,
      }
    );
  } catch (error: any) {
    errors.push(`Health check exception: ${error?.message || "Unknown error"}`);
    return new Response(
      JSON.stringify({
        healthy: false,
        timestamp: new Date().toISOString(),
        checks,
        errors,
        warnings,
      } as HealthCheckResult),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

