import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";
import * as pdfjs from "https://esm.sh/pdfjs-dist@3.11.174/build/pdf.mjs";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lovable AI Gateway configuration
const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const PRIMARY_MODEL = "openai/gpt-5-mini";
const CLEANUP_MODEL = "openai/gpt-5-nano";

// Types
interface ParsedContact {
  name: string;
  role: string;
  department: string;
  phone: string | null;
  email: string | null;
  ig_handle: string | null;
  confidence: number;
  needs_review: boolean;
}

interface ParseResult {
  contacts: ParsedContact[];
  raw_text?: string;
  parsing_method: string;
  pages_processed: number;
  errors: string[];
}

// Helper functions
const getSupabase = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey, { 
    auth: { persistSession: false } 
  });
};

const requireAuth = async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    throw new Error("Unauthorized - No auth token provided");
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = getSupabase();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('[AUTH] Error:', error?.message || 'No user found');
    throw new Error("Unauthorized - Invalid token");
  }

  console.log('[PARSE_CALL_SHEET] User authenticated:', user.id);
  return { user, token };
};

const errorResponse = (message: string, status = 400) => {
  console.error(`[PARSE_CALL_SHEET] Error: ${message}`);
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};

const successResponse = (data: unknown, status = 200) => {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};

// Standard film departments for classification
const STANDARD_DEPARTMENTS = [
  'Production', 'Camera', 'Electric', 'Grip', 'Sound', 'Art', 'Set Dec',
  'Props', 'Wardrobe', 'Hair', 'Makeup', 'Locations', 'Transportation',
  'Catering', 'Craft Service', 'Accounting', 'Post Production', 'VFX',
  'Stunts', 'SFX', 'Script', 'AD', 'Talent', 'Background', 'Extras',
  'Medical', 'Security', 'Publicity', 'Legal', 'Insurance', 'Other'
];

// Common role patterns for identification
const ROLE_PATTERNS = [
  // Production
  { pattern: /\b(producer|ep|executive\s*producer|line\s*producer|upm|unit\s*production\s*manager)\b/i, department: 'Production' },
  { pattern: /\b(director|1st\s*ad|2nd\s*ad|ad\s*pa|key\s*pa|production\s*assistant|pa)\b/i, department: 'AD' },
  
  // Camera
  { pattern: /\b(dp|dop|director\s*of\s*photography|cinematographer|camera\s*operator|1st\s*ac|2nd\s*ac|loader|dit|steadicam|camera\s*pa)\b/i, department: 'Camera' },
  
  // G&E
  { pattern: /\b(gaffer|best\s*boy\s*electric|electrician|rigging\s*electric|dimmer\s*board|genny\s*op)\b/i, department: 'Electric' },
  { pattern: /\b(key\s*grip|best\s*boy\s*grip|dolly\s*grip|grip|rigging\s*grip)\b/i, department: 'Grip' },
  
  // Sound
  { pattern: /\b(sound\s*mixer|boom\s*operator|utility\s*sound|playback|sound)\b/i, department: 'Sound' },
  
  // Art Department
  { pattern: /\b(production\s*designer|art\s*director|art\s*coordinator|set\s*designer|art\s*pa)\b/i, department: 'Art' },
  { pattern: /\b(set\s*decorator|leadman|set\s*dresser|on\s*set\s*dresser|buyer)\b/i, department: 'Set Dec' },
  { pattern: /\b(prop\s*master|props|assistant\s*props|props\s*buyer)\b/i, department: 'Props' },
  
  // HMU
  { pattern: /\b(hair|key\s*hair|assistant\s*hair|hair\s*stylist)\b/i, department: 'Hair' },
  { pattern: /\b(makeup|key\s*makeup|assistant\s*makeup|mua|sfx\s*makeup)\b/i, department: 'Makeup' },
  { pattern: /\b(wardrobe|costume|key\s*costumer|set\s*costumer|tailor)\b/i, department: 'Wardrobe' },
  
  // Other departments
  { pattern: /\b(location\s*manager|alm|key\s*assistant\s*location|locations)\b/i, department: 'Locations' },
  { pattern: /\b(transpo|transportation|driver|picture\s*car)\b/i, department: 'Transportation' },
  { pattern: /\b(craft\s*service|crafty|craft)\b/i, department: 'Craft Service' },
  { pattern: /\b(catering|chef)\b/i, department: 'Catering' },
  { pattern: /\b(stunt|stunt\s*coordinator|stunt\s*performer)\b/i, department: 'Stunts' },
  { pattern: /\b(vfx|visual\s*effects|cgi)\b/i, department: 'VFX' },
  { pattern: /\b(sfx|special\s*effects|effects)\b/i, department: 'SFX' },
  { pattern: /\b(script\s*supervisor|script\s*coordinator|continuity)\b/i, department: 'Script' },
  { pattern: /\b(medic|set\s*medic|nurse|emt)\b/i, department: 'Medical' },
  { pattern: /\b(security|fire\s*safety)\b/i, department: 'Security' },
  { pattern: /\b(accountant|payroll|accounting)\b/i, department: 'Accounting' },
];

