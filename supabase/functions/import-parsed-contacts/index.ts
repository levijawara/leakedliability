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
    .replace(/["""'']/g, "")
    .replace(/\s+/g, " ")
    .replace(/[_:\/\\]/g, "-")
    .replace(/\.[^.]+$/, "");
}

/** Try to parse human-readable date strings into YYYY-MM-DD */
function tryParseDate(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
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

/** Returns true if the value is a placeholder like "(empty)" */
function isPlaceholder(v: string | null | undefined): boolean {
  if (!v) return true;
  const t = v.trim().toLowerCase();
  return !t || t === "(empty)" || t === "empty" || t === "n/a" || t === "none" || t === "tbd";
}

function looksLikeRoleLabel(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
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

interface ParsedContact {
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  confidence: number;
  needs_review: boolean;
  ig_handle: string | null;
}

/** Strip phone to digits only for comparison */
function phoneDigits(p: string): string {
  return p.replace(/\D/g, "");
}

/** Merge string arrays, deduplicating case-insensitively */
function mergeArrays(existing: string[] | null, incoming: string[]): string[] {
  const set = new Set((existing || []).map(s => s.toLowerCase()));
  const result = [...(existing || [])];
  for (const v of incoming) {
    if (v && !set.has(v.toLowerCase())) {
      result.push(v);
      set.add(v.toLowerCase());
    }
  }
  return result;
}

/**
 * Auto-save parsed contacts from a call sheet into crew_contacts,
 * merging duplicates by email or phone, and linking via contact_call_sheets.
 */
async function autoSaveContacts(
  supabase: any,
  sheetId: string,
  parsedContacts: ParsedContact[],
  userId: string,
  projectTitle: string | null,
) {
  // Fetch existing contacts for this user
  const { data: existing, error: fetchErr } = await supabase
    .from("crew_contacts")
    .select("id, name, emails, phones, roles, departments, ig_handle, source_files")
    .eq("user_id", userId);

  if (fetchErr) {
    console.error(`[auto-save] fetch contacts error:`, fetchErr);
    return { saved: 0, merged: 0, error: fetchErr.message };
  }

  const existingContacts = existing || [];

  // Build lookup indexes
  const byEmail = new Map<string, typeof existingContacts[0]>();
  const byPhone = new Map<string, typeof existingContacts[0]>();
  for (const c of existingContacts) {
    for (const e of (c.emails || [])) {
      byEmail.set(e.toLowerCase(), c);
    }
    for (const p of (c.phones || [])) {
      const digits = phoneDigits(p);
      if (digits.length >= 10) {
        byPhone.set(digits.slice(-10), c);
      }
    }
  }

  let saved = 0;
  let merged = 0;
  const contactIdsForSheet: string[] = [];

  for (const contact of parsedContacts) {
    if (!contact.name || !contact.name.trim()) continue;
    if (looksLikeRoleLabel(contact.name)) continue;

    // Try to find existing match
    let match: typeof existingContacts[0] | undefined;

    for (const e of contact.emails) {
      const found = byEmail.get(e.toLowerCase());
      if (found) { match = found; break; }
    }

    if (!match) {
      for (const p of contact.phones) {
        const digits = phoneDigits(p);
        if (digits.length >= 10) {
          const found = byPhone.get(digits.slice(-10));
          if (found) { match = found; break; }
        }
      }
    }

    if (match) {
      // Merge into existing
      const updatedRoles = mergeArrays(match.roles, contact.roles);
      const updatedDepts = mergeArrays(match.departments, contact.departments);
      const updatedPhones = mergeArrays(match.phones, contact.phones);
      const updatedEmails = mergeArrays(match.emails, contact.emails);
      const updatedSources = mergeArrays(match.source_files, projectTitle ? [projectTitle] : []);

      const { error: updateErr } = await supabase
        .from("crew_contacts")
        .update({
          roles: updatedRoles,
          departments: updatedDepts,
          phones: updatedPhones,
          emails: updatedEmails,
          source_files: updatedSources,
        })
        .eq("id", match.id);

      if (!updateErr) {
        merged++;
        contactIdsForSheet.push(match.id);
        // Update lookup indexes with new data
        for (const e of contact.emails) byEmail.set(e.toLowerCase(), match);
        for (const p of contact.phones) {
          const d = phoneDigits(p);
          if (d.length >= 10) byPhone.set(d.slice(-10), match);
        }
      }
    } else {
      // Insert new contact
      const { data: inserted, error: insertErr } = await supabase
        .from("crew_contacts")
        .insert({
          user_id: userId,
          name: contact.name.trim(),
          roles: contact.roles,
          departments: contact.departments,
          phones: contact.phones,
          emails: contact.emails,
          ig_handle: contact.ig_handle,
          confidence: contact.confidence,
          needs_review: false,
          source_files: projectTitle ? [projectTitle] : [],
          project_title: projectTitle,
        })
        .select("id")
        .single();

      if (!insertErr && inserted) {
        saved++;
        contactIdsForSheet.push(inserted.id);
        // Add to lookup indexes
        const newEntry = { id: inserted.id, name: contact.name, emails: contact.emails, phones: contact.phones, roles: contact.roles, departments: contact.departments, ig_handle: contact.ig_handle, source_files: projectTitle ? [projectTitle] : [] };
        existingContacts.push(newEntry);
        for (const e of contact.emails) byEmail.set(e.toLowerCase(), newEntry);
        for (const p of contact.phones) {
          const d = phoneDigits(p);
          if (d.length >= 10) byPhone.set(d.slice(-10), newEntry);
        }
      } else if (insertErr) {
        console.error(`[auto-save] insert error for ${contact.name}:`, insertErr);
      }
    }
  }

  // Link contacts to call sheet
  if (contactIdsForSheet.length > 0) {
    const links = contactIdsForSheet.map(cid => ({
      contact_id: cid,
      call_sheet_id: sheetId,
    }));

    // Use upsert-like approach: insert ignore conflicts
    for (const link of links) {
      await supabase
        .from("contact_call_sheets")
        .upsert(link, { onConflict: "contact_id,call_sheet_id", ignoreDuplicates: true });
    }
  }

  return { saved, merged, error: null };
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

    const body = await req.json();

    // ── ACTION: auto_save_reviewed ──────────────────────────────
    // Bulk-save all "parsed" (needs review) sheets' contacts into crew_contacts
    if (body.action === "auto_save_reviewed") {
      console.log("[import-parsed-contacts] auto_save_reviewed action");

      const { data: sheets, error: fetchErr } = await supabase
        .from("global_call_sheets")
        .select("id, parsed_contacts, project_title, first_uploaded_by")
        .eq("status", "parsed");

      if (fetchErr) {
        console.error("[auto_save_reviewed] fetch error:", fetchErr);
        throw fetchErr;
      }

      if (!sheets || sheets.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No sheets with 'parsed' status found", processed: 0 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[auto_save_reviewed] Processing ${sheets.length} sheets`);

      let totalSaved = 0;
      let totalMerged = 0;
      let totalProcessed = 0;
      const errors: string[] = [];

      for (const sheet of sheets) {
        const contacts = (sheet.parsed_contacts || []) as ParsedContact[];
        const uploaderId = sheet.first_uploaded_by || user.id;

        if (contacts.length === 0) {
          await supabase
            .from("global_call_sheets")
            .update({ status: "complete", updated_at: new Date().toISOString() })
            .eq("id", sheet.id);
          totalProcessed++;
          continue;
        }

        const result = await autoSaveContacts(
          supabase, sheet.id, contacts, uploaderId, sheet.project_title,
        );

        if (result.error) {
          errors.push(`${sheet.id}: ${result.error}`);
        } else {
          totalSaved += result.saved;
          totalMerged += result.merged;
          await supabase
            .from("global_call_sheets")
            .update({ status: "complete", updated_at: new Date().toISOString() })
            .eq("id", sheet.id);
          totalProcessed++;
        }
      }

      console.log(`[auto_save_reviewed] Done: ${totalProcessed} sheets, ${totalSaved} saved, ${totalMerged} merged`);

      return new Response(
        JSON.stringify({
          success: true,
          sheets_processed: totalProcessed,
          contacts_saved: totalSaved,
          contacts_merged: totalMerged,
          errors: errors.slice(0, 20),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: backfill_complete ───────────────────────────────
    // Re-run autoSaveContacts on already-complete sheets that have unsaved contacts
    if (body.action === "backfill_complete") {
      console.log("[import-parsed-contacts] backfill_complete action");

      const { data: sheets, error: fetchErr } = await supabase
        .from("global_call_sheets")
        .select("id, parsed_contacts, project_title, first_uploaded_by, contacts_extracted")
        .eq("status", "complete")
        .not("parsed_contacts", "is", null);

      if (fetchErr) {
        console.error("[backfill_complete] fetch error:", fetchErr);
        throw fetchErr;
      }

      if (!sheets || sheets.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No complete sheets with parsed_contacts found", processed: 0 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[backfill_complete] Checking ${sheets.length} complete sheets`);

      let totalSaved = 0;
      let totalMerged = 0;
      let sheetsBackfilled = 0;
      let sheetsSkipped = 0;
      const errors: string[] = [];

      for (const sheet of sheets) {
        const contacts = (sheet.parsed_contacts || []) as ParsedContact[];
        if (contacts.length === 0) { sheetsSkipped++; continue; }

        // Count existing links for this sheet
        const { count, error: countErr } = await supabase
          .from("contact_call_sheets")
          .select("id", { count: "exact", head: true })
          .eq("call_sheet_id", sheet.id);

        if (countErr) {
          errors.push(`${sheet.id}: count error: ${countErr.message}`);
          continue;
        }

        const linkedCount = count || 0;
        const expectedCount = sheet.contacts_extracted || contacts.length;

        if (linkedCount >= expectedCount) {
          sheetsSkipped++;
          continue;
        }

        console.log(`[backfill_complete] Sheet ${sheet.id}: ${linkedCount}/${expectedCount} linked, backfilling`);

        const uploaderId = sheet.first_uploaded_by || user.id;
        const result = await autoSaveContacts(supabase, sheet.id, contacts, uploaderId, sheet.project_title);

        if (result.error) {
          errors.push(`${sheet.id}: ${result.error}`);
        } else {
          totalSaved += result.saved;
          totalMerged += result.merged;
          sheetsBackfilled++;
        }
      }

      console.log(`[backfill_complete] Done: ${sheetsBackfilled} backfilled, ${sheetsSkipped} skipped, ${totalSaved} saved, ${totalMerged} merged`);

      return new Response(
        JSON.stringify({
          success: true,
          sheets_checked: sheets.length,
          sheets_backfilled: sheetsBackfilled,
          sheets_skipped: sheetsSkipped,
          contacts_saved: totalSaved,
          contacts_merged: totalMerged,
          errors: errors.slice(0, 20),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── DEFAULT ACTION: import files ────────────────────────────
    const { files, force = false } = body;

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

    const fileMap = new Map<string, ClaudeJSON>();
    for (const f of files as ClaudeJSON[]) {
      if (!f.source_file) continue;
      const key = normalizeFilename(f.source_file);
      fileMap.set(key, f);
    }

    const { data: sheets, error: fetchErr } = await supabase
      .from("global_call_sheets")
      .select("id, original_file_name, status, parsed_contacts, first_uploaded_by, project_title");

    if (fetchErr) {
      console.error("[import-parsed-contacts] fetch error:", fetchErr);
      throw fetchErr;
    }

    let matched = 0;
    let skippedAlreadyParsed = 0;
    let updated = 0;
    let totalSaved = 0;
    let totalMerged = 0;
    const unmatched: string[] = [];
    const errors: string[] = [];

    const sheetByName = new Map<string, { id: string; status: string | null; parsed_contacts: unknown; first_uploaded_by: string | null; project_title: string | null }>();
    for (const s of sheets || []) {
      const key = normalizeFilename(s.original_file_name);
      sheetByName.set(key, s);
    }

    for (const [normalizedSource, claudeData] of fileMap.entries()) {
      const sheet = sheetByName.get(normalizedSource);

      if (!sheet) {
        unmatched.push(claudeData.source_file);
        continue;
      }

      matched++;

      if (!force && sheet.status === "complete" && sheet.parsed_contacts) {
        skippedAlreadyParsed++;
        continue;
      }

      const crew = claudeData.crew || [];
      const parsedContacts: ParsedContact[] = [];

      for (const c of crew) {
        if (!c.name || !c.name.trim()) continue;

        const needsReview = looksLikeRoleLabel(c.name);

        parsedContacts.push({
          name: c.name.trim(),
          roles: c.role && !isPlaceholder(c.role) ? [c.role.trim()] : [],
          departments: c.department && !isPlaceholder(c.department) ? [c.department.trim()] : [],
          phones: c.phone && !isPlaceholder(c.phone) ? [c.phone.trim()] : [],
          emails: c.email && !isPlaceholder(c.email) ? [c.email.trim().toLowerCase()] : [],
          confidence: 1.0,
          needs_review: needsReview,
          ig_handle: null,
        });
      }

      const parsedDate = claudeData.production_info?.date || null;
      const projectTitle = claudeData.production_info?.production_name || null;
      const safeParsedDate = tryParseDate(parsedDate);

      // Update the row with parsed contacts and mark as complete (auto-saved)
      const { error: updateErr } = await supabase
        .from("global_call_sheets")
        .update({
          parsed_contacts: parsedContacts,
          contacts_extracted: parsedContacts.length,
          status: "complete",
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

        // Auto-save contacts into crew_contacts
        const uploaderId = sheet.first_uploaded_by || user.id;
        const result = await autoSaveContacts(supabase, sheet.id, parsedContacts, uploaderId, projectTitle);
        if (result.error) {
          errors.push(`${claudeData.source_file} (save): ${result.error}`);
        } else {
          totalSaved += result.saved;
          totalMerged += result.merged;
        }
      }
    }

    console.log(
      `[import-parsed-contacts] Done: ${matched} matched, ${updated} updated, ${skippedAlreadyParsed} skipped, ${unmatched.length} unmatched, ${totalSaved} saved, ${totalMerged} merged`
    );

    return new Response(
      JSON.stringify({
        success: true,
        matched,
        updated,
        skipped_already_parsed: skippedAlreadyParsed,
        contacts_saved: totalSaved,
        contacts_merged: totalMerged,
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
