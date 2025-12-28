/**
 * parse-queue: Background queue processor for call sheets
 * Uses shared modules for unified parsing logic
 * Guarantees terminal state (parsed/error) for every sheet
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractTextFromFile } from "../_shared/pdfExtractor.ts";
import { parseCallSheetText, normalizeContact, type NormalizedContact } from "../_shared/callSheetParser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CallSheet {
  id: string;
  file_path: string;
  file_name: string;
  user_id: string;
  status?: string;
  updated_at?: string;
}

/**
 * Watchdog: Auto-fail sheets stuck in "parsing" for > 5 minutes
 * Uses updated_at column (now exists after migration)
 */
async function unstickOldParsingSheets(supabase: SupabaseClient): Promise<number> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  console.log("[parse-queue] Watchdog: Checking for sheets stuck in parsing...");
  
  const { data: stuckSheets, error } = await supabase
    .from("call_sheets")
    .select("id, updated_at")
    .eq("status", "parsing")
    .lt("updated_at", fiveMinutesAgo);
  
  if (error) {
    console.error("[parse-queue] Watchdog error:", error);
    return 0;
  }
  
  if (!stuckSheets || stuckSheets.length === 0) {
    console.log("[parse-queue] Watchdog: No stuck sheets found");
    return 0;
  }
  
  console.log(`[parse-queue] Watchdog: Found ${stuckSheets.length} stuck sheet(s)`);
  
  for (const sheet of stuckSheets) {
    await supabase
      .from("call_sheets")
      .update({
        status: "error",
        error_message: "Parser timeout (exceeded 5 minutes)",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sheet.id);
    
    console.log(`[parse-queue] Watchdog: Marked sheet ${sheet.id} as error (timeout)`);
  }
  
  return stuckSheets.length;
}

/**
 * Process a single call sheet with GUARANTEED terminal state
 */
