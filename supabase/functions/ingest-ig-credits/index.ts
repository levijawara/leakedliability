import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IGHandle {
  handle: string;
  roles: string[];
  co_workers: string[];
  raw_credits: string[];
  occurrences: number;
}

// Parse IG credit text to extract handles and roles
function parseIGCredits(text: string): IGHandle[] {
  const handles: Map<string, IGHandle> = new Map();
  
  // Common patterns for IG credits:
  // @handle - Role
  // @handle (Role)
  // Role: @handle
  // @handle
  const patterns = [
    /(@[\w.]+)\s*[-–—]\s*(.+?)(?=\n|@|$)/gi,
    /(@[\w.]+)\s*\(([^)]+)\)/gi,
    /([A-Za-z\s]+):\s*(@[\w.]+)/gi,
    /(@[\w.]+)/gi,
  ];

  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try to match @handle - Role pattern
    const dashMatch = trimmed.match(/(@[\w.]+)\s*[-–—]\s*(.+)/i);
    if (dashMatch) {
      const handle = dashMatch[1].toLowerCase();
      const role = dashMatch[2].trim();
      
      if (!handles.has(handle)) {
        handles.set(handle, {
          handle,
          roles: [],
          co_workers: [],
          raw_credits: [],
          occurrences: 0,
        });
      }
      
      const entry = handles.get(handle)!;
      if (role && !entry.roles.includes(role)) {
        entry.roles.push(role);
      }
      if (!entry.raw_credits.includes(trimmed)) {
        entry.raw_credits.push(trimmed);
      }
      entry.occurrences++;
      continue;
    }

    // Try to match @handle (Role) pattern
    const parenMatch = trimmed.match(/(@[\w.]+)\s*\(([^)]+)\)/i);
    if (parenMatch) {
      const handle = parenMatch[1].toLowerCase();
      const role = parenMatch[2].trim();
      
      if (!handles.has(handle)) {
        handles.set(handle, {
          handle,
          roles: [],
          co_workers: [],
          raw_credits: [],
          occurrences: 0,
        });
      }
      
      const entry = handles.get(handle)!;
      if (role && !entry.roles.includes(role)) {
        entry.roles.push(role);
      }
      if (!entry.raw_credits.includes(trimmed)) {
        entry.raw_credits.push(trimmed);
      }
      entry.occurrences++;
      continue;
    }

    // Try to match Role: @handle pattern
    const colonMatch = trimmed.match(/([A-Za-z\s]+):\s*(@[\w.]+)/i);
    if (colonMatch) {
      const role = colonMatch[1].trim();
      const handle = colonMatch[2].toLowerCase();
      
      if (!handles.has(handle)) {
        handles.set(handle, {
          handle,
          roles: [],
          co_workers: [],
          raw_credits: [],
          occurrences: 0,
        });
      }
      
      const entry = handles.get(handle)!;
      if (role && !entry.roles.includes(role)) {
        entry.roles.push(role);
      }
      if (!entry.raw_credits.includes(trimmed)) {
        entry.raw_credits.push(trimmed);
      }
      entry.occurrences++;
      continue;
    }

    // Match standalone @handles
    const standaloneMatches = trimmed.match(/@[\w.]+/gi);
    if (standaloneMatches) {
      for (const match of standaloneMatches) {
        const handle = match.toLowerCase();
        
        if (!handles.has(handle)) {
          handles.set(handle, {
            handle,
            roles: [],
            co_workers: [],
            raw_credits: [],
            occurrences: 0,
          });
        }
        
        const entry = handles.get(handle)!;
        if (!entry.raw_credits.includes(trimmed)) {
          entry.raw_credits.push(trimmed);
        }
        entry.occurrences++;
      }
    }
  }

  // Extract co-workers (handles that appear on the same line)
  for (const line of lines) {
    const handlesInLine = line.match(/@[\w.]+/gi);
    if (handlesInLine && handlesInLine.length > 1) {
      for (const h1 of handlesInLine) {
        const handle1 = h1.toLowerCase();
        const entry = handles.get(handle1);
        if (entry) {
          for (const h2 of handlesInLine) {
            const handle2 = h2.toLowerCase();
            if (handle1 !== handle2 && !entry.co_workers.includes(handle2)) {
              entry.co_workers.push(handle2);
            }
          }
        }
      }
    }
  }

  return Array.from(handles.values());
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, source } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[ingest-ig-credits] Parsing IG credits from text, length:", text.length);

    // Parse the IG credits
    const parsedHandles = parseIGCredits(text);
    console.log("[ingest-ig-credits] Parsed", parsedHandles.length, "unique handles");

    if (parsedHandles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No IG handles found in text",
          inserted: 0,
          updated: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use the upsert_ig_handles RPC function
    const { data, error } = await supabase.rpc("upsert_ig_handles", {
      handles_data: parsedHandles.map(h => ({
        handle: h.handle,
        roles: h.roles,
        co_workers: h.co_workers,
        raw_credits: h.raw_credits,
        occurrences: h.occurrences,
      })),
    });

    if (error) {
      console.error("[ingest-ig-credits] RPC error:", error);
      throw error;
    }

    console.log("[ingest-ig-credits] Upsert result:", data);

    return new Response(
      JSON.stringify({
        success: true,
        handles_parsed: parsedHandles.length,
        result: data,
        source: source || "unknown",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[ingest-ig-credits] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to ingest IG credits";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
