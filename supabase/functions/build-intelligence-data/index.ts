import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
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

    const { action } = await req.json();
    console.log("[build-intelligence-data] Action:", action);

    let result: Record<string, unknown> = {};

    // BACKFILL: Populate canonical_producers for existing sheets that don't have it
    if (action === "backfill_canonical" || action === "all") {
      const backfillResult = await backfillCanonicalProducers(supabase);
      result.backfill = backfillResult;
    }

    if (action === "build_network" || action === "all") {
      // Build network from CANONICAL PRODUCERS (immutable source)
      const networkResult = await buildNetworkFromParsedContacts(supabase);
      result.network = networkResult;
    }

    if (action === "calculate_heat" || action === "all") {
      // Recalculate all heat scores
      const { data: heatCount, error: heatError } = await supabase.rpc("recalculate_all_heat_scores");
      if (heatError) {
        console.error("[build-intelligence-data] Heat calc error:", heatError);
        result.heat = { error: heatError.message };
      } else {
        result.heat = { sheetsProcessed: heatCount };
      }
    }

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[build-intelligence-data] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface ParsedContact {
  name: string;
  roles?: string[];
  emails?: string[];
  phones?: string[];
  department?: string;
}

// Producer role patterns - only these roles should appear in the network graph
const PRODUCER_ROLE_PATTERNS = [
  'producer',
  'executive producer',
  'line producer',
  'associate producer',
  'co-producer',
  'co producer',
  'creative producer',
  'supervising producer',
  'post producer',
  'post-production producer',
  'field producer',
  'story producer',
  'segment producer',
  'senior producer',
  'junior producer',
  'assistant producer',
  'production manager',
  'production supervisor',
  'production coordinator',
  'production contact',
  'unit production manager',
  'post production supervisor',
  'post production manager',
  'post production coordinator',
  'upm',
  'pm',
  'ep',
  'hop',
  'lp',
  'ap',
  'head of production',
  'head of post',
  'vp production',
  'vp of production',
  'director of production',
  'production director',
  'production executive',
];

function hasProducerRole(roles: string[] | null | undefined): boolean {
  if (!roles || !Array.isArray(roles)) return false;
  return roles.some(role => {
    const normalized = role.toLowerCase().trim();
    return PRODUCER_ROLE_PATTERNS.some(pattern => 
      normalized === pattern || normalized.includes(pattern)
    );
  });
}

interface CanonicalProducer {
  name: string;
  roles: string[];
  emails: string[];
  phones: string[];
}

