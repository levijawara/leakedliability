import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimitByIp } from "../_shared/rateLimit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEOIP_API_KEY = Deno.env.get("GEOIP_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (!xff) return null;
  return xff.split(",")[0].trim();
}

async function hashVisitor(ip: string, ua: string, day: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}|${ua}|${day}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function lookupGeo(ip: string) {
  if (!GEOIP_API_KEY) {
    return { country: null, region: null, city: null };
  }

  try {
    const res = await fetch(`https://ipinfo.io/${ip}?token=${GEOIP_API_KEY}`);
    if (!res.ok) throw new Error("geoip failed");
    const data = await res.json();
    return {
      country: data.country ?? null,
      region: data.region ?? null,
      city: data.city ?? null,
    };
  } catch (err) {
    console.error("[track-visit] Geo lookup failed:", err);
    return { country: null, region: null, city: null };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit: 1 request per IP per minute
  const limited = rateLimitByIp(req, 1, 60000, corsHeaders);
  if (limited) return limited;

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const ip = getClientIp(req);
    const ua = req.headers.get("user-agent") ?? "unknown";

    if (!ip) {
      return new Response(JSON.stringify({ success: false, reason: "no_ip" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const day = now.toISOString().slice(0, 10);

    const hashedVisitor = await hashVisitor(ip, ua, day);
    const geo = await lookupGeo(ip);

    console.log(`[track-visit] Tracking visitor for ${day}, geo: ${geo.city}, ${geo.region}, ${geo.country}`);

    const { error } = await supabase
      .from("analytics_daily_visitors")
      .insert({
        day,
        hashed_visitor: hashedVisitor,
        country: geo.country,
        region: geo.region,
        city: geo.city,
      });

    if (error && !error.message.includes("duplicate key")) {
      console.error("[track-visit] Insert error:", error);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[track-visit] Unexpected error:", err);
    return new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
