import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import PDF.js with proper Deno-compatible CDN
import { getDocument, GlobalWorkerOptions } from "https://esm.sh/pdfjs-dist@4.4.168/build/pdf.min.mjs";

// Disable worker since we're in a serverless environment
GlobalWorkerOptions.workerSrc = "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedContact {
  name: string;
  role?: string;
  roles?: string[];
  department?: string;
  departments?: string[];
  phone?: string;
  phones?: string[];
  email?: string;
  emails?: string[];
  ig_handle?: string;
  instagram_handle?: string;
  confidence: number;
}

interface NormalizedContact {
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
  confidence: number;
}

interface CallSheet {
  id: string;
  file_path: string;
  user_id: string;
  status?: string;
  updated_at?: string;
}

// AI prompt for parsing call sheet content
const PARSE_PROMPT = `You are a call sheet parser. Extract crew contacts from this call sheet content.

For each person found, extract:
- name: Full name
- roles: Array of job titles/roles (e.g., ["Director", "Producer"])
- departments: Array of departments (e.g., ["Camera", "Production"])
- phones: Array of phone numbers (formatted as strings)
- emails: Array of email addresses
- ig_handle: Instagram handle if found (without @)
- confidence: 0.0-1.0 score based on data completeness

Return ONLY a JSON array of contacts. Example:
[
  {
    "name": "John Smith",
    "roles": ["Director of Photography"],
    "departments": ["Camera"],
    "phones": ["555-123-4567"],
    "emails": ["john@example.com"],
    "ig_handle": "johnsmith_dp",
    "confidence": 0.95
  }
]

If you cannot parse any contacts, return an empty array: []

Call sheet content:
`;

/**
 * Watchdog: Auto-fail sheets stuck in "parsing" for > 5 minutes
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
    console.error("[parse-queue] Watchdog: Error checking stuck sheets:", error);
    return 0;
  }
  
  if (!stuckSheets || stuckSheets.length === 0) {
    console.log("[parse-queue] Watchdog: No stuck sheets found");
    return 0;
  }
  
  console.log(`[parse-queue] Watchdog: Found ${stuckSheets.length} stuck sheet(s), marking as error`);
  
  for (const sheet of stuckSheets) {
    await supabase
      .from("call_sheets")
      .update({
        status: "error",
        error_message: "Parser timeout (exceeded 5 minutes)",
      } as Record<string, unknown>)
      .eq("id", sheet.id);
    
    console.log(`[parse-queue] Watchdog: Marked sheet ${sheet.id} as error (timeout)`);
  }
  
  return stuckSheets.length;
}

/**
 * Extract text from PDF using pdfjs
 */
async function extractPdfText(pdfBytes: Uint8Array): Promise<{ text: string; pageCount: number; chars: number }> {
  console.log("[parse-queue] PDF.js: Starting text extraction...");
  
  // Verify PDF.js is loaded correctly
  if (typeof getDocument !== "function") {
    console.error("[parse-queue] PDF.js: getDocument not available");
    throw new Error("PDF.js library not loaded correctly");
  }
  
  console.log("[parse-queue] PDF.js: Library loaded successfully");
  
  try {
    const loadingTask = getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;
    
    const pageCount = pdf.numPages;
    console.log(`[parse-queue] PDF.js: Document loaded, ${pageCount} pages`);
    
    let fullText = "";
    
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: unknown) => {
          const textItem = item as { str?: string };
          return textItem.str || "";
        })
        .join(" ");
      
      fullText += `\n--- PAGE ${i} ---\n${pageText}`;
      console.log(`[parse-queue] PDF.js: Page ${i}/${pageCount} extracted, ${pageText.length} chars`);
    }
    
    const chars = fullText.length;
    console.log(`[parse-queue] PDF.js: Extraction complete - ${chars} total characters from ${pageCount} pages`);
    
    return { text: fullText.trim(), pageCount, chars };
  } catch (error: unknown) {
    console.error("[parse-queue] PDF.js: Extraction error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to extract PDF text: ${message}`);
  }
}

/**
 * Normalize contact fields to consistent schema
 */
function normalizeContact(raw: ParsedContact): NormalizedContact {
  const roles = Array.isArray(raw.roles) ? raw.roles : (raw.role ? [raw.role] : []);
  const departments = Array.isArray(raw.departments) ? raw.departments : (raw.department ? [raw.department] : []);
  const phones = Array.isArray(raw.phones) ? raw.phones : (raw.phone ? [raw.phone] : []);
  const emails = Array.isArray(raw.emails) ? raw.emails : (raw.email ? [raw.email] : []);
  const igHandle = raw.ig_handle || raw.instagram_handle || null;
  
  return {
    name: String(raw.name || "Unknown").trim(),
    roles: roles.map(r => String(r).trim()).filter(Boolean),
    departments: departments.map(d => String(d).trim()).filter(Boolean),
    phones: phones.map(p => String(p).trim()).filter(Boolean),
    emails: emails.map(e => String(e).trim().toLowerCase()).filter(Boolean),
    ig_handle: igHandle ? String(igHandle).replace(/^@/, "").trim() : null,
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0.5,
  };
}