async function buildNetworkFromParsedContacts(supabase: ReturnType<typeof createClient>) {
  console.log("[build-intelligence-data] Building network from CANONICAL PRODUCERS ONLY (immutable source)...");

  // Get all call sheets with canonical_producers (IMMUTABLE snapshot from first parse)
  // This ensures the intelligence system is immune to user edits
  const { data: sheets, error: sheetsError } = await supabase
    .from("global_call_sheets")
    .select("id, canonical_producers, project_title")
    .not("canonical_producers", "is", null);

  if (sheetsError) {
    console.error("[build-intelligence-data] Failed to fetch sheets:", sheetsError);
    return { error: sheetsError.message };
  }

  if (!sheets || sheets.length === 0) {
    return { message: "No call sheets with canonical_producers found. Run parse first." };
  }

  let nodesCreated = 0;
  let sheetsWithProducers = 0;
  let edgesCreated = 0;
  let edgesUpdated = 0;

  // Process each sheet using ONLY canonical_producers (not parsed_contacts)
  for (const sheet of sheets) {
    const producers = sheet.canonical_producers as CanonicalProducer[] | null;
    if (!producers || !Array.isArray(producers) || producers.length === 0) continue;

    sheetsWithProducers++;
    const producerGroupIds: string[] = [];

    // Create/update identity groups for each CANONICAL producer
    // NO fuzzy matching - different spellings = different nodes (until manual merge)
    for (const producer of producers) {
      if (!producer.name || producer.name.trim() === "") continue;

      const canonicalName = producer.name.trim();

      // Check if identity group already exists (EXACT name match only)
      const { data: existingGroup } = await supabase
        .from("identity_groups")
        .select("id, project_count")
        .eq("canonical_name", canonicalName)
        .maybeSingle();

      let groupId: string;

      if (existingGroup) {
        groupId = existingGroup.id;
        
        // Update project count
        await supabase
          .from("identity_groups")
          .update({ 
            project_count: (existingGroup.project_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq("id", groupId);

        // Update network node project count
        await supabase
          .from("network_nodes")
          .update({
            project_count: (existingGroup.project_count || 0) + 1,
          })
          .eq("identity_group_id", groupId);
      } else {
        // Create new identity group (EXACT name - no merging)
        const { data: newGroup, error: createError } = await supabase
          .from("identity_groups")
          .insert({
            canonical_name: canonicalName,
            emails: producer.emails || [],
            phones: producer.phones || [],
            roles: producer.roles || [],
            is_producer: true, // Always true - we only process producers
            project_count: 1,
          })
          .select("id")
          .single();

        if (createError) {
          console.error("[build-intelligence-data] Failed to create group:", createError);
          continue;
        }

        groupId = newGroup.id;
        nodesCreated++;

        // Create network node
        await supabase
          .from("network_nodes")
          .upsert({
            identity_group_id: groupId,
            display_name: canonicalName,
            roles: producer.roles || [],
            project_count: 1,
            is_producer: true,
          }, { onConflict: "identity_group_id" });
      }

      producerGroupIds.push(groupId);
    }

    // Create edges between all pairs of producers on this sheet
    for (let i = 0; i < producerGroupIds.length; i++) {
      for (let j = i + 1; j < producerGroupIds.length; j++) {
        const sourceId = producerGroupIds[i];
        const targetId = producerGroupIds[j];
        
        // Ensure consistent ordering
        const [smaller, larger] = sourceId < targetId 
          ? [sourceId, targetId] 
          : [targetId, sourceId];

        // Check if edge exists
        const { data: existingEdge } = await supabase
          .from("relationship_edges")
          .select("id, weight, shared_projects, shared_project_titles")
          .eq("source_group_id", smaller)
          .eq("target_group_id", larger)
          .maybeSingle();

        if (existingEdge) {
          // Update existing edge
          const newProjects = existingEdge.shared_projects || [];
          const newTitles = existingEdge.shared_project_titles || [];
          
          if (!newProjects.includes(sheet.id)) {
            newProjects.push(sheet.id);
            if (sheet.project_title) newTitles.push(sheet.project_title);
          }

          await supabase
            .from("relationship_edges")
            .update({
              weight: existingEdge.weight + 1,
              shared_projects: newProjects,
              shared_project_titles: newTitles,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingEdge.id);
          
          edgesUpdated++;
        } else {
          // Create new edge
          await supabase
            .from("relationship_edges")
            .insert({
              source_group_id: smaller,
              target_group_id: larger,
              weight: 1,
              shared_projects: [sheet.id],
              shared_project_titles: sheet.project_title ? [sheet.project_title] : [],
            });
          
          edgesCreated++;
        }
      }
    }
  }

  console.log(`[build-intelligence-data] Network build complete from CANONICAL PRODUCERS: ${nodesCreated} nodes created, ${edgesCreated} new edges, ${edgesUpdated} updated edges`);

  return {
    sheetsProcessed: sheets.length,
    sheetsWithProducers,
    nodesCreated,
    edgesCreated,
    edgesUpdated,
  };
}

// BACKFILL: Populate canonical_producers for existing parsed sheets
// This runs ONCE per sheet - after that, canonical_producers is IMMUTABLE
async function backfillCanonicalProducers(supabase: ReturnType<typeof createClient>) {
  console.log("[build-intelligence-data] Backfilling canonical_producers for existing sheets...");

  // Get sheets that have parsed_contacts but no canonical_producers
  const { data: sheets, error: sheetsError } = await supabase
    .from("global_call_sheets")
    .select("id, parsed_contacts")
    .is("canonical_producers", null)
    .not("parsed_contacts", "is", null);

  if (sheetsError) {
    console.error("[build-intelligence-data] Failed to fetch sheets for backfill:", sheetsError);
    return { error: sheetsError.message };
  }

  if (!sheets || sheets.length === 0) {
    return { message: "No sheets need backfill - all have canonical_producers" };
  }

  let backfilled = 0;
  let totalProducers = 0;

  for (const sheet of sheets) {
    const contacts = sheet.parsed_contacts as ParsedContact[] | null;
    if (!contacts || !Array.isArray(contacts)) continue;

    // Extract producers using the same logic as parse-call-sheet
    const canonicalProducers = contacts
      .filter(c => hasProducerRole(c.roles))
      .map(c => ({
        name: c.name,
        roles: c.roles || [],
        emails: c.emails || [],
        phones: c.phones || []
      }));

    const { error: updateError } = await supabase
      .from("global_call_sheets")
      .update({ canonical_producers: canonicalProducers })
      .eq("id", sheet.id);

    if (updateError) {
      console.error(`[build-intelligence-data] Failed to backfill sheet ${sheet.id}:`, updateError);
      continue;
    }

    backfilled++;
    totalProducers += canonicalProducers.length;
  }

  console.log(`[build-intelligence-data] Backfill complete: ${backfilled} sheets, ${totalProducers} canonical producers locked`);

  return {
    sheetsBackfilled: backfilled,
    totalProducersLocked: totalProducers,
  };
}

export const config = { verify_jwt: true };
