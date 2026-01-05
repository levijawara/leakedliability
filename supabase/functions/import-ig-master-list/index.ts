import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const config = { verify_jwt: true };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normalization utilities
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.toLowerCase().trim();
}

function stripInstagramHandle(handle: string): string {
  return handle.replace(/^@/, '').toLowerCase().trim();
}

function uniqueArray(arr: (string | null | undefined)[]): string[] {
  return [...new Set(arr.filter((v): v is string => !!v && v.trim() !== ''))];
}

function mergeArrays(existing: string[], incoming: string[]): string[] {
  return uniqueArray([...existing, ...incoming]);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[import-ig-master-list] Starting import...");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { contacts, source = "levi_seed_v1" } = await req.json();

    if (!Array.isArray(contacts)) {
      return new Response(JSON.stringify({ error: "contacts must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[import-ig-master-list] Processing ${contacts.length} contacts...`);

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const contact of contacts) {
      try {
        // Validate required fields
        if (!contact.instagram || !contact.name) {
          skipped++;
          continue;
        }

        const instagram = stripInstagramHandle(contact.instagram);
        const rawName = contact.name.trim();
        const normalizedName = normalizeName(rawName);

        // Parse roles
        const roles = uniqueArray(
          typeof contact.roles === 'string'
            ? contact.roles.split(',').map((r: string) => r.trim())
            : Array.isArray(contact.roles)
            ? contact.roles
            : []
        );

        // Parse phones
        const phones = uniqueArray(
          (typeof contact.phone === 'string' ? [contact.phone] : Array.isArray(contact.phone) ? contact.phone : [])
            .map((p: string) => normalizePhone(p))
        );

        // Parse emails
        const emails = uniqueArray(
          (typeof contact.email === 'string' ? [contact.email] : Array.isArray(contact.email) ? contact.email : [])
            .map((e: string) => normalizeEmail(e))
        );

        // Check if IG already exists
        const { data: existing } = await supabase
          .from("ig_master_identities")
          .select("*")
          .eq("instagram", instagram)
          .maybeSingle();

        if (existing) {
          // Merge arrays
          const mergedRoles = mergeArrays(existing.roles || [], roles);
          const mergedPhones = mergeArrays(existing.phones || [], phones);
          const mergedEmails = mergeArrays(existing.emails || [], emails);
          const mergedSources = mergeArrays(existing.sources || [], [source]);

          await supabase
            .from("ig_master_identities")
            .update({
              roles: mergedRoles,
              phones: mergedPhones,
              emails: mergedEmails,
              sources: mergedSources,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          updated++;
        } else {
          // Insert new record
          await supabase.from("ig_master_identities").insert({
            raw_name: rawName,
            normalized_name: normalizedName,
            instagram,
            roles,
            phones,
            emails,
            sources: [source],
          });

          imported++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`${contact.name || 'Unknown'}: ${errorMsg}`);
      }
    }

    console.log(`[import-ig-master-list] Complete: ${imported} imported, ${updated} updated, ${skipped} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        updated,
        skipped,
        errors: errors.slice(0, 10), // Return first 10 errors
        total: contacts.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[import-ig-master-list] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
