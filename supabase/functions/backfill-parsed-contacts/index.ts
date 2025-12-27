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
    const { limit = 100 } = await req.json().catch(() => ({}));

    console.log("[backfill-parsed-contacts] Starting backfill, limit:", limit);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch call sheets that are parsed but missing parsed_contacts JSON
    const { data: sheets, error: fetchError } = await supabase
      .from("call_sheets")
      .select("id, file_name, file_path, user_id")
      .eq("status", "parsed")
      .is("parsed_contacts", null)
      .limit(limit);

    if (fetchError) {
      console.error("[backfill-parsed-contacts] Fetch error:", fetchError);
      throw fetchError;
    }

    if (!sheets || sheets.length === 0) {
      console.log("[backfill-parsed-contacts] No sheets missing parsed_contacts");
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: 0, 
          message: "All parsed sheets have parsed_contacts" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[backfill-parsed-contacts] Found", sheets.length, "sheets to backfill");

    let successCount = 0;
    let errorCount = 0;
    const results: { id: string; contacts: number }[] = [];

    for (const sheet of sheets) {
      try {
        // Find contacts that reference this sheet's file in source_files
        const { data: contacts, error: contactsError } = await supabase
          .from("crew_contacts")
          .select("name, roles, departments, phones, emails, ig_handle, confidence")
          .eq("user_id", sheet.user_id)
          .contains("source_files", [sheet.file_path]);

        if (contactsError) {
          console.error("[backfill-parsed-contacts] Contacts fetch error for", sheet.id, contactsError);
          errorCount++;
          continue;
        }

        // Also try matching by file_name in case file_path doesn't match
        const { data: contactsByName } = await supabase
          .from("crew_contacts")
          .select("name, roles, departments, phones, emails, ig_handle, confidence")
          .eq("user_id", sheet.user_id)
          .contains("source_files", [sheet.file_name]);

        // Combine and deduplicate
        const allContacts = [...(contacts || []), ...(contactsByName || [])];
        const uniqueContacts = allContacts.filter((c, i, arr) => 
          arr.findIndex(x => x.name === c.name) === i
        );

        // Update the sheet with parsed_contacts
        const { error: updateError } = await supabase
          .from("call_sheets")
          .update({ 
            parsed_contacts: uniqueContacts,
            contacts_extracted: uniqueContacts.length,
          })
          .eq("id", sheet.id);

        if (updateError) {
          console.error("[backfill-parsed-contacts] Update error for", sheet.id, updateError);
          errorCount++;
          continue;
        }

        successCount++;
        results.push({ id: sheet.id, contacts: uniqueContacts.length });
        console.log("[backfill-parsed-contacts] Backfilled sheet", sheet.id, "with", uniqueContacts.length, "contacts");
      } catch (error) {
        console.error("[backfill-parsed-contacts] Error processing", sheet.id, error);
        errorCount++;
      }
    }

    console.log("[backfill-parsed-contacts] Completed. Success:", successCount, "Errors:", errorCount);

    return new Response(
      JSON.stringify({
        success: true,
        processed: sheets.length,
        successful: successCount,
        failed: errorCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[backfill-parsed-contacts] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to backfill parsed contacts";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
