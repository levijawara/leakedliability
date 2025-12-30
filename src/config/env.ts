/**
 * Environment variable validation
 * Single source of truth for required environment variables
 */

export type EnvStatus =
  | { ok: true }
  | { ok: false; missing: string[] };

export type EnvValidationResult =
  | { valid: true }
  | { valid: false; issues: string[] };

/**
 * Validates that all required environment variables are present
 * @returns EnvStatus indicating whether validation passed and which vars are missing
 */
export function validateEnv(): EnvStatus {
  const missing: string[] = [];

  if (!import.meta.env.VITE_SUPABASE_URL) {
    missing.push("VITE_SUPABASE_URL");
  }

  if (!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");
  }

  // Note: VITE_STRIPE_PUBLISHABLE_KEY is optional - only needed for payment features
  // We validate it separately to warn but not block the app

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  return { ok: true };
}

/**
 * Validates that environment variables are not just present, but have valid formats
 * @returns EnvValidationResult indicating if env vars look correct
 */
export function validateEnvFormats(): EnvValidationResult {
  const issues: string[] = [];

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  // Check URL format
  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl);
      if (!url.protocol.startsWith('http')) {
        issues.push("VITE_SUPABASE_URL must be a valid HTTP/HTTPS URL");
      }
      if (!supabaseUrl.includes('.supabase.co')) {
        issues.push("VITE_SUPABASE_URL doesn't appear to be a Supabase URL (should contain '.supabase.co')");
      }
    } catch {
      issues.push("VITE_SUPABASE_URL is not a valid URL format");
    }
  }

  // Check key format
  if (supabaseKey) {
    // Supabase anon keys are typically long base64-like strings
    // They're usually at least 100 characters
    if (supabaseKey.length < 50) {
      issues.push("VITE_SUPABASE_PUBLISHABLE_KEY appears too short (should be ~100+ characters)");
    }
    // Check if it looks like it might be a service role key (starts with wrong prefix)
    if (supabaseKey.includes('service_role') || supabaseKey.startsWith('eyJ')) {
      // This is just a warning, not a hard failure - could be valid
      console.warn("[ENV VALIDATION] VITE_SUPABASE_PUBLISHABLE_KEY format warning - ensure this is the anon/public key, not service_role");
    }
  }

  // Check Stripe key format
  if (stripeKey) {
    // Stripe publishable keys start with pk_test_ or pk_live_
    if (!stripeKey.startsWith('pk_test_') && !stripeKey.startsWith('pk_live_')) {
      issues.push("VITE_STRIPE_PUBLISHABLE_KEY doesn't appear to be a valid Stripe key (should start with 'pk_test_' or 'pk_live_')");
    }
    if (stripeKey.length < 50) {
      issues.push("VITE_STRIPE_PUBLISHABLE_KEY appears too short");
    }
  } else {
    // Stripe key is missing - this is a warning, not an error
    // Payment features will be broken, but app can still work
    console.warn("[ENV VALIDATION] VITE_STRIPE_PUBLISHABLE_KEY is missing - payment features will not work");
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  return { valid: true };
}

/**
 * Validates Stripe configuration
 * @returns Object indicating if Stripe is properly configured
 */
export function validateStripeConfig(): {
  configured: boolean;
  key?: string;
  issues?: string[];
} {
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const issues: string[] = [];

  if (!stripeKey) {
    return {
      configured: false,
      issues: ["VITE_STRIPE_PUBLISHABLE_KEY is missing"]
    };
  }

  if (!stripeKey.startsWith('pk_test_') && !stripeKey.startsWith('pk_live_')) {
    issues.push("Key doesn't start with 'pk_test_' or 'pk_live_'");
  }

  if (stripeKey.length < 50) {
    issues.push("Key appears too short");
  }

  if (issues.length > 0) {
    return {
      configured: false,
      key: stripeKey,
      issues
    };
  }

  return {
    configured: true,
    key: stripeKey
  };
}

/**
 * Tests if Supabase client can actually connect to the configured instance
 * This is async and should be called after client initialization
 * @param supabaseClient - The Supabase client instance to test
 * @returns Promise indicating if connection test passed
 */
export async function testSupabaseConnection(supabaseClient: any): Promise<{
  connected: boolean;
  error?: string;
  details?: string;
}> {
  if (!supabaseClient) {
    return {
      connected: false,
      error: "Supabase client is null",
      details: "Client was not initialized (likely missing env vars)"
    };
  }

  try {
    // Try a lightweight query that should work for anonymous users
    // Using a simple SELECT that doesn't require auth
    const { error, data } = await supabaseClient
      .from('site_settings')
      .select('maintenance_mode')
      .limit(1)
      .maybeSingle();

    // If we get an error, check what kind
    if (error) {
      const errorMsg = error.message?.toLowerCase() || '';
      const errorCode = error.code || '';

      // Network/connection errors
      if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('failed to fetch')) {
        return {
          connected: false,
          error: "Cannot reach Supabase server",
          details: `Network error: ${error.message}. Check if VITE_SUPABASE_URL is correct.`
        };
      }

      // Authentication/authorization errors are OK - it means we connected but don't have permission
      // This is expected for anonymous users
      if (errorMsg.includes('row-level security') || errorMsg.includes('permission denied') || errorCode === '42501') {
        // Actually connected, just no permission - this is fine for anonymous users
        return { connected: true };
      }

      // URL/configuration errors
      if (errorMsg.includes('invalid url') || errorMsg.includes('url malformed')) {
        return {
          connected: false,
          error: "Invalid Supabase URL",
          details: `URL format error: ${error.message}. Check VITE_SUPABASE_URL.`
        };
      }

      // API key errors
      if (errorMsg.includes('api key') || errorMsg.includes('apikey') || errorCode === 'PGRST301') {
        return {
          connected: false,
          error: "Invalid Supabase API key",
          details: `API key error: ${error.message}. Check VITE_SUPABASE_PUBLISHABLE_KEY.`
        };
      }

      // Other errors - might still be connected, just this query failed
      console.warn("[SUPABASE CONNECTION TEST] Query failed but connection may be OK:", error);
      // If we got an error but it's not a connection error, assume we're connected
      // (could just be RLS or table doesn't exist)
      return { connected: true };
    }

    // Success - we got data or null (both mean connection worked)
    return { connected: true };

  } catch (err: any) {
    // Network/fetch errors
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return {
        connected: false,
        error: "Network connection failed",
        details: `Cannot connect to Supabase: ${err.message}. Verify VITE_SUPABASE_URL is reachable.`
      };
    }

    // Other unexpected errors
    return {
      connected: false,
      error: "Connection test failed",
      details: err?.message || "Unknown error during connection test"
    };
  }
}

