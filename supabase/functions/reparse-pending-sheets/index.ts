import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      statuses = ["parsed", "error"], 
      limit = 50,
      olderThanDays = 0 
    } = await req.json().catch(() => ({}));

    console.log("[reparse-pending-sheets] Starting reparse for statuses:", statuses);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query for sheets to reparse
    let query = supabase
      .from("call_sheets")
      .select("id, file_name, status, parsed_date, user_id")
      .in("status", statuses)
      .order("uploaded_at", { ascending: true })
      .limit(limit);

    // Optionally filter by age
    if (olderThanDays > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      query = query.lt("parsed_date", cutoffDate.toISOString());
    }

    const { data: sheets, error: fetchError } = await query;

    if (fetchError) {
      console.error("[reparse-pending-sheets] Fetch error:", fetchError);
      throw fetchError;
    }

    if (!sheets || sheets.length === 0) {
      console.log("[reparse-pending-sheets] No sheets found matching criteria");
      return new Response(
        JSON.stringify({ 
          success: true, 
          queued: 0, 
          message: "No sheets found matching criteria" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[reparse-pending-sheets] Found", sheets.length, "sheets to requeue");

    // Reset status to 'queued' for reprocessing
    const sheetIds = sheets.map(s => s.id);
    
    const { error: updateError } = await supabase
      .from("call_sheets")
      .update({ 
        status: "queued",
        parsed_date: null,
        contacts_extracted: null,
        parsed_contacts: null,
      })
      .in("id", sheetIds);

    if (updateError) {
      console.error("[reparse-pending-sheets] Update error:", updateError);
      throw updateError;
    }

    // Optionally delete existing contacts from these sheets
    // (to avoid duplicates on reparse)
    const filePaths = sheets.map(s => s.file_name);
    
    // Delete contacts that have these sheets as their ONLY source
    const { data: contactsToCheck } = await supabase
      .from("crew_contacts")
      .select("id, source_files")
      .overlaps("source_files", filePaths);

    if (contactsToCheck && contactsToCheck.length > 0) {
      const contactsToDelete = contactsToCheck.filter((c: { id: string; source_files: string[] | null }) => {
        // Delete if all source files are being reparsed
        const sources = c.source_files || [];
        return sources.every((s: string) => filePaths.includes(s));
      });

      if (contactsToDelete.length > 0) {
        const deleteIds = contactsToDelete.map((c: { id: string }) => c.id);
        await supabase
          .from("crew_contacts")
          .delete()
          .in("id", deleteIds);
        
        console.log("[reparse-pending-sheets] Deleted", deleteIds.length, "contacts for clean reparse");
      }
    }

    console.log("[reparse-pending-sheets] Successfully queued", sheets.length, "sheets for reparse");

    return new Response(
      JSON.stringify({
        success: true,
        queued: sheets.length,
        sheet_ids: sheetIds,
        statuses_targeted: statuses,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[reparse-pending-sheets] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to requeue sheets";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