async function processCallSheet(
  supabase: SupabaseClient,
  sheet: CallSheet
): Promise<{ success: boolean; contacts: number; error?: string }> {
  console.log(`[parse-queue] === START Processing sheet ${sheet.id} ===`);
  console.log(`[parse-queue] File: ${sheet.file_name || sheet.file_path}`);
  
  // Track state for finally block
  let finalStatus: "parsed" | "error" = "error";
  let errorMessage: string | null = null;
  let parsedContacts: NormalizedContact[] = [];
  let pageCount = 0;

  try {
    // Update status to parsing immediately
    console.log("[parse-queue] Setting status to 'parsing'...");
    await supabase
      .from("call_sheets")
      .update({ 
        status: "parsing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sheet.id);

    // Download file from storage
    console.log("[parse-queue] Downloading file from storage...");
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("call_sheets")
      .download(sheet.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || "No data"}`);
    }

    console.log(`[parse-queue] File downloaded: ${fileData.size} bytes`);

    // Extract text using shared module
    const fileName = sheet.file_name || sheet.file_path.split('/').pop() || 'unknown';
    const extraction = await extractTextFromFile(fileData, fileName);
    
    pageCount = extraction.pageCount;
    console.log(`[parse-queue] Extracted ${extraction.text.length} chars from ${pageCount} pages`);

    if (!extraction.text || extraction.text.length < 10) {
      throw new Error("File content too short or empty");
    }

    // Parse with shared module (AI + cleanup + fallback)
    console.log("[parse-queue] Parsing contacts...");
    const parseResult = await parseCallSheetText(extraction.text, {
      useAI: true,
      includeCleanup: true,
    });

    parsedContacts = parseResult.contacts;
    console.log(`[parse-queue] Parsed ${parsedContacts.length} contacts via ${parseResult.parsing_method}`);

    // Insert contacts into crew_contacts
    if (parsedContacts.length > 0) {
      console.log("[parse-queue] Inserting contacts into crew_contacts...");
      const contactsToInsert = parsedContacts.map(c => ({
        user_id: sheet.user_id,
        name: c.name,
        roles: c.roles,
        departments: c.departments,
        phones: c.phones,
        emails: c.emails,
        ig_handle: c.ig_handle,
        confidence: c.confidence,
        source_files: [sheet.file_path],
        needs_review: c.needs_review,
      }));

      const { error: insertError } = await supabase
        .from("crew_contacts")
        .insert(contactsToInsert);

      if (insertError) {
        console.error("[parse-queue] Insert error (non-fatal):", insertError);
      } else {
        console.log(`[parse-queue] Inserted ${contactsToInsert.length} contacts`);
      }
    }

    // Mark success
    finalStatus = "parsed";
    console.log(`[parse-queue] Processing succeeded: ${parsedContacts.length} contacts`);

  } catch (err: unknown) {
    // Capture error for finally block
    errorMessage = err instanceof Error ? err.message : "Unknown processing error";
    finalStatus = "error";
    console.error(`[parse-queue] Processing FAILED: ${errorMessage}`);
  } finally {
    // GUARANTEED terminal state update - this ALWAYS runs
    console.log(`[parse-queue] FINALLY: Writing terminal state -> ${finalStatus}`);
    
    // Prepare contacts for storage in parsed_contacts column
    const parsedContactsForStorage = parsedContacts.map(c => ({
      name: c.name,
      role: c.roles[0] || "",
      department: c.departments[0] || "",
      phone: c.phones[0] || null,
      email: c.emails[0] || null,
      instagram_handle: c.ig_handle,
      confidence: c.confidence,
    }));

    const updatePayload: Record<string, unknown> = {
      status: finalStatus,
      parsed_date: new Date().toISOString(),
      contacts_extracted: parsedContacts.length,
      parsed_contacts: errorMessage 
        ? [{ _error: errorMessage.substring(0, 500) }] 
        : parsedContactsForStorage,
      updated_at: new Date().toISOString(),
    };
    
    if (errorMessage) {
      updatePayload.error_message = errorMessage.substring(0, 500);
    }
    
    const { error: updateError } = await supabase
      .from("call_sheets")
      .update(updatePayload)
      .eq("id", sheet.id);
    
    if (updateError) {
      console.error(`[parse-queue] CRITICAL: Failed to write terminal state:`, updateError);
    } else {
      console.log(`[parse-queue] Terminal state written: ${finalStatus} (${parsedContacts.length} contacts)`);
    }
    
    console.log(`[parse-queue] === END Processing sheet ${sheet.id} ===`);
  }

  return {
    success: finalStatus === "parsed",
    contacts: parsedContacts.length,
    error: errorMessage || undefined,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { limit = 5, callSheetId } = body;

    console.log("[parse-queue] ========================================");
    console.log("[parse-queue] Function invoked");
    console.log("[parse-queue] Limit:", limit, "| callSheetId:", callSheetId || "none");
    console.log("[parse-queue] ========================================");

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Run watchdog first to clean up any stuck sheets
    const unstuckCount = await unstickOldParsingSheets(supabase);
    if (unstuckCount > 0) {
      console.log(`[parse-queue] Watchdog cleaned up ${unstuckCount} stuck sheet(s)`);
    }

    let queuedSheets: CallSheet[] = [];

    if (callSheetId) {
      // Process specific sheet by ID (allow reprocessing)
      console.log("[parse-queue] Fetching specific sheet:", callSheetId);
      const { data, error: fetchError } = await supabase
        .from("call_sheets")
        .select("id, file_path, file_name, user_id, status, updated_at")
        .eq("id", callSheetId)
        .single();

      if (fetchError) {
        console.error("[parse-queue] Fetch error:", fetchError);
        return new Response(
          JSON.stringify({ success: false, error: "Sheet not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (data) {
        queuedSheets = [data as CallSheet];
        console.log("[parse-queue] Found sheet, current status:", data.status);
      }
    } else {
      // Process oldest queued sheets
      console.log("[parse-queue] Fetching queued sheets...");
      const { data, error: fetchError } = await supabase
        .from("call_sheets")
        .select("id, file_path, file_name, user_id, updated_at")
        .eq("status", "queued")
        .order("uploaded_at", { ascending: true })
        .limit(limit);

      if (fetchError) {
        console.error("[parse-queue] Fetch error:", fetchError);
        throw fetchError;
      }

      queuedSheets = (data || []) as CallSheet[];
      console.log("[parse-queue] Found", queuedSheets.length, "queued sheet(s)");
    }

    if (queuedSheets.length === 0) {
      console.log("[parse-queue] No sheets to process");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No sheets in queue" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[parse-queue] Processing", queuedSheets.length, "sheet(s)...");

    // Process each sheet sequentially
    const results = [];
    for (const sheet of queuedSheets) {
      const result = await processCallSheet(supabase, sheet);
      results.push({ id: sheet.id, ...result });
    }

    const successCount = results.filter(r => r.success).length;
    const totalContacts = results.reduce((sum, r) => sum + r.contacts, 0);

    console.log("[parse-queue] ========================================");
    console.log("[parse-queue] COMPLETED");
    console.log("[parse-queue] Processed:", queuedSheets.length, "| Success:", successCount, "| Contacts:", totalContacts);
    console.log("[parse-queue] ========================================");

    return new Response(
      JSON.stringify({
        success: true,
        processed: queuedSheets.length,
        successful: successCount,
        totalContacts,
        results,
        watchdogUnstuck: unstuckCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[parse-queue] Fatal error:", message);
    
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
