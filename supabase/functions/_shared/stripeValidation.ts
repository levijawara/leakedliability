/**
 * Stripe Server-Side Validation
 * Mission-critical guardrails for edge functions
 */

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

/**
 * Validates and returns Stripe secret key
 * THROWS ERROR if missing (no silent failures)
 */
export function getStripeSecretKey(): string {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  
  if (!stripeKey) {
    const errorMsg = "STRIPE_SECRET_KEY is not set. This is a mission-critical failure.";
    console.error(`[STRIPE VALIDATION ERROR] ${errorMsg}`);
    console.error("[STRIPE VALIDATION ERROR] Edge function cannot proceed without Stripe secret key.");
    throw new Error(errorMsg);
  }

  // Validate key format
  if (!stripeKey.startsWith("sk_test_") && !stripeKey.startsWith("sk_live_")) {
    const errorMsg = "STRIPE_SECRET_KEY does not appear to be a valid Stripe key (must start with 'sk_test_' or 'sk_live_').";
    console.error(`[STRIPE VALIDATION ERROR] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // Log key presence (never log the actual key value)
  const mode = stripeKey.startsWith("sk_test_") ? "test" : "live";
  console.log(`[STRIPE VALIDATION] Secret key present (${mode} mode)`);

  return stripeKey;
}

/**
 * Initializes Stripe client with validation
 * THROWS ERROR if misconfigured
 */
export function getStripeClient(): Stripe {
  const stripeKey = getStripeSecretKey();
  
  try {
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2022-11-15",
    });
    return stripe;
  } catch (error: any) {
    const errorMsg = `Failed to initialize Stripe client: ${error?.message || "Unknown error"}`;
    console.error(`[STRIPE VALIDATION ERROR] ${errorMsg}`);
    throw new Error(errorMsg);
  }
}

/**
 * Validates that required Stripe price IDs are configured
 */
export function validateStripePriceIds(): {
  valid: boolean;
  missing: string[];
} {
  const requiredPriceIds = [
    "STRIPE_CREW_T1_MONTHLY_PRICE_ID",
    "STRIPE_CREW_T1_ANNUAL_PRICE_ID",
    "STRIPE_PRODUCER_T1_MONTHLY_PRICE_ID",
    "STRIPE_PRODUCER_T1_ANNUAL_PRICE_ID",
    "STRIPE_PRODUCER_T2_MONTHLY_PRICE_ID",
    "STRIPE_PRODUCER_T2_ANNUAL_PRICE_ID",
  ];

  const missing: string[] = [];

  for (const envKey of requiredPriceIds) {
    const value = Deno.env.get(envKey);
    if (!value) {
      missing.push(envKey);
      console.error(`[STRIPE VALIDATION ERROR] Missing required price ID: ${envKey}`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

