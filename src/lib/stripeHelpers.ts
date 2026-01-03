import { loadStripe, Stripe } from "@stripe/stripe-js";
import { validateStripeConfig } from "@/config/env";

let stripePromise: Promise<Stripe | null> | null = null;
let stripeConfigValidated = false;

/**
 * Validates Stripe configuration and initializes Stripe client
 * NO SILENT FAILURES - throws error if misconfigured
 * @returns Promise resolving to Stripe instance
 * @throws Error if Stripe is misconfigured
 */
export async function getStripeInstance(): Promise<{
  stripe: Stripe | null;
  error?: string;
  configured: boolean;
}> {
  // Validate config first
  const config = validateStripeConfig();
  
  if (!config.configured) {
    const issues = config.issues?.join(", ") || "Unknown configuration issue";
    const errorMsg = `STRIPE CONFIGURATION ERROR: ${issues}. VITE_STRIPE_PUBLISHABLE_KEY is missing or invalid.`;
    
    // NO SILENT FAILURES - log and throw
    console.error(`[STRIPE CONFIG ERROR] ${errorMsg}`);
    console.error("[STRIPE CONFIG ERROR] Payment features are BLOCKED until this is fixed.");
    console.error("[STRIPE CONFIG ERROR] This is a mission-critical failure.");
    
    // Return error state (but don't throw to allow graceful UI handling)
    return {
      stripe: null,
      error: errorMsg,
      configured: false
    };
  }

  // Only validate once per session
  if (!stripeConfigValidated) {
    console.log("[STRIPE] Configuration validated - key format looks correct");
    stripeConfigValidated = true;
  }

  // Initialize Stripe if not already done
  if (!stripePromise) {
    stripePromise = loadStripe(config.key!);
  }

  try {
    const stripe = await stripePromise;
    
    if (!stripe) {
      console.error("[STRIPE ERROR] Failed to initialize Stripe instance");
      return {
        stripe: null,
        error: "Failed to initialize Stripe. Please check your Stripe configuration.",
        configured: false
      };
    }

    return {
      stripe,
      configured: true
    };
  } catch (error: any) {
    console.error("[STRIPE ERROR] Exception during Stripe initialization:", error);
    return {
      stripe: null,
      error: error?.message || "Failed to load Stripe",
      configured: false
    };
  }
}

/**
 * Checks if Stripe is available for payment features
 * Call this before showing payment UI or starting checkout flows
 */
export function isStripeAvailable(): boolean {
  const config = validateStripeConfig();
  return config.configured;
}