// Phone regex patterns
const PHONE_PATTERNS = [
  /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
];

// Email regex
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

// IG handle pattern
const IG_PATTERN = /@([a-zA-Z0-9._]{1,30})/g;

/**
 * Extract text from PDF using pdfjs
 */
async function extractTextFromPdf(pdfBytes: Uint8Array): Promise<{ text: string; pageCount: number }> {
  console.log('[PARSE_CALL_SHEET] Extracting text from PDF...');
  
  try {
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;
    
    const pageCount = pdf.numPages;
    console.log(`[PARSE_CALL_SHEET] PDF has ${pageCount} pages`);
    
    let fullText = '';
    
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: unknown) => {
          const textItem = item as { str?: string };
          return textItem.str || '';
        })
        .join(' ');
      
      fullText += `\n--- PAGE ${i} ---\n${pageText}`;
    }
    
    console.log(`[PARSE_CALL_SHEET] Extracted ${fullText.length} characters`);
    return { text: fullText, pageCount };
  } catch (error: unknown) {
    console.error('[PARSE_CALL_SHEET] PDF extraction error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract PDF text: ${message}`);
  }
}

/**
 * Compute content hash for deduplication
 */
async function computeContentHash(content: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', content.buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Detect department from role text
 */
function detectDepartment(role: string): string {
  for (const { pattern, department } of ROLE_PATTERNS) {
    if (pattern.test(role)) {
      return department;
    }
  }
  return 'Other';
}

/**
 * Extract phone numbers from text
 */
function extractPhones(text: string): string[] {
  const phones: string[] = [];
  for (const pattern of PHONE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      phones.push(...matches);
    }
  }
  return [...new Set(phones)];
}

/**
 * Extract emails from text
 */
function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_PATTERN);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Extract IG handles from text
 */
function extractIgHandles(text: string): string[] {
  const matches: string[] = [];
  let match;
  const regex = new RegExp(IG_PATTERN.source, 'gi');
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return [...new Set(matches)];
}

/**
 * Call Lovable AI Gateway for parsing
 */
