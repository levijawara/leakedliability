import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const config = { verify_jwt: true };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 100;

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

interface MasterIdentity {
  id: string;
  normalized_name: string;
  instagram: string;
  phones: string[];
  emails: string[];
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  phones: string[] | null;
  emails: string[] | null;
}

interface MatchResult {
  contactId: string;
  contactName: string;
  igHandle: string;
  matchType: "email" | "phone" | "name";
}

interface ContactUpdate {
  id: string;
  ig_handle: string;
}

interface IGMapEntry {
  user_id: string;
  name: string;
  ig_handle: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[auto-backfill-ig-from-master] Starting backfill...");

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

    // Fetch user's contacts without IG handles
    const { data: contacts, error: contactsError } = await supabase
      .from("crew_contacts")
      .select("id, name, phones, emails")
      .eq("user_id", user.id)
      .is("ig_handle", null);

    if (contactsError) throw contactsError;

    if (!contacts || contacts.length === 0) {
      console.log("[auto-backfill-ig-from-master] No contacts need IG handles");
      return new Response(
        JSON.stringify({ success: true, matched: 0, total: 0, updates: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[auto-backfill-ig-from-master] Processing ${contacts.length} contacts...`);

    // Fetch all master identities (ordered by created_at for tie-breaking)
    const { data: masterList, error: masterError } = await supabase
      .from("ig_master_identities")
      .select("id, normalized_name, instagram, phones, emails, created_at")
      .order("created_at", { ascending: true });

    if (masterError) throw masterError;

    if (!masterList || masterList.length === 0) {
      console.log("[auto-backfill-ig-from-master] Master list is empty");
      return new Response(
        JSON.stringify({ success: true, matched: 0, total: contacts.length, updates: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[auto-backfill-ig-from-master] Master list has ${masterList.length} entries`);

    // Build lookup maps for faster matching
    const emailMap = new Map<string, MasterIdentity>();
    const phoneMap = new Map<string, MasterIdentity>();
    const nameMap = new Map<string, MasterIdentity>();

    for (const master of masterList) {
      // Email map (first match wins due to ordering)
      for (const email of master.emails || []) {
        const normalized = normalizeEmail(email);
        if (normalized && !emailMap.has(normalized)) {
          emailMap.set(normalized, master);
        }
      }

      // Phone map
      for (const phone of master.phones || []) {
        const normalized = normalizePhone(phone);
        if (normalized && !phoneMap.has(normalized)) {
          phoneMap.set(normalized, master);
        }
      }

      // Name map
      if (!nameMap.has(master.normalized_name)) {
        nameMap.set(master.normalized_name, master);
      }
    }

    // Collect all matches first (no DB writes in loop)
    const contactUpdates: ContactUpdate[] = [];
    const igMapEntries: IGMapEntry[] = [];
    const updates: MatchResult[] = [];

    for (const contact of contacts) {
      let match: MasterIdentity | null = null;
      let matchType: "email" | "phone" | "name" | null = null;

      // Priority 1: Email match (highest confidence)
      if (contact.emails && contact.emails.length > 0) {
        for (const email of contact.emails) {
          const normalized = normalizeEmail(email);
          if (normalized && emailMap.has(normalized)) {
            match = emailMap.get(normalized)!;
            matchType = "email";
            break;
          }
        }
      }

      // Priority 2: Phone match
      if (!match && contact.phones && contact.phones.length > 0) {
        for (const phone of contact.phones) {
          const normalized = normalizePhone(phone);
          if (normalized && phoneMap.has(normalized)) {
            match = phoneMap.get(normalized)!;
            matchType = "phone";
            break;
          }
        }
      }

      // Priority 3: Name match (lowest confidence)
      if (!match) {
        const normalizedContactName = normalizeName(contact.name);
        if (nameMap.has(normalizedContactName)) {
          match = nameMap.get(normalizedContactName)!;
          matchType = "name";
        }
      }

      // Collect match for batch processing
      if (match && matchType) {
        contactUpdates.push({ id: contact.id, ig_handle: match.instagram });
        igMapEntries.push({ 
          user_id: user.id, 
          name: contact.name, 
          ig_handle: match.instagram 
        });
        updates.push({
          contactId: contact.id,
          contactName: contact.name,
          igHandle: match.instagram,
          matchType,
        });

        console.log(`[auto-backfill-ig-from-master] Matched ${contact.name} -> @${match.instagram} (${matchType})`);
      }
    }

    console.log(`[auto-backfill-ig-from-master] Found ${contactUpdates.length} matches, starting batch updates...`);

    // Batch update crew_contacts
    let contactUpdateErrors = 0;
    for (let i = 0; i < contactUpdates.length; i += BATCH_SIZE) {
      const chunk = contactUpdates.slice(i, i + BATCH_SIZE);
      
      // Use individual updates since we can't upsert with only id + ig_handle
      // (other required fields like user_id, name would be missing)
      for (const update of chunk) {
        const { error } = await supabase
          .from("crew_contacts")
          .update({ ig_handle: update.ig_handle })
          .eq("id", update.id);
        
        if (error) {
          console.error(`[auto-backfill-ig-from-master] Failed to update contact ${update.id}:`, error);
          contactUpdateErrors++;
        }
      }
      
      console.log(`[auto-backfill-ig-from-master] Updated contacts batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(contactUpdates.length / BATCH_SIZE)}`);
    }

    // Batch upsert user_ig_map
    let igMapErrors = 0;
    for (let i = 0; i < igMapEntries.length; i += BATCH_SIZE) {
      const chunk = igMapEntries.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from("user_ig_map")
        .upsert(chunk, { onConflict: 'user_id,name' });
      
      if (error) {
        console.error(`[auto-backfill-ig-from-master] Failed to upsert ig_map batch:`, error);
        igMapErrors++;
      } else {
        console.log(`[auto-backfill-ig-from-master] Upserted ig_map batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(igMapEntries.length / BATCH_SIZE)}`);
      }
    }

    const matchedCount = contactUpdates.length - contactUpdateErrors;
    console.log(`[auto-backfill-ig-from-master] Complete: ${matchedCount}/${contacts.length} matched (${contactUpdateErrors} contact errors, ${igMapErrors} map errors)`);

    return new Response(
      JSON.stringify({
        success: true,
        matched: matchedCount,
        total: contacts.length,
        updates,
        errors: { contactUpdates: contactUpdateErrors, igMap: igMapErrors }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[auto-backfill-ig-from-master] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
