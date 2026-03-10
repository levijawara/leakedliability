import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

/**
 * Shared authentication helpers for edge functions.
 * Provides internal secret validation and JWT verification.
 */

/**
 * Validates x-internal-secret header (for cron/internal functions).
 * Returns a 401 Response if invalid, or null if valid.
 */
export function requireInternalSecret(
  req: Request,
  corsHeaders: Record<string, string>
): Response | null {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== Deno.env.get("INTERNAL_SECRET")) {
    console.warn("[AUTH] Internal secret validation failed");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  return null;
}

/**
 * Validates either x-internal-secret OR a valid user JWT.
 * Use for functions callable by both frontend (JWT) and other edge functions (secret).
 */
export async function requireInternalSecretOrJwt(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<{ authorized: boolean; userId?: string; response?: Response }> {
  // 1. Check internal secret
  const secret = req.headers.get("x-internal-secret");
  if (secret && secret === Deno.env.get("INTERNAL_SECRET")) {
    return { authorized: true, userId: "internal" };
  }

  // 2. Check JWT
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return {
        authorized: false,
        response: new Response(
          JSON.stringify({ error: "Unauthorized: invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        ),
      };
    }

    return { authorized: true, userId: data.user.id };
  } catch {
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({ error: "Unauthorized: token validation failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }
}

/**
 * Returns headers with x-internal-secret for edge-to-edge calls.
 */
export function internalHeaders(): Record<string, string> {
  return { "x-internal-secret": Deno.env.get("INTERNAL_SECRET") || "" };
}