async function callLovableAI(
  prompt: string,
  model: string = PRIMARY_MODEL,
  systemPrompt: string
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  console.log(`[PARSE_CALL_SHEET] Calling Lovable AI (${model})...`);

  const response = await fetch(LOVABLE_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_completion_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[PARSE_CALL_SHEET] AI error:', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded - Please try again later");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted - Please add credits");
    }
    throw new Error(`AI request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Parse raw text using AI
 */
async function parseTextWithAI(rawText: string): Promise<ParsedContact[]> {
  const systemPrompt = `You are a film industry call sheet parser. Extract crew contact information from the provided call sheet text.

For each person found, extract:
- name: Full name
- role: Their job title/position
- department: Film department (Production, Camera, Electric, Grip, Sound, Art, Set Dec, Props, Wardrobe, Hair, Makeup, Locations, Transportation, Catering, Craft Service, Accounting, Post Production, VFX, Stunts, SFX, Script, AD, Talent, Background, Medical, Security, Other)
- phone: Phone number if present
- email: Email if present  
- ig_handle: Instagram handle if present (without @)

Return ONLY a valid JSON array. No explanations.
Example: [{\\"name\\":\\"John Smith\\",\\"role\\":\\"Gaffer\\",\\"department\\":\\"Electric\\",\\"phone\\":\\"555-123-4567\\",\\"email\\":\\"john@example.com\\",\\"ig_handle\\":null}]`;

  const userPrompt = `Parse this call sheet and extract all crew contacts:\n\n${rawText.substring(0, 15000)}`;

  try {
    const aiResponse = await callLovableAI(userPrompt, PRIMARY_MODEL, systemPrompt);
    
    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[PARSE_CALL_SHEET] No JSON array found in AI response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and normalize contacts
    return parsed.map((contact: Partial<ParsedContact>) => ({
      name: String(contact.name || '').trim(),
      role: String(contact.role || '').trim(),
      department: STANDARD_DEPARTMENTS.includes(contact.department || '') 
        ? contact.department 
        : detectDepartment(contact.role || ''),
      phone: contact.phone || null,
      email: contact.email || null,
      ig_handle: contact.ig_handle ? String(contact.ig_handle).replace('@', '') : null,
      confidence: 0.85,
      needs_review: false,
    })).filter((c: ParsedContact) => c.name && c.name.length > 1);

  } catch (error) {
    console.error('[PARSE_CALL_SHEET] AI parsing error:', error);
    return [];
  }
}

/**
 * Cleanup pass using cheaper model
 */
async function cleanupContacts(contacts: ParsedContact[]): Promise<ParsedContact[]> {
  if (contacts.length === 0) return contacts;

  const systemPrompt = `You are a data cleaning assistant. Review these contacts extracted from a film call sheet.
Fix any obvious errors:
- Normalize names (proper capitalization)
- Fix truncated roles
- Correct department assignments
- Flag low confidence entries

Return the cleaned JSON array only.`;

  const userPrompt = `Clean these contacts:\n${JSON.stringify(contacts, null, 2)}`;

  try {
    const aiResponse = await callLovableAI(userPrompt, CLEANUP_MODEL, systemPrompt);
    
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return contacts; // Return original if cleanup fails
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.warn('[PARSE_CALL_SHEET] Cleanup pass failed, using original:', error);
    return contacts;
  }
}

/**
 * Fallback regex-based parsing
 */
function parseWithRegex(rawText: string): ParsedContact[] {
  console.log('[PARSE_CALL_SHEET] Using regex fallback parser...');
  
  const contacts: ParsedContact[] = [];
  const lines = rawText.split('\n').filter(l => l.trim());
  
  // Look for patterns like "Name - Role" or "Role: Name"
  const nameRolePatterns = [
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*[-–—]\s*(.+)$/,
    /^(.+?):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)$/,
  ];

  for (const line of lines) {
    for (const pattern of nameRolePatterns) {
      const match = line.match(pattern);
      if (match) {
        const [, name, role] = match;
        const phones = extractPhones(line);
        const emails = extractEmails(line);
        const igs = extractIgHandles(line);

        contacts.push({
          name: name.trim(),
          role: role.trim(),
          department: detectDepartment(role),
          phone: phones[0] || null,
          email: emails[0] || null,
          ig_handle: igs[0] || null,
          confidence: 0.6,
          needs_review: true,
        });
        break;
      }
    }
  }

  return contacts;
}

/**
 * Main parse function
 */
async function parseCallSheet(
  pdfBytes: Uint8Array,
  options: { useAI?: boolean; includeCleanup?: boolean } = {}
): Promise<ParseResult> {
  const { useAI = true, includeCleanup = true } = options;
  const errors: string[] = [];

  // Extract text from PDF
  const { text: rawText, pageCount } = await extractTextFromPdf(pdfBytes);

  if (!rawText || rawText.length < 50) {
    errors.push('Insufficient text extracted from PDF');
    return {
      contacts: [],
      raw_text: rawText,
      parsing_method: 'failed',
      pages_processed: pageCount,
      errors,
    };
  }

  let contacts: ParsedContact[] = [];
  let parsingMethod = 'unknown';

  // Try AI parsing first
  if (useAI) {
    try {
      contacts = await parseTextWithAI(rawText);
      parsingMethod = 'ai_primary';

      if (contacts.length > 0 && includeCleanup) {
        contacts = await cleanupContacts(contacts);
        parsingMethod = 'ai_with_cleanup';
      }
    } catch (error: unknown) {
      console.warn('[PARSE_CALL_SHEET] AI parsing failed, falling back to regex:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`AI parsing failed: ${message}`);
    }
  }

  // Fallback to regex if AI fails or is disabled
  if (contacts.length === 0) {
    contacts = parseWithRegex(rawText);
    parsingMethod = 'regex_fallback';
  }

  // Mark low-confidence contacts for review
  contacts = contacts.map(c => ({
    ...c,
    needs_review: c.confidence < 0.7 || !c.role || c.department === 'Other',
  }));

  console.log(`[PARSE_CALL_SHEET] Parsed ${contacts.length} contacts using ${parsingMethod}`);

  return {
    contacts,
    raw_text: rawText,
    parsing_method: parsingMethod,
    pages_processed: pageCount,
    errors,
  };
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const { user } = await requireAuth(req);
    const userId = user.id;

    const supabase = getSupabase();

    // Get request body
    const body = await req.json();
    const { 
      file_path, 
      file_name, 
      call_sheet_id,
      auto_insert = false,
      use_ai = true,
      include_cleanup = true 
    } = body;

    if (!file_path) {
      return errorResponse('file_path is required');
    }

    console.log(`[PARSE_CALL_SHEET] Processing: ${file_name || file_path}`);

    // Download PDF from storage - use user-scoped path
    const storagePath = file_path.startsWith(`${userId}/`) 
      ? file_path 
      : `${userId}/${file_path}`;

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('call_sheets')
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error('[PARSE_CALL_SHEET] Download error:', downloadError);
      return errorResponse(`Failed to download file: ${downloadError?.message || 'File not found'}`);
    }

    // Convert to Uint8Array
    const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
    
    // Compute content hash for deduplication
    const contentHash = await computeContentHash(pdfBytes);
    console.log(`[PARSE_CALL_SHEET] Content hash: ${contentHash.substring(0, 16)}...`);

    // Check for duplicate
    const { data: existingSheet } = await supabase
      .from('call_sheets')
      .select('id, file_name')
      .eq('content_hash', contentHash)
      .eq('user_id', userId)
      .neq('id', call_sheet_id || '')
      .single();

    if (existingSheet) {
      console.warn(`[PARSE_CALL_SHEET] Duplicate detected: ${existingSheet.file_name}`);
      return successResponse({
        success: false,
        duplicate: true,
        existing_id: existingSheet.id,
        existing_name: existingSheet.file_name,
        message: 'This file has already been uploaded',
      });
    }

    // Parse the PDF
    const parseResult = await parseCallSheet(pdfBytes, {
      useAI: use_ai,
      includeCleanup: include_cleanup,
    });

    // Update or create call_sheets record
    const callSheetData = {
      user_id: userId,
      file_name: file_name || file_path.split('/').pop(),
      file_path: storagePath,
      content_hash: contentHash,
      parsed_contacts: parseResult.contacts,
      contacts_extracted: parseResult.contacts.length,
      parsed_date: new Date().toISOString(),
      status: parseResult.contacts.length > 0 ? 'parsed' : 'parse_failed',
    };

    let callSheetRecord;
    
    if (call_sheet_id) {
      // Verify ownership before updating
      const { data: existing } = await supabase
        .from('call_sheets')
        .select('user_id')
        .eq('id', call_sheet_id)
        .single();

      if (!existing || existing.user_id !== userId) {
        return errorResponse('Call sheet not found or access denied', 403);
      }

      const { data, error } = await supabase
        .from('call_sheets')
        .update(callSheetData)
        .eq('id', call_sheet_id)
        .select()
        .single();

      if (error) {
        console.error('[PARSE_CALL_SHEET] Update error:', error);
        return errorResponse(`Failed to update record: ${error.message}`);
      }
      callSheetRecord = data;
    } else {
      const { data, error } = await supabase
        .from('call_sheets')
        .insert(callSheetData)
        .select()
        .single();

      if (error) {
        console.error('[PARSE_CALL_SHEET] Insert error:', error);
        return errorResponse(`Failed to create record: ${error.message}`);
      }
      callSheetRecord = data;
    }

    // Auto-insert contacts if requested
    if (auto_insert && parseResult.contacts.length > 0) {
      const contactsToInsert = parseResult.contacts
        .filter(c => !c.needs_review && c.confidence >= 0.8)
        .map(c => ({
          user_id: userId,
          name: c.name,
          roles: [c.role],
          departments: [c.department],
          phones: c.phone ? [c.phone] : null,
          emails: c.email ? [c.email] : null,
          ig_handle: c.ig_handle,
          confidence: c.confidence,
          needs_review: c.needs_review,
          source_files: [callSheetRecord.id],
        }));

      if (contactsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('crew_contacts')
          .insert(contactsToInsert);

        if (insertError) {
          console.warn('[PARSE_CALL_SHEET] Auto-insert failed:', insertError);
          parseResult.errors.push(`Auto-insert failed: ${insertError.message}`);
        } else {
          console.log(`[PARSE_CALL_SHEET] Auto-inserted ${contactsToInsert.length} contacts`);
        }
      }
    }

    return successResponse({
      success: true,
      call_sheet_id: callSheetRecord.id,
      contacts: parseResult.contacts,
      contacts_count: parseResult.contacts.length,
      needs_review_count: parseResult.contacts.filter(c => c.needs_review).length,
      parsing_method: parseResult.parsing_method,
      pages_processed: parseResult.pages_processed,
      errors: parseResult.errors,
    });

  } catch (error: unknown) {
    console.error('[PARSE_CALL_SHEET] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    
    if (message.includes('Unauthorized')) {
      return errorResponse(message, 401);
    }
    if (message.includes('Rate limit')) {
      return errorResponse(message, 429);
    }
    
    return errorResponse(message, 500);
  }
});
