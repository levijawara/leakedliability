import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactToEnrich {
  contactId: string;
  name: string;
  igHandle?: string | null;
}

interface EnrichResult {
  contactId: string;
  name: string;
  novaUrl: string | null;
  method: "ig_handle" | "firecrawl_search" | "not_found";
  error?: string;
}

// Normalize IG handle to potential NOVA username
function normalizeUsername(handle: string): string {
  return handle.toLowerCase().replace(/[^a-z0-9_.]/g, "");
}

// Check if a NOVA profile URL is valid (returns 200)
async function checkNovaProfile(username: string): Promise<boolean> {
  try {
    const url = `https://itsnova.com/profile/${username}`;
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

// Use Firecrawl search to find NOVA profile by name
async function searchNovaProfile(name: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `"${name}" site:itsnova.com/profile`,
        limit: 3,
      }),
    });

    if (!response.ok) {
      console.error(`[enrich-nova] Firecrawl search failed for "${name}":`, response.status);
      return null;
    }

    const data = await response.json();
    
    // Look for profile URLs in results
    if (data.data && Array.isArray(data.data)) {
      for (const result of data.data) {
        const url = result.url || result.sourceUrl;
        if (url && url.includes("itsnova.com/profile/")) {
          return url;
        }
      }
    }
    
    return null;
  } catch (err) {
    console.error(`[enrich-nova] Firecrawl search error for "${name}":`, err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[enrich-nova] start");

    // Get Firecrawl API key
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      console.error("[enrich-nova] FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl connector not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client for user verification
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const contacts: ContactToEnrich[] = body.contacts || [];
    const dryRun = body.dryRun === true;

    if (!contacts.length) {
      return new Response(
        JSON.stringify({ success: false, error: "No contacts provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[enrich-nova] Processing ${contacts.length} contacts, dryRun=${dryRun}`);

    const results: EnrichResult[] = [];
    let updated = 0;
    let notFound = 0;

    for (const contact of contacts) {
      const result: EnrichResult = {
        contactId: contact.contactId,
        name: contact.name,
        novaUrl: null,
        method: "not_found",
      };

      try {
        // Method 1: Try IG handle as NOVA username
        if (contact.igHandle) {
          const username = normalizeUsername(contact.igHandle);
          console.log(`[enrich-nova] Trying IG handle "${username}" for ${contact.name}`);
          
          const exists = await checkNovaProfile(username);
          if (exists) {
            result.novaUrl = `https://itsnova.com/profile/${username}`;
            result.method = "ig_handle";
            console.log(`[enrich-nova] Found via IG handle: ${result.novaUrl}`);
          }
        }

        // Method 2: Firecrawl search (if IG handle didn't work)
        if (!result.novaUrl) {
          console.log(`[enrich-nova] Searching Firecrawl for "${contact.name}"`);
          const searchUrl = await searchNovaProfile(contact.name, firecrawlKey);
          if (searchUrl) {
            result.novaUrl = searchUrl;
            result.method = "firecrawl_search";
            console.log(`[enrich-nova] Found via search: ${result.novaUrl}`);
          }
        }

        // Update database if we found a URL
        if (result.novaUrl && !dryRun) {
          const { error: updateError } = await adminClient
            .from("crew_contacts")
            .update({ nova_profile_url: result.novaUrl })
            .eq("id", contact.contactId);

          if (updateError) {
            result.error = updateError.message;
            console.error(`[enrich-nova] Update failed for ${contact.name}:`, updateError);
          } else {
            updated++;
          }
        }

        if (!result.novaUrl) {
          notFound++;
        }
      } catch (err) {
        result.error = err instanceof Error ? err.message : "Unknown error";
        console.error(`[enrich-nova] Error processing ${contact.name}:`, err);
      }

      results.push(result);
    }

    console.log(`[enrich-nova] Complete. Updated: ${updated}, Not found: ${notFound}`);

    // Log audit entry
    if (!dryRun && updated > 0) {
      await adminClient.from("audit_logs").insert({
        action: "nova_profile_enrichment",
        user_id: user.id,
        details: { contactsProcessed: contacts.length, updated, notFound },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        summary: {
          total: contacts.length,
          updated,
          notFound,
        },
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[enrich-nova] Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
