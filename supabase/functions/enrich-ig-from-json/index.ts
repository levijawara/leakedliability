import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// NORMALIZATION FUNCTIONS
// ============================================================================

function normalizePhone(phone: number | string | null | undefined): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.substring(1);
  }
  return digits.length === 10 ? digits : null;
}

function normalizeEmails(email: string | null | undefined): string[] {
  if (!email) return [];
  return email
    .split(/[;,]/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

function normalizeInstagram(ig: string | null | undefined): string | null {
  if (!ig) return null;
  const trimmed = ig.trim();
  return trimmed === "" ? null : trimmed;
}

// ============================================================================
// TYPES
// ============================================================================

interface JsonContact {
  Name: string;
  Email: string;
  Phone: number | string;
  Roles: string;
  Departments: string;
  Instagram: string;
  Project: string;
  Favorite: string;
}

interface DbContact {
  id: string;
  name: string | null;
  phones: string[] | null;
  emails: string[] | null;
  ig_handle: string | null;
}

interface MatchResult {
  id: string;
  name: string;
  old_ig_handle: string | null;
  new_ig_handle: string;
  match_method: "phone" | "email";
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry_run") === "true";

    // Initialize admin client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse JSON body
    const jsonContacts: JsonContact[] = await req.json();
    if (!Array.isArray(jsonContacts)) {
      return new Response(JSON.stringify({ error: "Expected array of contacts" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[enrich-ig-from-json] Processing ${jsonContacts.length} contacts, dry_run=${dryRun}`);

    // Fetch all contacts from database
    const { data: dbContacts, error: fetchError } = await supabaseAdmin
      .from("crew_contacts")
      .select("id, name, phones, emails, ig_handle");

    if (fetchError) {
      console.error("[enrich-ig-from-json] Failed to fetch contacts:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch contacts" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contacts = dbContacts as DbContact[];
    console.log(`[enrich-ig-from-json] Loaded ${contacts.length} contacts from database`);

    // Build indexes for fast lookup
    const byPhone = new Map<string, DbContact[]>();
    const byEmail = new Map<string, DbContact[]>();

    for (const contact of contacts) {
      // Index by phone
      if (contact.phones) {
        for (const phone of contact.phones) {
          const normalized = normalizePhone(phone);
          if (normalized) {
            if (!byPhone.has(normalized)) byPhone.set(normalized, []);
            byPhone.get(normalized)!.push(contact);
          }
        }
      }
      // Index by email
      if (contact.emails) {
        for (const email of contact.emails) {
          const normalized = email.trim().toLowerCase();
          if (!byEmail.has(normalized)) byEmail.set(normalized, []);
          byEmail.get(normalized)!.push(contact);
        }
      }
    }

    console.log(`[enrich-ig-from-json] Index built: ${byPhone.size} phones, ${byEmail.size} emails`);

    // Process JSON contacts
    const stats = {
      total_json_contacts: jsonContacts.length,
      skipped_no_ig: 0,
      matches_found: 0,
      matches_phone: 0,
      matches_email: 0,
      updates_performed: 0,
      skipped_existing_ig: 0,
      no_matches: 0,
    };

    const updates: MatchResult[] = [];

    for (const jsonContact of jsonContacts) {
      const igHandle = normalizeInstagram(jsonContact.Instagram);
      if (!igHandle) {
        stats.skipped_no_ig++;
        continue;
      }

      const normalizedPhone = normalizePhone(jsonContact.Phone);
      const normalizedEmails = normalizeEmails(jsonContact.Email);

      let matchingContacts: DbContact[] = [];
      let matchMethod: "phone" | "email" | null = null;

      // Try phone match first
      if (normalizedPhone) {
        matchingContacts = byPhone.get(normalizedPhone) || [];
        if (matchingContacts.length > 0) {
          matchMethod = "phone";
          stats.matches_phone++;
        }
      }

      // Fallback to email
      if (matchingContacts.length === 0 && normalizedEmails.length > 0) {
        const emailMatches = new Set<DbContact>();
        for (const email of normalizedEmails) {
          const contacts = byEmail.get(email) || [];
          contacts.forEach((c) => emailMatches.add(c));
        }
        matchingContacts = Array.from(emailMatches);
        if (matchingContacts.length > 0) {
          matchMethod = "email";
          stats.matches_email++;
        }
      }

      if (matchingContacts.length > 0) {
        // Deduplicate by ID
        const uniqueContacts = new Map<string, DbContact>();
        matchingContacts.forEach((c) => uniqueContacts.set(c.id, c));

        stats.matches_found += uniqueContacts.size;

        for (const contact of uniqueContacts.values()) {
          // Only update if ig_handle is empty
          const canUpdate = !contact.ig_handle || contact.ig_handle.trim() === "";

          if (canUpdate) {
            updates.push({
              id: contact.id,
              name: contact.name || "Unknown",
              old_ig_handle: contact.ig_handle,
              new_ig_handle: igHandle,
              match_method: matchMethod!,
            });
            stats.updates_performed++;
          } else {
            stats.skipped_existing_ig++;
          }
        }
      } else {
        stats.no_matches++;
      }
    }

    // Perform updates if not dry run
    if (!dryRun && updates.length > 0) {
      console.log(`[enrich-ig-from-json] Performing ${updates.length} updates`);

      for (const update of updates) {
        const { error: updateError } = await supabaseAdmin
          .from("crew_contacts")
          .update({ ig_handle: update.new_ig_handle })
          .eq("id", update.id);

        if (updateError) {
          console.error(`[enrich-ig-from-json] Failed to update ${update.id}:`, updateError);
        }
      }

      // Log to audit
      await supabaseAdmin.from("audit_logs").insert({
        user_id: user.id,
        event_type: "enrich_ig_from_json",
        payload: {
          dry_run: false,
          stats,
          sample_updates: updates.slice(0, 10),
        },
      });
    }

    const response = {
      success: true,
      dry_run: dryRun,
      stats,
      sample_updates: updates.slice(0, 10),
      message: dryRun
        ? `Dry run complete. Would update ${stats.updates_performed} contacts.`
        : `Updated ${stats.updates_performed} contacts with Instagram handles.`,
    };

    console.log(`[enrich-ig-from-json] Complete:`, JSON.stringify(stats));

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[enrich-ig-from-json] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
