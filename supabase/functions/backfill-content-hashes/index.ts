import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Compute SHA-256 hash of content
async function computeHash(content: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", content);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { limit = 100 } = await req.json().catch(() => ({}));

    console.log("[backfill-content-hashes] Starting backfill, limit:", limit);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch call sheets missing content_hash
    const { data: sheets, error: fetchError } = await supabase
      .from("call_sheets")
      .select("id, file_path, user_id")
      .is("content_hash", null)
      .limit(limit);

    if (fetchError) {
      console.error("[backfill-content-hashes] Fetch error:", fetchError);
      throw fetchError;
    }

    if (!sheets || sheets.length === 0) {
      console.log("[backfill-content-hashes] No sheets missing content_hash");
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: 0, 
          message: "All sheets have content hashes" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[backfill-content-hashes] Found", sheets.length, "sheets to process");

    let successCount = 0;
    let errorCount = 0;
    const errors: { id: string; error: string }[] = [];

    for (const sheet of sheets) {
      try {
        // Download file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("call_sheets")
          .download(sheet.file_path);

        if (downloadError || !fileData) {
          console.error("[backfill-content-hashes] Download error for", sheet.id, downloadError);
          errors.push({ id: sheet.id, error: "Download failed" });
          errorCount++;
          continue;
        }

        // Compute hash
        const arrayBuffer = await fileData.arrayBuffer();
        const hash = await computeHash(arrayBuffer);

        // Update the sheet
        const { error: updateError } = await supabase
          .from("call_sheets")
          .update({ content_hash: hash })
          .eq("id", sheet.id);

        if (updateError) {
          console.error("[backfill-content-hashes] Update error for", sheet.id, updateError);
          errors.push({ id: sheet.id, error: "Update failed" });
          errorCount++;
          continue;
        }

        successCount++;
        console.log("[backfill-content-hashes] Hashed sheet", sheet.id, ":", hash.substring(0, 16) + "...");
      } catch (err: unknown) {
        console.error("[backfill-content-hashes] Error processing", sheet.id, err);
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        errors.push({ id: sheet.id, error: errMsg });
        errorCount++;
      }
    }

    console.log("[backfill-content-hashes] Completed. Success:", successCount, "Errors:", errorCount);

    return new Response(
      JSON.stringify({
        success: true,
        processed: sheets.length,
        successful: successCount,
        failed: errorCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[backfill-content-hashes] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to backfill hashes";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
