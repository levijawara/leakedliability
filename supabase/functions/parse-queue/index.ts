import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedContact {
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

async function parseWithAI(content: string): Promise<ParsedContact[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("[parse-queue] LOVABLE_API_KEY not configured");
    throw new Error("AI Gateway not configured");
  }

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
          content: PARSE_PROMPT + content.substring(0, 15000), // Limit content size
        },
      ],
      max_completion_tokens: 4000, // GPT-5 uses max_completion_tokens, not max_tokens
      // Note: GPT-5 models do not support temperature parameter
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[parse-queue] AI Gateway error:", errorText);
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content || "[]";

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
    return contacts;
  } catch (e) {
    console.error("[parse-queue] Failed to parse AI response:", e);
    return [];
  }
}

async function processCallSheet(
  supabase: SupabaseClient,
  sheet: CallSheet
): Promise<{ success: boolean; contacts: number; error?: string }> {
  console.log("[parse-queue] Processing sheet:", sheet.id);

  try {
    // Update status to processing
    await supabase
      .from("call_sheets")
      .update({ status: "processing" } as Record<string, unknown>)
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

    // Convert to text (handle different file types)
    let textContent = "";
    const fileName = sheet.file_path.toLowerCase();
    
    if (fileName.endsWith(".txt") || fileName.endsWith(".csv")) {
      textContent = await fileData.text();
    } else if (fileName.endsWith(".pdf")) {
      // For PDFs, we pass the base64 to AI for vision processing
      const buffer = await fileData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      textContent = `[PDF Content - Base64 encoded for vision model]\n${base64.substring(0, 10000)}`;
    } else {
      // Try to read as text
      textContent = await fileData.text();
    }

    if (!textContent || textContent.length < 10) {
      await supabase
        .from("call_sheets")
        .update({ status: "error" } as Record<string, unknown>)
        .eq("id", sheet.id);
      return { success: false, contacts: 0, error: "File content too short" };
    }

    // Parse with AI
    const parsedContacts = await parseWithAI(textContent);
    console.log("[parse-queue] Parsed", parsedContacts.length, "contacts");

    // Insert contacts into crew_contacts
    if (parsedContacts.length > 0) {
      const contactsToInsert = parsedContacts.map(c => ({
        user_id: sheet.user_id,
        name: c.name || "Unknown",
        roles: c.roles || [],
        departments: c.departments || [],
        phones: c.phones || [],
        emails: c.emails || [],
        ig_handle: c.ig_handle || null,
        confidence: c.confidence || 0.5,
        source_files: [sheet.file_path],
        needs_review: c.confidence < 0.7,
      }));

      const { error: insertError } = await supabase
        .from("crew_contacts")
        .insert(contactsToInsert as Record<string, unknown>[]);

      if (insertError) {
        console.error("[parse-queue] Insert error:", insertError);
        // Continue anyway, update sheet status
      }
    }

    // Update call sheet status
    await supabase
      .from("call_sheets")
      .update({
        status: "parsed",
        parsed_date: new Date().toISOString(),
        contacts_extracted: parsedContacts.length,
        parsed_contacts: parsedContacts,
      } as Record<string, unknown>)
      .eq("id", sheet.id);

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
    const { limit = 5 } = await req.json().catch(() => ({}));

    console.log("[parse-queue] Starting queue processing, limit:", limit);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch queued call sheets
    const { data: queuedSheets, error: fetchError } = await supabase
      .from("call_sheets")
      .select("id, file_path, user_id")
      .eq("status", "queued")
      .order("uploaded_at", { ascending: true })
      .limit(limit);

    if (fetchError) {
      console.error("[parse-queue] Fetch error:", fetchError);
      throw fetchError;
    }

    if (!queuedSheets || queuedSheets.length === 0) {
      console.log("[parse-queue] No sheets in queue");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No sheets in queue" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[parse-queue] Found", queuedSheets.length, "sheets to process");

    // Process each sheet
    const results = [];
    for (const sheet of queuedSheets as CallSheet[]) {
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
