import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const config = { verify_jwt: true };

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[queue-firecrawl-priority] Starting...");

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin access via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[queue-firecrawl-priority] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin role using has_role RPC
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error("[queue-firecrawl-priority] Admin check failed:", roleError);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { callSheetIds } = await req.json();

    if (!callSheetIds || !Array.isArray(callSheetIds) || callSheetIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "callSheetIds array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[queue-firecrawl-priority] Processing ${callSheetIds.length} call sheets for priority parsing`);

    // Update all selected call sheets to queue them for priority processing
    const { data: updated, error: updateError } = await supabase
      .from("global_call_sheets")
      .update({
        status: "queued",
        extraction_mode: "firecrawl_priority",
        last_priority_requested_at: new Date().toISOString(),
        error_message: null,
        retry_count: 0,
        parsing_started_at: null,
      })
      .in("id", callSheetIds)
      .select("id");

    if (updateError) {
      console.error("[queue-firecrawl-priority] Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to queue call sheets", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updatedCount = updated?.length || 0;
    console.log(`[queue-firecrawl-priority] Successfully queued ${updatedCount} call sheets for priority processing`);

    // Log audit entry
    await supabase.from("audit_logs").insert({
      event_type: "firecrawl_priority_queued",
      user_id: user.id,
      payload: {
        call_sheet_ids: callSheetIds,
        updated_count: updatedCount,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: updatedCount,
        message: `Queued ${updatedCount} call sheets for Firecrawl priority parsing`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[queue-firecrawl-priority] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
