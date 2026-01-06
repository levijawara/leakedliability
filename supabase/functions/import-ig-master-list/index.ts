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

function mergeArrays(existing: string[] | null, incoming: string[]): string[] {
  return uniqueArray([...(existing || []), ...incoming]);
}

interface ContactInput {
  instagram?: string;
  name?: string;
  roles?: string | string[];
  phone?: string | string[];
  email?: string | string[];
}

interface ProcessedContact {
  instagram: string;
  raw_name: string;
  normalized_name: string;
  roles: string[];
  phones: string[];
  emails: string[];
}

interface ExistingRecord {
  id: string;
  instagram: string;
  raw_name: string;
  normalized_name: string;
  roles: string[] | null;
  phones: string[] | null;
  emails: string[] | null;
  sources: string[] | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[import-ig-master-list] Starting batch import...");
    const startTime = Date.now();

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

    console.log(`[import-ig-master-list] Processing ${contacts.length} contacts in batch mode...`);

    // Step 1: Pre-process all contacts in memory (no DB calls)
    const processedContacts: ProcessedContact[] = [];
    let skipped = 0;

    for (const contact of contacts as ContactInput[]) {
      if (!contact.instagram || !contact.name) {
        skipped++;
        continue;
      }

      const instagram = stripInstagramHandle(contact.instagram);
      if (!instagram) {
        skipped++;
        continue;
      }

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

      processedContacts.push({
        instagram,
        raw_name: rawName,
        normalized_name: normalizedName,
        roles,
        phones,
        emails,
      });
    }

    // Deduplicate by instagram handle (keep first occurrence, merge data)
    const deduplicatedMap = new Map<string, ProcessedContact>();
    for (const contact of processedContacts) {
      const existing = deduplicatedMap.get(contact.instagram);
      if (existing) {
        // Merge into existing
        existing.roles = uniqueArray([...existing.roles, ...contact.roles]);
        existing.phones = uniqueArray([...existing.phones, ...contact.phones]);
        existing.emails = uniqueArray([...existing.emails, ...contact.emails]);
        // Keep the longer name
        if (contact.raw_name.split(' ').length > existing.raw_name.split(' ').length) {
          existing.raw_name = contact.raw_name;
          existing.normalized_name = contact.normalized_name;
        }
      } else {
        deduplicatedMap.set(contact.instagram, { ...contact });
      }
    }
    const uniqueContacts = Array.from(deduplicatedMap.values());

    console.log(`[import-ig-master-list] ${uniqueContacts.length} unique contacts after deduplication, ${skipped} skipped`);

    // Step 2: Fetch all existing IGs in batches (Supabase has 1000 row limit per query)
    const allIGs = uniqueContacts.map(c => c.instagram);
    const existingMap = new Map<string, ExistingRecord>();

    // Query in chunks of 500 to be safe
    const chunkSize = 500;
    for (let i = 0; i < allIGs.length; i += chunkSize) {
      const chunk = allIGs.slice(i, i + chunkSize);
      const { data: existingRecords, error: fetchError } = await supabase
        .from("ig_master_identities")
        .select("id, instagram, raw_name, normalized_name, roles, phones, emails, sources")
        .in("instagram", chunk);

      if (fetchError) {
        console.error(`[import-ig-master-list] Error fetching existing records:`, fetchError);
        throw fetchError;
      }

      for (const record of (existingRecords || []) as ExistingRecord[]) {
        existingMap.set(record.instagram, record);
      }
    }

    console.log(`[import-ig-master-list] Found ${existingMap.size} existing records in database`);

    // Step 3: Separate into new vs existing
    const toInsert: Array<{
      raw_name: string;
      normalized_name: string;
      instagram: string;
      roles: string[];
      phones: string[];
      emails: string[];
      sources: string[];
    }> = [];

    const toUpdate: Array<{
      id: string;
      raw_name: string;
      normalized_name: string;
      roles: string[];
      phones: string[];
      emails: string[];
      sources: string[];
      updated_at: string;
    }> = [];

    for (const contact of uniqueContacts) {
      const existing = existingMap.get(contact.instagram);
      if (existing) {
        // Merge arrays and prepare for update
        const mergedRoles = mergeArrays(existing.roles, contact.roles);
        const mergedPhones = mergeArrays(existing.phones, contact.phones);
        const mergedEmails = mergeArrays(existing.emails, contact.emails);
        const mergedSources = mergeArrays(existing.sources, [source]);

        // Check if incoming name is more complete
        const existingWordCount = existing.raw_name.split(' ').length;
        const incomingWordCount = contact.raw_name.split(' ').length;
        const shouldUpdateName = incomingWordCount > existingWordCount;

        toUpdate.push({
          id: existing.id,
          raw_name: shouldUpdateName ? contact.raw_name : existing.raw_name,
          normalized_name: shouldUpdateName ? contact.normalized_name : existing.normalized_name,
          roles: mergedRoles,
          phones: mergedPhones,
          emails: mergedEmails,
          sources: mergedSources,
          updated_at: new Date().toISOString(),
        });
      } else {
        // New record
        toInsert.push({
          raw_name: contact.raw_name,
          normalized_name: contact.normalized_name,
          instagram: contact.instagram,
          roles: contact.roles,
          phones: contact.phones,
          emails: contact.emails,
          sources: [source],
        });
      }
    }

    console.log(`[import-ig-master-list] ${toInsert.length} to insert, ${toUpdate.length} to update`);

    // Step 4: Batch insert new records (chunks of 100)
    let imported = 0;
    const insertErrors: string[] = [];
    const batchSize = 100;

    for (let i = 0; i < toInsert.length; i += batchSize) {
      const chunk = toInsert.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from("ig_master_identities")
        .insert(chunk);

      if (insertError) {
        console.error(`[import-ig-master-list] Insert batch error:`, insertError);
        insertErrors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
      } else {
        imported += chunk.length;
      }
    }

    // Step 5: Batch upsert updates (chunks of 100)
    let updated = 0;
    const updateErrors: string[] = [];

    for (let i = 0; i < toUpdate.length; i += batchSize) {
      const chunk = toUpdate.slice(i, i + batchSize);
      const { error: upsertError } = await supabase
        .from("ig_master_identities")
        .upsert(chunk, { onConflict: 'id' });

      if (upsertError) {
        console.error(`[import-ig-master-list] Update batch error:`, upsertError);
        updateErrors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${upsertError.message}`);
      } else {
        updated += chunk.length;
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[import-ig-master-list] Complete in ${elapsed}ms: ${imported} imported, ${updated} updated, ${skipped} skipped`);

    const allErrors = [...insertErrors, ...updateErrors];

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        updated,
        skipped,
        errors: allErrors.slice(0, 10),
        total: contacts.length,
        uniqueProcessed: uniqueContacts.length,
        elapsedMs: elapsed,
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