async function parseWithAI(content: string): Promise<NormalizedContact[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("[parse-queue] AI: LOVABLE_API_KEY not configured");
    throw new Error("AI Gateway not configured");
  }

  console.log(`[parse-queue] AI: Sending ${content.length} chars to model...`);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-5-mini",
      messages: [
        {
          role: "user",
          content: PARSE_PROMPT + content.substring(0, 15000),
        },
      ],
      max_completion_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[parse-queue] AI: Gateway error:", errorText);
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content || "[]";
  console.log("[parse-queue] AI: Response received, length:", aiResponse.length);

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = aiResponse;
  const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const contacts = JSON.parse(jsonStr);
    if (!Array.isArray(contacts)) {
      console.error("[parse-queue] AI: Response is not an array");
      return [];
    }
    
    const normalized = contacts.map(normalizeContact);
    console.log(`[parse-queue] AI: Parsed and normalized ${normalized.length} contacts`);
    return normalized;
  } catch (e) {
    console.error("[parse-queue] AI: Failed to parse response as JSON:", e);
    return [];
  }
}

/**
 * Process a single call sheet with GUARANTEED terminal state
 */
async function processCallSheet(
  supabase: SupabaseClient,
  sheet: CallSheet
): Promise<{ success: boolean; contacts: number; error?: string }> {
  console.log(`[parse-queue] === START Processing sheet ${sheet.id} ===`);
  console.log(`[parse-queue] File path: ${sheet.file_path}`);
  
  // Track state for finally block
  let finalStatus: "parsed" | "error" = "error";
  let errorMessage: string | null = null;
  let parsedContacts: NormalizedContact[] = [];
  let parsedContactsForStorage: Record<string, unknown>[] = [];

  try {
    // Update status to parsing immediately
    console.log("[parse-queue] Setting status to 'parsing'...");
    await supabase
      .from("call_sheets")
      .update({ 
        status: "parsing",
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("id", sheet.id);

    // Download file from storage
    console.log("[parse-queue] Downloading file from storage...");
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("call_sheets")
      .download(sheet.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || "No data"}`);
    }

    console.log(`[parse-queue] File downloaded successfully, size: ${fileData.size} bytes`);

    // Convert to text (handle different file types)
    let textContent = "";
    const fileName = sheet.file_path.toLowerCase();
    
    if (fileName.endsWith(".txt") || fileName.endsWith(".csv")) {
      textContent = await fileData.text();
      console.log(`[parse-queue] Text file extracted, length: ${textContent.length} chars`);
    } else if (fileName.endsWith(".pdf")) {
      console.log("[parse-queue] Processing as PDF...");
      const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
      const { text, pageCount, chars } = await extractPdfText(pdfBytes);
      
      if (chars < 50) {
        throw new Error("PDF has no extractable text (may be scanned/image-based)");
      }
      
      textContent = text;
      console.log(`[parse-queue] PDF processed: ${pageCount} pages, ${chars} chars`);
    } else {
      // Try to read as text
      textContent = await fileData.text();
      console.log(`[parse-queue] Other file type extracted, length: ${textContent.length} chars`);
    }

    if (!textContent || textContent.length < 10) {
      throw new Error("File content too short or empty");
    }

    // Parse with AI
    console.log("[parse-queue] Calling AI to parse contacts...");
    parsedContacts = await parseWithAI(textContent);
    console.log(`[parse-queue] AI returned ${parsedContacts.length} contacts`);

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
        needs_review: c.confidence < 0.7,
      }));

      const { error: insertError } = await supabase
        .from("crew_contacts")
        .insert(contactsToInsert as Record<string, unknown>[]);

      if (insertError) {
        console.error("[parse-queue] Insert error (non-fatal):", insertError);
      } else {
        console.log(`[parse-queue] Inserted ${contactsToInsert.length} contacts into crew_contacts`);
      }
    }

    // Prepare contacts for storage in call_sheets.parsed_contacts
    parsedContactsForStorage = parsedContacts.map(c => ({
      name: c.name,
      role: c.roles[0] || "",
      department: c.departments[0] || "",
      phone: c.phones[0] || null,
      email: c.emails[0] || null,
      instagram_handle: c.ig_handle,
      confidence: c.confidence,
    }));

    // Mark success
    finalStatus = "parsed";
    console.log(`[parse-queue] Processing succeeded with ${parsedContacts.length} contacts`);

  } catch (err: unknown) {
    // Capture error for finally block
    errorMessage = err instanceof Error ? err.message : "Unknown processing error";
    finalStatus = "error";
    console.error(`[parse-queue] Processing FAILED: ${errorMessage}`);
  } finally {
    // GUARANTEED terminal state update - this ALWAYS runs
    console.log(`[parse-queue] FINALLY: Writing terminal state -> ${finalStatus}`);
    
    const updatePayload: Record<string, unknown> = {
      status: finalStatus,
      parsed_date: new Date().toISOString(),
      contacts_extracted: parsedContacts.length,
      parsed_contacts: parsedContactsForStorage,
      updated_at: new Date().toISOString(),
    };
    
    if (errorMessage) {
      // Truncate error message to avoid DB issues
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
        .select("id, file_path, user_id, status, updated_at")
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
        .select("id, file_path, user_id, updated_at")
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

    // Process each sheet
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
        total_contacts: totalContacts,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[parse-queue] FATAL ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to process queue";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
