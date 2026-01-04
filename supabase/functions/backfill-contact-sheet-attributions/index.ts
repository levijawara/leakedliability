import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normalization helpers (same logic as ParseReview)
const normalizePhone = (p: string): string => p.replace(/\D/g, "");
const normalizeEmail = (e: string): string => e.toLowerCase().trim();
const normalizeName = (n: string): string => n.toLowerCase().trim();

interface ParsedContact {
  name?: string;
  emails?: string[];
  phones?: string[];
}

interface CrewContact {
  id: string;
  user_id: string;
  name: string;
  phones: string[] | null;
  emails: string[] | null;
}

interface CallSheet {
  id: string;
  parsed_contacts: ParsedContact[] | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[backfill-contact-sheet-attributions] Starting...");

  try {
    // Initialize clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client to verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error("[backfill-contact-sheet-attributions] Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: isAdmin, error: roleError } = await supabaseAuth.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      console.error("[backfill-contact-sheet-attributions] Not admin:", roleError);
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[backfill-contact-sheet-attributions] Admin verified:", user.id);

    // Service role client for cross-user data access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all parsed call sheets
    const { data: callSheets, error: sheetsError } = await supabaseAdmin
      .from("global_call_sheets")
      .select("id, parsed_contacts")
      .eq("status", "parsed")
      .not("parsed_contacts", "is", null);

    if (sheetsError) {
      console.error("[backfill-contact-sheet-attributions] Failed to fetch call sheets:", sheetsError);
      throw sheetsError;
    }

    console.log(`[backfill-contact-sheet-attributions] Found ${callSheets?.length || 0} parsed call sheets`);

    // Fetch all crew contacts
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from("crew_contacts")
      .select("id, user_id, name, phones, emails");

    if (contactsError) {
      console.error("[backfill-contact-sheet-attributions] Failed to fetch contacts:", contactsError);
      throw contactsError;
    }

    console.log(`[backfill-contact-sheet-attributions] Found ${contacts?.length || 0} crew contacts`);

    if (!callSheets?.length || !contacts?.length) {
      return new Response(JSON.stringify({
        status: "success",
        sheets_scanned: 0,
        contacts_checked: 0,
        matches_found: 0,
        inserted: 0,
        already_existed: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare contacts for fast lookup
    const preparedContacts = contacts.map((c: CrewContact) => ({
      id: c.id,
      user_id: c.user_id,
      name: normalizeName(c.name),
      emails: (c.emails || []).map(normalizeEmail),
      phones: (c.phones || []).map(normalizePhone).filter(p => p.length >= 7),
    }));

    // Build matches
    const rowsToInsert: { contact_id: string; call_sheet_id: string }[] = [];

    for (const sheet of callSheets as CallSheet[]) {
      const parsed = sheet.parsed_contacts || [];
      
      for (const p of parsed) {
        const parsedName = normalizeName(p.name || "");
        const parsedEmails = (p.emails || []).map(normalizeEmail).filter(e => e.includes("@"));
        const parsedPhones = (p.phones || []).map(normalizePhone).filter(ph => ph.length >= 7);

        // Find all matching contacts (not just first match)
        for (const contact of preparedContacts) {
          let matched = false;

          // Email match
          if (!matched && parsedEmails.length > 0 && contact.emails.length > 0) {
            if (contact.emails.some((e: string) => parsedEmails.includes(e))) {
              matched = true;
            }
          }

          // Phone match
          if (!matched && parsedPhones.length > 0 && contact.phones.length > 0) {
            if (contact.phones.some((ph: string) => parsedPhones.includes(ph))) {
              matched = true;
            }
          }

          // Name match (only if no email/phone match and name is substantial)
          if (!matched && parsedName.length >= 3 && contact.name.length >= 3) {
            if (contact.name === parsedName) {
              matched = true;
            }
          }

          if (matched) {
            rowsToInsert.push({
              contact_id: contact.id,
              call_sheet_id: sheet.id,
            });
          }
        }
      }
    }

    console.log(`[backfill-contact-sheet-attributions] Raw matches found: ${rowsToInsert.length}`);

    // Dedupe
    const uniqueRows = Array.from(
      new Map(rowsToInsert.map(r => [`${r.contact_id}-${r.call_sheet_id}`, r])).values()
    );

    console.log(`[backfill-contact-sheet-attributions] Unique matches: ${uniqueRows.length}`);

    // Insert in batches with conflict handling
    const BATCH_SIZE = 100;
    let insertedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
      const batch = uniqueRows.slice(i, i + BATCH_SIZE);
      
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("contact_call_sheets")
        .upsert(batch, { 
          onConflict: "contact_id,call_sheet_id",
          ignoreDuplicates: true,
        })
        .select("id");

      if (insertError) {
        console.error(`[backfill-contact-sheet-attributions] Batch insert error:`, insertError);
        // Continue with other batches
      } else {
        const batchInserted = inserted?.length || 0;
        insertedCount += batchInserted;
        skippedCount += batch.length - batchInserted;
      }
    }

    console.log(`[backfill-contact-sheet-attributions] Inserted: ${insertedCount}, Skipped (already existed): ${skippedCount}`);

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      event_type: "backfill_contact_sheet_attributions",
      payload: {
        sheets_scanned: callSheets.length,
        contacts_checked: contacts.length,
        matches_found: uniqueRows.length,
        inserted: insertedCount,
        already_existed: skippedCount,
      },
    });

    return new Response(JSON.stringify({
      status: "success",
      sheets_scanned: callSheets.length,
      contacts_checked: contacts.length,
      matches_found: uniqueRows.length,
      inserted: insertedCount,
      already_existed: skippedCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[backfill-contact-sheet-attributions] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
