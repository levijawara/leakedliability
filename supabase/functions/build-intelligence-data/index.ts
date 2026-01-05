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

    if (action === "build_network" || action === "all") {
      // Build network from parsed contacts
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

async function buildNetworkFromParsedContacts(supabase: ReturnType<typeof createClient>) {
  console.log("[build-intelligence-data] Building network from parsed contacts (PRODUCERS ONLY)...");

  // Get all parsed call sheets
  const { data: sheets, error: sheetsError } = await supabase
    .from("global_call_sheets")
    .select("id, parsed_contacts, project_title")
    .not("parsed_contacts", "is", null);

  if (sheetsError) {
    console.error("[build-intelligence-data] Failed to fetch sheets:", sheetsError);
    return { error: sheetsError.message };
  }

  if (!sheets || sheets.length === 0) {
    return { message: "No parsed call sheets found" };
  }

  let nodesCreated = 0;
  let nodesSkipped = 0;
  let edgesCreated = 0;
  let edgesUpdated = 0;

  // Process each sheet
  for (const sheet of sheets) {
    const contacts = sheet.parsed_contacts as ParsedContact[] | null;
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) continue;

    const contactGroups: string[] = [];

    // Create/update identity groups for each contact - ONLY PRODUCERS
    for (const contact of contacts) {
      if (!contact.name || contact.name.trim() === "") continue;

      // FILTER: Only process contacts with producer roles
      const isProducer = hasProducerRole(contact.roles);
      if (!isProducer) {
        nodesSkipped++;
        continue;
      }

      // Check if identity group already exists
      const { data: existingGroup } = await supabase
        .from("identity_groups")
        .select("id")
        .eq("canonical_name", contact.name.trim())
        .maybeSingle();

      let groupId: string;

      if (existingGroup) {
        groupId = existingGroup.id;
        
        // Update project count
        await supabase
          .from("identity_groups")
          .update({ 
            project_count: supabase.rpc("increment", { x: 1 }),
            updated_at: new Date().toISOString()
          })
          .eq("id", groupId);
      } else {
        // Create new identity group
        const { data: newGroup, error: createError } = await supabase
          .from("identity_groups")
          .insert({
            canonical_name: contact.name.trim(),
            emails: contact.emails || [],
            phones: contact.phones || [],
            roles: contact.roles || [],
            is_producer: isProducer,
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
            display_name: contact.name.trim(),
            roles: contact.roles || [],
            project_count: 1,
            is_producer: isProducer,
          }, { onConflict: "identity_group_id" });
      }

      contactGroups.push(groupId);
    }

    // Create edges between all pairs of contacts on this sheet
    for (let i = 0; i < contactGroups.length; i++) {
      for (let j = i + 1; j < contactGroups.length; j++) {
        const sourceId = contactGroups[i];
        const targetId = contactGroups[j];
        
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

  console.log(`[build-intelligence-data] Network build complete: ${nodesCreated} producer nodes created, ${nodesSkipped} non-producers skipped, ${edgesCreated} new edges, ${edgesUpdated} updated edges`);

  return {
    sheetsProcessed: sheets.length,
    nodesCreated,
    nodesSkipped,
    edgesCreated,
    edgesUpdated,
  };
}

export const config = { verify_jwt: true };
