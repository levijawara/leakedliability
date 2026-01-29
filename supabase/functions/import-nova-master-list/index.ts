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

function extractUsernameFromUrl(url: string): string | null {
  // Handle URLs like https://itsnova.co/andrelynch
  const match = url.match(/itsnova\.co\/([^/?#]+)/i);
  if (match) {
    return match[1].toLowerCase().trim();
  }
  return null;
}

function uniqueArray(arr: (string | null | undefined)[]): string[] {
  return [...new Set(arr.filter((v): v is string => !!v && v.trim() !== ''))];
}

function mergeArrays(existing: string[] | null, incoming: string[]): string[] {
  return uniqueArray([...(existing || []), ...incoming]);
}

interface ContactInput {
  URL?: string;
  url?: string;
  Name?: string;
  name?: string;
  Roles?: string | string[];
  roles?: string | string[];
  Role?: string;
  role?: string;
  Occupation?: string;
  occupation?: string;
}

interface ProcessedContact {
  username: string;
  profile_url: string;
  full_name: string;
  normalized_name: string;
  roles: string[];
}

interface ExistingRecord {
  id: string;
  username: string;
  full_name: string;
  normalized_name: string;
  roles: string[] | null;
  sources: string[] | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[import-nova-master-list] Starting batch import...");
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
    const { contacts, source = "nova_scrape_v1" } = await req.json();

    if (!Array.isArray(contacts)) {
      return new Response(JSON.stringify({ error: "contacts must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[import-nova-master-list] Processing ${contacts.length} contacts in batch mode...`);

    // Step 1: Pre-process all contacts in memory (no DB calls)
    const processedContacts: ProcessedContact[] = [];
    let skipped = 0;

    for (const contact of contacts as ContactInput[]) {
      const url = contact.URL || contact.url;
      const name = contact.Name || contact.name;
      
      if (!url || !name) {
        skipped++;
        continue;
      }

      const username = extractUsernameFromUrl(url);
      if (!username) {
        skipped++;
        continue;
      }

      const fullName = name.trim();
      const normalizedName = normalizeName(fullName);

      // Parse roles from various fields
      const roleSource = contact.Roles || contact.roles || contact.Role || contact.role || contact.Occupation || contact.occupation;
      const roles = uniqueArray(
        typeof roleSource === 'string'
          ? roleSource.split(/[,;|]/).map((r: string) => r.trim()).filter(r => r)
          : Array.isArray(roleSource)
          ? roleSource
          : []
      );

      processedContacts.push({
        username,
        profile_url: url.trim(),
        full_name: fullName,
        normalized_name: normalizedName,
        roles,
      });
    }

    // Deduplicate by username (keep first occurrence, merge data)
    const deduplicatedMap = new Map<string, ProcessedContact>();
    for (const contact of processedContacts) {
      const existing = deduplicatedMap.get(contact.username);
      if (existing) {
        // Merge roles
        existing.roles = uniqueArray([...existing.roles, ...contact.roles]);
        // Keep the longer name
        if (contact.full_name.split(' ').length > existing.full_name.split(' ').length) {
          existing.full_name = contact.full_name;
          existing.normalized_name = contact.normalized_name;
        }
      } else {
        deduplicatedMap.set(contact.username, { ...contact });
      }
    }
    const uniqueContacts = Array.from(deduplicatedMap.values());

    console.log(`[import-nova-master-list] ${uniqueContacts.length} unique contacts after deduplication, ${skipped} skipped`);

    // Step 2: Fetch all existing usernames in batches
    const allUsernames = uniqueContacts.map(c => c.username);
    const existingMap = new Map<string, ExistingRecord>();

    // Query in chunks of 500 to be safe
    const chunkSize = 500;
    for (let i = 0; i < allUsernames.length; i += chunkSize) {
      const chunk = allUsernames.slice(i, i + chunkSize);
      const { data: existingRecords, error: fetchError } = await supabase
        .from("nova_master_identities")
        .select("id, username, full_name, normalized_name, roles, sources")
        .in("username", chunk);

      if (fetchError) {
        console.error(`[import-nova-master-list] Error fetching existing records:`, fetchError);
        throw fetchError;
      }

      for (const record of (existingRecords || []) as ExistingRecord[]) {
        existingMap.set(record.username, record);
      }
    }

    console.log(`[import-nova-master-list] Found ${existingMap.size} existing records in database`);

    // Step 3: Separate into new vs existing
    const toInsert: Array<{
      username: string;
      profile_url: string;
      full_name: string;
      normalized_name: string;
      roles: string[];
      sources: string[];
    }> = [];

    const toUpdate: Array<{
      id: string;
      full_name: string;
      normalized_name: string;
      roles: string[];
      sources: string[];
      updated_at: string;
    }> = [];

    for (const contact of uniqueContacts) {
      const existing = existingMap.get(contact.username);
      if (existing) {
        // Merge arrays and prepare for update
        const mergedRoles = mergeArrays(existing.roles, contact.roles);
        const mergedSources = mergeArrays(existing.sources, [source]);

        // Check if incoming name is more complete
        const existingWordCount = existing.full_name.split(' ').length;
        const incomingWordCount = contact.full_name.split(' ').length;
        const shouldUpdateName = incomingWordCount > existingWordCount;

        toUpdate.push({
          id: existing.id,
          full_name: shouldUpdateName ? contact.full_name : existing.full_name,
          normalized_name: shouldUpdateName ? contact.normalized_name : existing.normalized_name,
          roles: mergedRoles,
          sources: mergedSources,
          updated_at: new Date().toISOString(),
        });
      } else {
        // New record
        toInsert.push({
          username: contact.username,
          profile_url: contact.profile_url,
          full_name: contact.full_name,
          normalized_name: contact.normalized_name,
          roles: contact.roles,
          sources: [source],
        });
      }
    }

    console.log(`[import-nova-master-list] ${toInsert.length} to insert, ${toUpdate.length} to update`);

    // Step 4: Batch insert new records (chunks of 100)
    let imported = 0;
    const insertErrors: string[] = [];
    const batchSize = 100;

    for (let i = 0; i < toInsert.length; i += batchSize) {
      const chunk = toInsert.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from("nova_master_identities")
        .insert(chunk);

      if (insertError) {
        console.error(`[import-nova-master-list] Insert batch error:`, insertError);
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
        .from("nova_master_identities")
        .upsert(chunk, { onConflict: 'id' });

      if (upsertError) {
        console.error(`[import-nova-master-list] Update batch error:`, upsertError);
        updateErrors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${upsertError.message}`);
      } else {
        updated += chunk.length;
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[import-nova-master-list] Complete in ${elapsed}ms: ${imported} imported, ${updated} updated, ${skipped} skipped`);

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
    console.error("[import-nova-master-list] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
