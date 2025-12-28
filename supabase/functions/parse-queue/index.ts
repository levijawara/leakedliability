import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdfjs from "https://esm.sh/pdfjs-dist@3.11.174/build/pdf.mjs";

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
 * Extract text from PDF using pdfjs
 */
async function extractPdfText(pdfBytes: Uint8Array): Promise<{ text: string; pageCount: number; chars: number }> {
  console.log("[parse-queue] Extracting text from PDF...");
  
  try {
    const loadingTask = pdfjs.getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;
    
    const pageCount = pdf.numPages;
    console.log(`[parse-queue] PDF has ${pageCount} pages`);
    
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
    }
    
    const chars = fullText.length;
    console.log(`[parse-queue] Extracted ${chars} characters from ${pageCount} pages`);
    
    return { text: fullText.trim(), pageCount, chars };
  } catch (error: unknown) {
    console.error("[parse-queue] PDF extraction error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to extract PDF text: ${message}`);
  }
}

/**
 * Normalize contact fields to consistent schema
 */
function normalizeContact(raw: ParsedContact): NormalizedContact {
  // Handle both singular and array fields
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
    console.error("[parse-queue] LOVABLE_API_KEY not configured");
    throw new Error("AI Gateway not configured");
  }

  console.log(`[parse-queue] Sending ${content.length} chars to AI...`);

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
    console.error("[parse-queue] AI Gateway error:", errorText);
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content || "[]";
  console.log("[parse-queue] AI response length:", aiResponse.length);

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = aiResponse;
  const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const contacts = JSON.parse(jsonStr);
    if (!Array.isArray(contacts)) {
      console.error("[parse-queue] AI response is not an array");
      return [];
    }
    
    // Normalize all contacts
    const normalized = contacts.map(normalizeContact);
    console.log(`[parse-queue] Normalized ${normalized.length} contacts`);
    return normalized;
  } catch (e) {
    console.error("[parse-queue] Failed to parse AI response:", e);
    return [];
  }
}

async function processCallSheet(
  supabase: SupabaseClient,
  sheet: CallSheet
): Promise<{ success: boolean; contacts: number; error?: string }> {
  console.log("[parse-queue] Processing sheet:", sheet.id, "path:", sheet.file_path);

  try {
    // Update status to parsing
    await supabase
      .from("call_sheets")
      .update({ status: "parsing" } as Record<string, unknown>)
      .eq("id", sheet.id);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("call_sheets")
      .download(sheet.file_path);

    if (downloadError || !fileData) {
      console.error("[parse-queue] Download error:", downloadError);
      await supabase
        .from("call_sheets")
        .update({ status: "error" } as Record<string, unknown>)
        .eq("id", sheet.id);
      return { success: false, contacts: 0, error: "Failed to download file" };
    }

    console.log("[parse-queue] File downloaded, size:", fileData.size);

    // Convert to text (handle different file types)
    let textContent = "";
    const fileName = sheet.file_path.toLowerCase();
    
    if (fileName.endsWith(".txt") || fileName.endsWith(".csv")) {
      textContent = await fileData.text();
      console.log("[parse-queue] Text file, length:", textContent.length);
    } else if (fileName.endsWith(".pdf")) {
      // Use proper PDF text extraction
      const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
      const { text, pageCount, chars } = await extractPdfText(pdfBytes);
      
      console.log(`[parse-queue] PDF extraction: ${pageCount} pages, ${chars} chars`);
      
      if (chars < 50) {
        console.error("[parse-queue] PDF has insufficient extractable text (may be scanned/image)");
        await supabase
          .from("call_sheets")
          .update({ 
            status: "error",
            parsed_contacts: [],
            contacts_extracted: 0,
          } as Record<string, unknown>)
          .eq("id", sheet.id);
        return { success: false, contacts: 0, error: "PDF has no extractable text (may be scanned/image)" };
      }
      
      textContent = text;
    } else {
      // Try to read as text
      textContent = await fileData.text();
      console.log("[parse-queue] Other file type, length:", textContent.length);
    }

    if (!textContent || textContent.length < 10) {
      console.error("[parse-queue] Content too short:", textContent.length);
      await supabase
        .from("call_sheets")
        .update({ status: "error" } as Record<string, unknown>)
        .eq("id", sheet.id);
      return { success: false, contacts: 0, error: "File content too short" };
    }

    // Parse with AI
    const parsedContacts = await parseWithAI(textContent);
    console.log("[parse-queue] AI returned", parsedContacts.length, "contacts");

    // Insert contacts into crew_contacts
    if (parsedContacts.length > 0) {
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
        console.error("[parse-queue] Insert error:", insertError);
        // Continue anyway, update sheet status
      } else {
        console.log("[parse-queue] Inserted", contactsToInsert.length, "contacts into crew_contacts");
      }
    }

    // Update call sheet status with normalized contacts for review UI
    const parsedContactsForStorage = parsedContacts.map(c => ({
      name: c.name,
      role: c.roles[0] || "",
      department: c.departments[0] || "",
      phone: c.phones[0] || null,
      email: c.emails[0] || null,
      instagram_handle: c.ig_handle,
      confidence: c.confidence,
    }));

    await supabase
      .from("call_sheets")
      .update({
        status: "parsed",
        parsed_date: new Date().toISOString(),
        contacts_extracted: parsedContacts.length,
        parsed_contacts: parsedContactsForStorage,
      } as Record<string, unknown>)
      .eq("id", sheet.id);

    console.log("[parse-queue] Sheet", sheet.id, "updated to parsed with", parsedContacts.length, "contacts");
    return { success: true, contacts: parsedContacts.length };
  } catch (err: unknown) {
    console.error("[parse-queue] Processing error:", err);
    await supabase
      .from("call_sheets")
      .update({ status: "error" } as Record<string, unknown>)
      .eq("id", sheet.id);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, contacts: 0, error: message };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { limit = 5, callSheetId } = body;

    console.log("[parse-queue] Starting, limit:", limit, "callSheetId:", callSheetId || "none");

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let queuedSheets: CallSheet[] = [];

    if (callSheetId) {
      // Process specific sheet by ID (allow reprocessing)
      console.log("[parse-queue] Fetching specific sheet:", callSheetId);
      const { data, error: fetchError } = await supabase
        .from("call_sheets")
        .select("id, file_path, user_id, status")
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
        .select("id, file_path, user_id")
        .eq("status", "queued")
        .order("uploaded_at", { ascending: true })
        .limit(limit);

      if (fetchError) {
        console.error("[parse-queue] Fetch error:", fetchError);
        throw fetchError;
      }

      queuedSheets = (data || []) as CallSheet[];
    }

    if (queuedSheets.length === 0) {
      console.log("[parse-queue] No sheets to process");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No sheets in queue" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[parse-queue] Processing", queuedSheets.length, "sheet(s)");

    // Process each sheet
    const results = [];
    for (const sheet of queuedSheets) {
      const result = await processCallSheet(supabase, sheet);
      results.push({ id: sheet.id, ...result });
    }

    const successCount = results.filter(r => r.success).length;
    const totalContacts = results.reduce((sum, r) => sum + r.contacts, 0);

    console.log("[parse-queue] Completed. Success:", successCount, "Contacts:", totalContacts);

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
    console.error("[parse-queue] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to process queue";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
