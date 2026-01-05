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
    console.log("[update-ig-master-list] Processing update...");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
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

    // Parse request body
    const {
      instagram_handle,
      contact_name,
      roles = [],
      phones = [],
      emails = [],
      source = "unknown",
    } = await req.json();

    if (!instagram_handle || !contact_name) {
      return new Response(
        JSON.stringify({ error: "instagram_handle and contact_name are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const instagram = stripInstagramHandle(instagram_handle);
    const rawName = contact_name.trim();
    const normalizedName = normalizeName(rawName);

    // Normalize incoming data
    const normalizedRoles = uniqueArray(roles);
    const normalizedPhones = uniqueArray(
      (Array.isArray(phones) ? phones : [phones])
        .map((p: string) => normalizePhone(p))
        .filter((p): p is string => !!p)
    );
    const normalizedEmails = uniqueArray(
      (Array.isArray(emails) ? emails : [emails])
        .map((e: string) => normalizeEmail(e))
        .filter((e): e is string => !!e)
    );

    // Check if IG already exists
    const { data: existing } = await supabase
      .from("ig_master_identities")
      .select("*")
      .eq("instagram", instagram)
      .maybeSingle();

    let action: "created" | "updated";
    let recordId: string;

    if (existing) {
      // Merge arrays
      const mergedRoles = mergeArrays(existing.roles || [], normalizedRoles);
      const mergedPhones = mergeArrays(existing.phones || [], normalizedPhones);
      const mergedEmails = mergeArrays(existing.emails || [], normalizedEmails);
      const mergedSources = mergeArrays(existing.sources || [], [source]);

      // Update name if incoming is more complete (more words)
      const existingWordCount = existing.raw_name.split(' ').length;
      const incomingWordCount = rawName.split(' ').length;
      const shouldUpdateName = incomingWordCount > existingWordCount;

      const { error: updateError } = await supabase
        .from("ig_master_identities")
        .update({
          ...(shouldUpdateName ? { raw_name: rawName, normalized_name: normalizedName } : {}),
          roles: mergedRoles,
          phones: mergedPhones,
          emails: mergedEmails,
          sources: mergedSources,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) throw updateError;

      action = "updated";
      recordId = existing.id;
      console.log(`[update-ig-master-list] Updated existing record for @${instagram}`);
    } else {
      // Insert new record
      const { data: inserted, error: insertError } = await supabase
        .from("ig_master_identities")
        .insert({
          raw_name: rawName,
          normalized_name: normalizedName,
          instagram,
          roles: normalizedRoles,
          phones: normalizedPhones,
          emails: normalizedEmails,
          sources: [source],
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      action = "created";
      recordId = inserted.id;
      console.log(`[update-ig-master-list] Created new record for @${instagram}`);
    }

    return new Response(
      JSON.stringify({ success: true, action, id: recordId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[update-ig-master-list] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
