import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const config = { verify_jwt: true };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Lowercase, trim, collapse whitespace, strip extension for matching */
function normalizeFilename(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[_:\/\\]/g, "-") // normalize colons, underscores, slashes to dashes
    .replace(/\.[^.]+$/, ""); // strip .pdf / .json
}

/** Try to parse human-readable date strings into YYYY-MM-DD */
function tryParseDate(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  // Strip ordinal suffixes: 1st, 2nd, 3rd, 4th, 15th, etc.
  const cleaned = raw.trim().replace(/(\d+)(st|nd|rd|th)/gi, "$1");
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) {
    console.log(`[import-parsed-contacts] Could not parse date: "${raw}"`);
    return null;
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Common single-word role labels that are NOT real names */
const ROLE_KEYWORDS = new Set([
  "video", "photo", "photographer", "audio", "grip", "electric",
  "wardrobe", "makeup", "hair", "art", "craft", "catering",
  "transport", "locations", "production", "camera", "lighting",
  "steadi", "steadicam", "teleprompter", "drone", "fx", "vfx",
  "editor", "director", "producer", "talent", "model", "stylist",
  "pa", "ac", "dit", "hmua", "mua",
]);

function looksLikeRoleLabel(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  // Multi-word names are almost certainly real names
  if (trimmed.includes(" ")) return false;
  return ROLE_KEYWORDS.has(trimmed.toLowerCase());
}

interface ClaudeContact {
  name?: string;
  role?: string;
  department?: string;
  phone?: string;
  email?: string;
  call_time?: string;
}

interface ClaudeJSON {
  source_file: string;
  production_info?: {
    production_name?: string;
    date?: string;
    [key: string]: unknown;
  };
  crew?: ClaudeContact[];
  [key: string]: unknown;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[import-parsed-contacts] start");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Parse body
    const { files, force = false } = await req.json();

    if (!Array.isArray(files) || files.length === 0) {
      return new Response(
        JSON.stringify({ error: "files must be a non-empty array of Claude JSON objects" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (files.length > 50) {
      return new Response(
        JSON.stringify({ error: "Max 50 files per request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[import-parsed-contacts] Processing ${files.length} files, force=${force}`);

    // Build a lookup of normalized source_file → Claude JSON
    const fileMap = new Map<string, ClaudeJSON>();
    for (const f of files as ClaudeJSON[]) {
      if (!f.source_file) continue;
      const key = normalizeFilename(f.source_file);
      fileMap.set(key, f);
    }

    // Fetch matching global_call_sheets rows
    const { data: sheets, error: fetchErr } = await supabase
      .from("global_call_sheets")
      .select("id, original_file_name, status, parsed_contacts");

    if (fetchErr) {
      console.error("[import-parsed-contacts] fetch error:", fetchErr);
      throw fetchErr;
    }

    let matched = 0;
    let skippedAlreadyParsed = 0;
    let updated = 0;
    const unmatched: string[] = [];
    const errors: string[] = [];

    // Build index of DB rows by normalized filename
    const sheetByName = new Map<string, { id: string; status: string | null; parsed_contacts: unknown }>();
    for (const s of sheets || []) {
      const key = normalizeFilename(s.original_file_name);
      sheetByName.set(key, s);
    }

    // Process each file
    for (const [normalizedSource, claudeData] of fileMap.entries()) {
      const sheet = sheetByName.get(normalizedSource);

      if (!sheet) {
        unmatched.push(claudeData.source_file);
        continue;
      }

      matched++;

      // Skip if already parsed (unless force)
      if (!force && sheet.status === "parsed" && sheet.parsed_contacts) {
        skippedAlreadyParsed++;
        continue;
      }

      // Transform contacts
      const crew = claudeData.crew || [];
      const parsedContacts = [];

      for (const c of crew) {
        if (!c.name || !c.name.trim()) continue;

        const needsReview = looksLikeRoleLabel(c.name);

        parsedContacts.push({
          name: c.name.trim(),
          roles: c.role ? [c.role.trim()] : [],
          departments: c.department ? [c.department.trim()] : [],
          phones: c.phone ? [c.phone.trim()] : [],
          emails: c.email ? [c.email.trim().toLowerCase()] : [],
          confidence: 1.0,
          needs_review: needsReview,
          ig_handle: null,
        });
      }

      // Extract metadata
      const parsedDate = claudeData.production_info?.date || null;
      const projectTitle = claudeData.production_info?.production_name || null;
      const safeParsedDate = tryParseDate(parsedDate);

      // Update the row
      const { error: updateErr } = await supabase
        .from("global_call_sheets")
        .update({
          parsed_contacts: parsedContacts,
          contacts_extracted: parsedContacts.length,
          status: "parsed",
          parsed_date: safeParsedDate,
          project_title: projectTitle,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sheet.id);

      if (updateErr) {
        console.error(`[import-parsed-contacts] update error for ${claudeData.source_file}:`, updateErr);
        errors.push(`${claudeData.source_file}: ${updateErr.message}`);
      } else {
        updated++;
      }
    }

    console.log(
      `[import-parsed-contacts] Done: ${matched} matched, ${updated} updated, ${skippedAlreadyParsed} skipped (already parsed), ${unmatched.length} unmatched`
    );

    return new Response(
      JSON.stringify({
        success: true,
        matched,
        updated,
        skipped_already_parsed: skippedAlreadyParsed,
        unmatched,
        errors: errors.slice(0, 20),
        total_files: files.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[import-parsed-contacts] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
