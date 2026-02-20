/**
 * In-memory rate limiter by IP address.
 * State resets on edge function cold-start (acceptable for abuse prevention).
 */

const ipCounts = new Map<string, { count: number; resetAt: number }>();

/** Extract client IP from x-forwarded-for header. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

/**
 * Returns a 429 Response if the IP exceeds the rate limit, or null if allowed.
 * @param req - The incoming request
 * @param maxRequests - Max requests per window
 * @param windowMs - Window size in milliseconds (default: 60000 = 1 minute)
 * @param corsHeaders - CORS headers to include in the response
 */
export function rateLimitByIp(
  req: Request,
  maxRequests: number,
  windowMs: number,
  corsHeaders: Record<string, string>
): Response | null {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = ipCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    console.warn(`[RATE_LIMIT] IP ${ip.substring(0, 8)}... exceeded ${maxRequests}/${windowMs}ms`);
    return new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return null;
}
