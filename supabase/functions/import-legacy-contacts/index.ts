import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LegacyContact {
  "First Name": string;
  "Last Name": string | null;
  "Full Name": string;
  "Role": string;
  "Department": string;
  "Phone": string;
  "Email": string;
  "Instagram": string;
  "_source_export": string;
}

interface CrewContact {
  user_id: string;
  name: string;
  phones: string[] | null;
  emails: string[] | null;
  roles: string[] | null;
  departments: string[] | null;
  ig_handle: string | null;
  source_files: string[] | null;
  confidence: number;
  needs_review: boolean;
}

// Clean a value - handle "—", NaN, null, empty strings
function cleanValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && isNaN(value)) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "—" || trimmed === "NaN" || trimmed.toLowerCase() === "nan") {
      return null;
    }
    return trimmed;
  }
  return String(value);
}

// Clean and format phone number
function cleanPhone(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 7) return null;
  return cleaned;
}

// Clean Instagram handle
function cleanInstagram(ig: string | null): string | null {
  if (!ig) return null;
  // Remove @ prefix if present
  return ig.startsWith("@") ? ig.substring(1) : ig;
}

// Transform legacy contact to crew_contacts format
function transformContact(legacy: LegacyContact, userId: string, sourceExport: string): CrewContact {
  const name = cleanValue(legacy["Full Name"]) || "Unknown";
  const phone = cleanPhone(cleanValue(legacy["Phone"]));
  const email = cleanValue(legacy["Email"]);
  const role = cleanValue(legacy["Role"]);
  const department = cleanValue(legacy["Department"]);
  const instagram = cleanInstagram(cleanValue(legacy["Instagram"]));

  return {
    user_id: userId,
    name: name,
    phones: phone ? [phone] : null,
    emails: email ? [email] : null,
    roles: role ? [role] : null,
    departments: department ? [department] : null,
    ig_handle: instagram,
    source_files: [`legacy_import_${sourceExport}`],
    confidence: 0.9, // High confidence for imported data
    needs_review: false,
  };
}

// Merge arrays without duplicates
function mergeArrays(existing: string[] | null, incoming: string[] | null): string[] | null {
  if (!existing && !incoming) return null;
  if (!existing) return incoming;
  if (!incoming) return existing;
  
  const merged = new Set([...existing, ...incoming]);
  return Array.from(merged);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { contacts, user_id, batch_number, total_batches } = await req.json();

    if (!contacts || !Array.isArray(contacts)) {
      return new Response(
        JSON.stringify({ error: "contacts array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[IMPORT] Processing batch ${batch_number}/${total_batches} with ${contacts.length} contacts for user ${user_id}`);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const legacy of contacts as LegacyContact[]) {
      try {
        const sourceExport = cleanValue(legacy["_source_export"]) || "unknown";
        const transformed = transformContact(legacy, user_id, sourceExport);

        // Skip if no valid name
        if (transformed.name === "Unknown" || !transformed.name) {
          skipped++;
          continue;
        }

        // Check if contact already exists by name + user_id
        const { data: existing } = await supabase
          .from("crew_contacts")
          .select("*")
          .eq("user_id", user_id)
          .ilike("name", transformed.name)
          .maybeSingle();

        if (existing) {
          // UPDATE existing contact - merge arrays, don't replace
          const updateData = {
            phones: mergeArrays(existing.phones, transformed.phones),
            emails: mergeArrays(existing.emails, transformed.emails),
            roles: mergeArrays(existing.roles, transformed.roles),
            departments: mergeArrays(existing.departments, transformed.departments),
            source_files: mergeArrays(existing.source_files, transformed.source_files),
            // Only update ig_handle if existing is null
            ig_handle: existing.ig_handle || transformed.ig_handle,
          };

          const { error: updateError } = await supabase
            .from("crew_contacts")
            .update(updateData)
            .eq("id", existing.id);

          if (updateError) {
            errors.push(`Update error for ${transformed.name}: ${updateError.message}`);
          } else {
            updated++;
          }
        } else {
          // INSERT new contact
          const { error: insertError } = await supabase
            .from("crew_contacts")
            .insert(transformed);

          if (insertError) {
            errors.push(`Insert error for ${transformed.name}: ${insertError.message}`);
          } else {
            inserted++;
          }
        }
      } catch (err) {
        errors.push(`Processing error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    console.log(`[IMPORT] Batch ${batch_number} complete: ${inserted} inserted, ${updated} updated, ${skipped} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        batch_number,
        total_batches,
        stats: {
          inserted,
          updated,
          skipped,
          errors: errors.length,
        },
        errors: errors.slice(0, 10), // Only return first 10 errors
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[IMPORT] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
