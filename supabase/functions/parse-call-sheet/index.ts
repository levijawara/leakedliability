import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { extractText } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedContact {
  name: string;
  roles: string[];
  departments: string[];
  emails: string[];
  phones: string[];
  ig_handle: string | null;
}

interface ParseResult {
  contacts: ParsedContact[];
  project_title: string | null;
  parsed_date: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  if (!lovableApiKey) {
    console.error("[parse-call-sheet] LOVABLE_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "AI service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { call_sheet_id } = await req.json();

    if (!call_sheet_id) {
      return new Response(
        JSON.stringify({ error: "call_sheet_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[parse-call-sheet] Processing call sheet: ${call_sheet_id}`);

    // Fetch from global_call_sheets table
    const { data: callSheet, error: fetchError } = await supabase
      .from("global_call_sheets")
      .select("*")
      .eq("id", call_sheet_id)
      .single();

    if (fetchError || !callSheet) {
      console.error("[parse-call-sheet] Call sheet not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Call sheet not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip if already parsed
    if (callSheet.status === "parsed") {
      console.log("[parse-call-sheet] Already parsed, skipping");
      return new Response(
        JSON.stringify({ success: true, message: "Already parsed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to parsing
    await supabase
      .from("global_call_sheets")
      .update({ status: "parsing", error_message: null, parsing_started_at: new Date().toISOString() })
      .eq("id", call_sheet_id);

    console.log(`[parse-call-sheet] Downloading file: ${callSheet.master_file_path}`);

    // Download the PDF from storage using master_file_path
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("call_sheets")
      .download(callSheet.master_file_path);

    if (downloadError || !fileData) {
      console.error("[parse-call-sheet] Failed to download file:", downloadError);
      await markAsError(supabase, call_sheet_id, "Failed to download file from storage");
      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract text from PDF using pdf-parse library
    console.log("[parse-call-sheet] Extracting text from PDF with pdf-parse...");
    const pdfText = await extractTextFromPdf(fileData);

    console.log(`[parse-call-sheet] Extracted ${pdfText.length} characters of text`);
    console.log(`[parse-call-sheet] Text preview: ${pdfText.slice(0, 500)}...`);

    if (!pdfText || pdfText.trim().length < 100) {
      console.error("[parse-call-sheet] Insufficient text extracted from PDF");
      await markAsError(supabase, call_sheet_id, "PDF contains insufficient extractable text. It may be a scanned image - please upload a text-based PDF or try OCR.");
      return new Response(
        JSON.stringify({ error: "Insufficient extractable text in PDF" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to parse contacts
    console.log("[parse-call-sheet] Sending to AI for parsing...");
    const parseResult = await parseWithAI(pdfText, lovableApiKey);

    if (!parseResult || !parseResult.contacts) {
      console.error("[parse-call-sheet] AI parsing failed");
      await markAsError(supabase, call_sheet_id, "AI failed to parse contacts from the document");
      return new Response(
        JSON.stringify({ error: "AI parsing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[parse-call-sheet] AI extracted ${parseResult.contacts.length} contacts`);

    // Add confidence scores to contacts
    const contactsWithConfidence = parseResult.contacts.map(contact => ({
      ...contact,
      confidence: calculateConfidence(contact)
    }));

    // Update global_call_sheets with parsed data
    const { error: updateError } = await supabase
      .from("global_call_sheets")
      .update({
        status: "parsed",
        parsed_contacts: contactsWithConfidence,
        contacts_extracted: contactsWithConfidence.length,
        project_title: parseResult.project_title,
        parsed_date: parseResult.parsed_date,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", call_sheet_id);

    if (updateError) {
      console.error("[parse-call-sheet] Failed to update call sheet:", updateError);
      await markAsError(supabase, call_sheet_id, "Failed to save parsed contacts");
      return new Response(
        JSON.stringify({ error: "Failed to save results" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[parse-call-sheet] Successfully parsed call sheet ${call_sheet_id}, contacts: ${contactsWithConfidence.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        contacts_count: contactsWithConfidence.length,
        project_title: parseResult.project_title,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[parse-call-sheet] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function markAsError(supabase: any, callSheetId: string, errorMessage: string) {
  await supabase
    .from("global_call_sheets")
    .update({ status: "error", error_message: errorMessage, updated_at: new Date().toISOString() })
    .eq("id", callSheetId);
}

// Calculate confidence score based on data completeness
function calculateConfidence(contact: ParsedContact): number {
  let score = 0;
  let factors = 0;

  // Name is essential
  if (contact.name && contact.name.trim().length > 2) {
    score += 1;
    factors++;
  }

  // Roles add confidence
  if (contact.roles && contact.roles.length > 0) {
    score += 1;
    factors++;
  }

  // Departments add confidence
  if (contact.departments && contact.departments.length > 0) {
    score += 0.5;
    factors += 0.5;
  }

  // Emails strongly add confidence
  if (contact.emails && contact.emails.length > 0) {
    score += 1;
    factors++;
  }

  // Phones add confidence
  if (contact.phones && contact.phones.length > 0) {
    score += 0.8;
    factors += 0.8;
  }

  // IG handle is bonus
  if (contact.ig_handle) {
    score += 0.2;
    factors += 0.2;
  }

  return factors > 0 ? Math.min(score / factors, 1) : 0.5;
}

async function extractTextFromPdf(pdfBlob: Blob): Promise<string> {
  try {
    // Convert blob to ArrayBuffer for unpdf
    const arrayBuffer = await pdfBlob.arrayBuffer();
    
    // Use unpdf for proper text extraction (works in edge environments)
    const { text, totalPages } = await extractText(arrayBuffer, { mergePages: true });
    
    console.log(`[parse-call-sheet] PDF pages: ${totalPages}`);
    console.log(`[parse-call-sheet] Raw text length: ${text.length} chars`);
    
    // Clean and normalize the extracted text
    const cleanedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
    
    return cleanedText;
  } catch (error) {
    console.error("[parse-call-sheet] unpdf extraction failed:", error);
    
    // Fallback: try basic text extraction
    console.log("[parse-call-sheet] Attempting fallback text extraction...");
    return await fallbackTextExtraction(pdfBlob);
  }
}

async function fallbackTextExtraction(pdfBlob: Blob): Promise<string> {
  // Basic fallback for when pdf-parse fails
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const rawContent = decoder.decode(bytes);
  
  // Extract readable patterns
  const patterns: string[] = [];
  
  // Extract emails
  const emails = rawContent.match(/[A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g) || [];
  patterns.push(...emails);
  
  // Extract phone numbers
  const phones = rawContent.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
  patterns.push(...phones);
  
  // Extract printable ASCII sequences (potential names and text)
  const printableRegex = /[\x20-\x7E]{8,}/g;
  const printableMatches = rawContent.match(printableRegex) || [];
  const textMatches = printableMatches
    .filter(s => /[a-zA-Z]{3,}/.test(s))
    .filter(s => !/^[%\/\\<>{}]+/.test(s)); // Skip PDF internal commands
  patterns.push(...textMatches);
  
  return [...new Set(patterns)].join(' ').replace(/\s+/g, ' ').trim();
}

async function parseWithAI(text: string, apiKey: string): Promise<ParseResult> {
  const systemPrompt = `You are an expert at parsing film/TV production call sheets. Extract contact information from the provided text.

Return a JSON object with this exact structure:
{
  "contacts": [
    {
      "name": "Full Name",
      "roles": ["Role 1", "Role 2"],
      "departments": ["Department"],
      "emails": ["email@example.com"],
      "phones": ["555-123-4567"],
      "ig_handle": "@handle or null"
    }
  ],
  "project_title": "Name of the production or null",
  "parsed_date": "Date from call sheet in YYYY-MM-DD format or null"
}

Guidelines:
- Extract ALL contacts you can find
- Roles should be the job title (e.g., "Director", "1st AD", "Gaffer", "Key Grip", "Production Coordinator")
- Departments should be standardized: Production, Camera, Grip, Electric, Art, Wardrobe, Hair/Makeup, Sound, Locations, Transportation, Catering, Casting, Accounting, Post-Production
- Include ALL phone numbers and emails found for each person
- If an Instagram handle is visible, include it with @ prefix
- If you can't determine a field, use empty array or null
- Do NOT make up information - only extract what's actually in the text
- Look for common call sheet layouts: crew lists, contact sheets, department groupings`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Parse this call sheet text and extract contacts:\n\n${text.slice(0, 30000)}` }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_contacts",
            description: "Extract structured contact information from a call sheet",
            parameters: {
              type: "object",
              properties: {
                contacts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Full name of the person" },
                      roles: { type: "array", items: { type: "string" }, description: "Job titles/roles" },
                      departments: { type: "array", items: { type: "string" }, description: "Department names" },
                      emails: { type: "array", items: { type: "string" }, description: "Email addresses" },
                      phones: { type: "array", items: { type: "string" }, description: "Phone numbers" },
                      ig_handle: { type: "string", nullable: true, description: "Instagram handle" }
                    },
                    required: ["name", "roles", "departments", "emails", "phones"]
                  }
                },
                project_title: { type: "string", nullable: true, description: "Name of the production" },
                parsed_date: { type: "string", nullable: true, description: "Date from call sheet (YYYY-MM-DD)" }
              },
              required: ["contacts"]
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "extract_contacts" } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[parse-call-sheet] AI API error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("AI rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add funds.");
    }
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Extract from tool call response
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      const parsed = JSON.parse(toolCall.function.arguments);
      return {
        contacts: parsed.contacts || [],
        project_title: parsed.project_title || null,
        parsed_date: parsed.parsed_date || null,
      };
    } catch (e) {
      console.error("[parse-call-sheet] Failed to parse AI response:", e);
      throw new Error("Failed to parse AI response");
    }
  }

  // Fallback: try to parse from content
  const content = data.choices?.[0]?.message?.content;
  if (content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          contacts: parsed.contacts || [],
          project_title: parsed.project_title || null,
          parsed_date: parsed.parsed_date || null,
        };
      }
    } catch (e) {
      console.error("[parse-call-sheet] Failed to parse content as JSON:", e);
    }
  }

  throw new Error("AI returned unexpected response format");
}
