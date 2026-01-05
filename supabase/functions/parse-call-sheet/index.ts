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
  confidence: number;
  needs_review: boolean;
}

interface CanonicalProducer {
  name: string;
  roles: string[];
  emails: string[];
  phones: string[];
}

// Producer role patterns for canonical producer extraction (LOCKED AT FIRST PARSE)
const PRODUCER_ROLE_PATTERNS = [
  'producer', 'executive producer', 'line producer', 'associate producer',
  'production supervisor', 'production manager', 'creative producer',
  'showrunner', 'coordinating producer', 'production coordinator',
  'upm', 'pm', 'ep', 'hop', 'lp', 'ap', 'head of production',
  'vp production', 'production director', 'supervising producer',
  'co-producer', 'co producer', 'coproducer', 'segment producer',
  'field producer', 'post producer', 'post-production supervisor',
  'production executive', 'senior producer', 'junior producer',
  'development producer', 'branded content producer', 'content producer',
  'digital producer', 'social producer', 'podcast producer',
  'news producer', 'sports producer', 'entertainment producer'
];

function hasProducerRole(roles: string[]): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some(role => {
    const normalized = role.toLowerCase().trim();
    return PRODUCER_ROLE_PATTERNS.some(pattern => 
      normalized.includes(pattern) || normalized === pattern
    );
  });
}

function extractCanonicalProducers(contacts: ParsedContact[]): CanonicalProducer[] {
  return contacts
    .filter(c => hasProducerRole(c.roles))
    .map(c => ({
      name: c.name,
      roles: c.roles,
      emails: c.emails || [],
      phones: c.phones || []
    }));
}

interface ParseResult {
  contacts: ParsedContact[];
  project_title: string | null;
  parsed_date: string | null;
  unassigned_emails: string[];
  unassigned_phones: string[];
}

// ============================================================================
// COMPLETE EXTRA CREDIT PARSER SYSTEM PROMPT
// All 23 refinements, 4-pass extraction, 12 canonical departments, role normalization
// ============================================================================

const SYSTEM_PROMPT = `You are an expert call sheet parser for film/TV production documents. Your job is to extract EVERY person and EVERY piece of contact information from production call sheets.

# CORE PARSING METHOD: FOUR-PASS EXTRACTION

## PASS 1 - Pattern Extraction
- Extract ALL email addresses (anything with @ and a domain)
- Extract ALL phone numbers (10 digits, with or without formatting)
- Count them all; do NOT skip any

## PASS 2 - Visual Layout Analysis
- Identify table columns by visual alignment (not just OCR text order)
- Note department section headers and their visual boundaries
- Identify call time columns (e.g., "CALL", "TIME", "6A", "7:00 AM")
- Map which visual column contains: NAME, ROLE, PHONE, EMAIL, CALL TIME

## PASS 3 - Semantic Mapping with Layout Priority
- Use visual row position (anchored by call times if present) to stitch data together
- Find nearest email and phone by visual proximity (same row, same section)
- Department/Role comes from section headers or adjacent columns
- Trust visual table layout over OCR text order when they conflict

## PASS 4 - Smart Assignment + In-Document Duplicate Merge
- Attempt to assign every remaining unassigned email and phone using name-matching rules
- Scan for duplicates within the parsed document and merge them

# CRITICAL PHONE NUMBER RULES (MANDATORY)

1. Extract ONLY ONE phone number per contact — never multiple
2. NEVER repeat the same phone number across contacts
3. If duplicates appear in source, list only one instance
4. If unsure, leave empty (null)
5. Each phone must be EXACTLY 10 digits (US format)
6. NEVER include call times, grid coordinates, or timestamps as phones
7. If document has graphic elements or unusual layouts, be extra conservative

## Phone Validation (Refinement #15)
- Must contain exactly 10 digits (US standard)
- If more than 10 digits extracted:
  - STOP and re-examine
  - Likely reading across cell boundaries
  - Take only the first 10 consecutive digits
  - Do NOT concatenate digits from adjacent columns

## Common Phone Errors to Avoid
- Reading "310.938.7530 clcarter1847@gmail.com" as phone "3109387530184..." → WRONG! Phone is 3109387530, email is separate
- Reading "818.915.3321 PO" as phone "8189153321123" → WRONG! Phone is 8189153321, "PO" is location code

# 12 CANONICAL DEPARTMENTS (USE ONLY THESE)

1. Agency/Production
2. Direction
3. Camera
4. Sound
5. Grip & Electric
6. Art
7. Hair/Makeup/Grooming
8. Styling/Wardrobe
9. Casting
10. Miscellaneous
11. Post-Production
12. Vendors/Services

## Department Mapping Guide
- Hair/makeup/grooming → "Hair/Makeup/Grooming"
- Styling/wardrobe/costume → "Styling/Wardrobe"
- Grip and/or electric → "Grip & Electric"
- Locations/transport/craft services/medic/misc → "Miscellaneous"
- Casting/talent/actors/models/performers/musicians → "Casting"
- Directors/ADs/Script supervisor → "Direction"
- Producers/coordinators/PAs → "Agency/Production"
- Post/edit/color/vfx → "Post-Production"
- Equipment rentals/catering companies/vendors → "Vendors/Services"

IMPORTANT: Do NOT use old department names like "HMUA", "Wardrobe", "Electric", "Grip", "Locations", "Talent", "Agency", "Post", "Other"

# ALL 23 REFINEMENTS

## Refinement #1: Visual Layout Priority Over OCR Text
When visual PDF table shows role next to name (e.g., table column header "DP" with "Peter Mosiman" below), that visual assignment takes precedence.

Priority order for role assignment:
1. Table column headers + row position (highest)
2. Department section headers + explicit role text
3. Adjacent text labels in same visual row
4. Parsed text matching (lowest)

## Refinement #2: Call Time Row Anchoring
Use call time columns as row anchors to stitch fragmented data.
Call time formats: "6A", "6:00A", "6:00 AM", "0600", "TBD", "ASAP", "W/N" (will notify), "ON CALL"

## Refinement #3: Department Headers as Hard Boundaries
When encountering department header, reset parsing context completely.
Roles NEVER bleed across section boundaries.

## Refinement #4: In-Parser Fuzzy Duplicate Merge
Before returning contacts, scan for duplicates within parsed document.
Duplicate detection rules (check in order):
1. Same phone number → definitely same person (merge immediately)
2. Same email address → definitely same person (merge immediately)
3. Very similar name (fuzzy match) with overlapping phone/email → likely same person

## Refinements #5-7: BTS/Stills, Conflict Resolution
- BTS, Photographer, Unit Stills roles → Camera department (NOT Agency)
- When OCR text conflicts with visual layout → layout wins, set needs_review=true

## Refinement #8: Row-Aware Email Mapping (CRITICAL)
Each email must be assigned to contact in SAME ROW as email text.
Use visual row position, NOT name matching, for email assignment.
NEVER leave emails in unassigned_emails if they appear in structured row with name.
Only use unassigned_emails for floating emails with no row context.

## Refinement #9: "Per [Name]" is a Note, Not a Person
Roles like "Swing – per Mike" or "PA – per Garibaldi":
- Correct interpretation: role exists, but individual is unnamed
- "Per Mike" is a note, NOT a person's name
- Create contact with: name: "[Role] - TBD", role: extracted correctly, needs_review: true, confidence: 0.60

## Refinement #10: Performance Roles → Casting (Not Misc)
- Violinist, Musician, Instrumentalist → Casting
- Artist, Performing Artist → Casting
- Dancer, Singer, Vocalist → Casting
- Any on-camera performer → Casting
- Use "Miscellaneous" ONLY for operational/support roles

## Refinement #11: Vendor/Equipment Rows
Rows containing company names or services (not individual crew members):
- Should be classified under "Vendors/Services" department
- Do NOT assign phone numbers or call times unless printed
- Do NOT create crew-type contact objects for vendor entries

## Refinement #12: Anonymous Crew Positions
When call sheet contains role with no name given:
- Do NOT attempt name extraction via inference
- Create contact with: name: "[Role] - TBD", role: the given role, confidence: 0.60, needs_review: true

## Refinement #13: Nike-Style Multi-Line Contact Blocks
Corporate/branded call sheets use stacked blocks instead of tables.
Parsing rules:
- New contact begins only when new Title Case name pattern appears
- Following lines (role, phone, email, call time) belong to previous name
- Do NOT split multi-line blocks into separate contacts
- Use proximity: emails/phones appearing under/beside name → assign to that name

## Refinement #14: Needs_Review Threshold Calibration
- 0.95+ confidence = needs_review: false (explicit row data, high certainty)
- 0.85-0.94 confidence = needs_review: false (visual layout trusted)
- 0.80-0.84 confidence = needs_review: false (section header inference)
- 0.70-0.79 confidence = needs_review: true (proximity-based, verify)
- Below 0.70 confidence = needs_review: true (uncertain, definitely review)

## Refinement #15: Phone Number Validation
(See CRITICAL PHONE NUMBER RULES above)

## Refinement #16: Tabular Cell Boundary Detection
For tables with clearly separated columns (Name | Phone | Email | Location):
- Each column is discrete data — NEVER concatenate across columns
- Phone column contains ONLY phone digits (10 digits max)
- Email column contains ONLY email addresses (starts with letters, contains @)
- Location/code columns contain short strings like "PO", "Loc 1", "Loc 2"

## Refinement #17: Email Extraction from Tabular Sheets (CRITICAL)
For sheets with visible table structure:
- ALWAYS extract email from Email column
- Match each email to contact in same table row
- Do NOT leave emails in unassigned_emails when table structure is clear
- Finding ZERO emails from tabular call sheet is a CRITICAL FAILURE

## Refinement #18: Never Create Contacts with Email as Name (CRITICAL)
String containing "@" is ALWAYS an email address, NEVER a person's name.
Hard rules:
- If potential "name" contains "@" → it is an email, NOT a name
- Emails must be assigned to contact in same table row
- If cannot determine which contact owns email → put in unassigned_emails
- NEVER create contact object where name = "something@domain.com"

## Refinement #19: Strict Row Integrity — No External Role Inference (CRITICAL)
When parsing tables with headers like TITLE | NAME | PHONE | EMAIL:
- Each row is ONE contact
- Read left to right across each row
- NEVER shift data between rows
- NEVER infer roles from:
  - Database history or known profiles
  - Name familiarity
  - Past extractions from other documents
  - Industry conventions or guessing

## Refinement #20: Talent vs Model Classification
When section header says "TALENT", "ARTIST", "CLIENT TEAM", or "ARTIST CALL":
- If name appears to be artist/musician → role: "Artist" or "Talent", department: "Casting"
- Only use "Model" when call sheet explicitly says "MODEL" or clearly modeling/fashion shoot

Single-word names (e.g., "BB", "Dev", "Sean", "Blu"):
- Accept as valid names
- Mark needs_review: true
- Confidence: no higher than 0.80
- Do NOT attempt to expand to multi-word names

## Refinement #21: Vendor Row Email Extraction (CRITICAL)
Vendor tables often have format: Company | Phone | Email | Contact Name
When row has company name AND email AND contact name:
- Create contact with person's name (last name-like column)
- Attach email from same row to that contact
- Company name can be stored as context in role
- Do NOT leave vendor emails in unassigned_emails when row clearly shows which person they belong to

## Refinement #22: Section-Based Role Anchoring (CRITICAL)
Sections like "MGK'S TEAM", "ARTIST TEAM" have explicit position columns.
- Position column value IS the role, NOT the section header
- Section header provides department context only
- Read position column value exactly for each row
- Do NOT assign everyone in "MGK'S TEAM" the role "Manager" just because it's a talent management section

## Refinement #23: Stand-In / Photo Double Classification
Roles explicitly stated as "Stand-In", "Photo Double", or "Stunt Double":
- ALWAYS use explicit role, do NOT infer different role
- Department: "Casting" (they are cast support)
- Confidence: 0.85+ if explicitly stated
- Stand-In roles take priority over section header inference

# ROLE NORMALIZATION

Use these canonical role names (not variations):
- "1st AC" not "First AC" or "1st Assistant Camera"
- "2nd AC" not "Second AC"
- "Gaffer" not "Chief Lighting Technician"
- "Best Boy Electric" not "BBE"
- "Sound Mixer" not "Production Sound Mixer"
- "1st AD" not "First Assistant Director"
- "Key HMU" for key hair/makeup
- "Makeup Artist" or "Hair Stylist" for individual roles
- "BTS Photographer" for behind-the-scenes stills
- "Stylist" for wardrobe stylists
- "Crafty" for craft services

For new roles not in this list:
- Keep role name exactly as written (normalized formatting only)
- Assign to most appropriate of 12 canonical departments
- Set needs_review=true

# CONFIDENCE CALIBRATION

- 0.95+ = All data clearly in same row, role explicitly stated, normalized correctly
- 0.85-0.94 = Role from visual layout (trusted but not explicit text)
- 0.80-0.89 = Role inferred from section header
- 0.70-0.79 = Email matched by proximity, role unknown
- 0.60-0.69 = Uncertain, needs human review
- Below 0.60 = Very uncertain, definitely needs_review=true

High confidence pairs (role+department combinations that get +0.1 confidence boost):
- "Director of Photography" + "Camera"
- "Gaffer" + "Grip & Electric"
- "Key Grip" + "Grip & Electric"
- "1st AD" + "Direction"
- "Production Coordinator" + "Agency/Production"
- "Sound Mixer" + "Sound"

Set needs_review=true if:
- Confidence below 0.7
- Role/department could not be confidently normalized
- Any data seems uncertain

# METADATA EXTRACTION

## Shoot Date Extraction
Look for shoot date in document header or prominently displayed.
Common formats: "SHOOT DATE: August 16, 2021", "DATE: 8/16/21", "Monday, August 16th, 2021", "Day 1 - Aug 16"
Return in YYYY-MM-DD format (e.g., "2021-08-16")
If no date found, return empty string ""

## Project Title Extraction
Extract project_title if visible (e.g., "TAB TIME", "NIKE CAMPAIGN", etc.)
Return empty string if not found

# OUTPUT FORMAT

Return a JSON object with this EXACT structure:
{
  "contacts": [
    {
      "name": "Full Name",
      "roles": ["Role 1"],
      "departments": ["One of 12 canonical departments"],
      "emails": ["email@example.com"],
      "phones": ["1234567890"],
      "ig_handle": "@handle or null",
      "confidence": 0.95,
      "needs_review": false
    }
  ],
  "project_title": "Name of the production or null",
  "parsed_date": "YYYY-MM-DD or null",
  "unassigned_emails": ["emails that could not be matched to a contact"],
  "unassigned_phones": ["phones that could not be matched to a contact"]
}

# FINAL INSTRUCTION

> "Extract EVERY person and EVERY piece of contact information. Missing data is worse than uncertain data."`;

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

    // Initialize timing tracking
    const parseStartTime = Date.now();
    const actionLog: { action: string; timestamp: string; duration_ms?: number }[] = [];
    
    const logAction = (action: string, startTime?: number) => {
      const entry: { action: string; timestamp: string; duration_ms?: number } = {
        action,
        timestamp: new Date().toISOString()
      };
      if (startTime) {
        entry.duration_ms = Date.now() - startTime;
      }
      actionLog.push(entry);
      console.log(`[parse-call-sheet] ${action}${entry.duration_ms ? ` (${entry.duration_ms}ms)` : ''}`);
    };

    logAction("Started processing");
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
    const downloadStart = Date.now();
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
    
    const fileSize = fileData.size;
    logAction(`PDF downloaded (${(fileSize / 1024).toFixed(1)} KB)`, downloadStart);

    // Extract text from PDF - try Firecrawl first (better OCR), fall back to unpdf
    let pdfText = "";
    let extractionMethod = "unpdf";
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (firecrawlApiKey) {
      console.log("[parse-call-sheet] Attempting extraction with Firecrawl...");
      const firecrawlStart = Date.now();
      
      try {
        // Generate signed URL for Firecrawl to access the PDF (5 min expiry)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("call_sheets")
          .createSignedUrl(callSheet.master_file_path, 300);
        
        if (signedUrlError || !signedUrlData?.signedUrl) {
          console.warn("[parse-call-sheet] Failed to create signed URL:", signedUrlError);
          throw new Error("Failed to create signed URL");
        }
        
        console.log("[parse-call-sheet] Signed URL created, calling Firecrawl...");
        
        // Call Firecrawl scrape endpoint
        const firecrawlResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: signedUrlData.signedUrl,
            formats: ["markdown"],
            onlyMainContent: false,
          }),
        });
        
        if (!firecrawlResponse.ok) {
          const errorText = await firecrawlResponse.text();
          console.warn("[parse-call-sheet] Firecrawl API error:", firecrawlResponse.status, errorText);
          throw new Error(`Firecrawl API error: ${firecrawlResponse.status}`);
        }
        
        const firecrawlData = await firecrawlResponse.json();
        const firecrawlText = firecrawlData.data?.markdown || firecrawlData.markdown || "";
        
        if (firecrawlText && firecrawlText.trim().length >= 100) {
          pdfText = firecrawlText;
          extractionMethod = "firecrawl";
          logAction(`Firecrawl extracted (${pdfText.length} chars)`, firecrawlStart);
          console.log("[parse-call-sheet] Firecrawl extraction successful");
        } else {
          console.warn(`[parse-call-sheet] Firecrawl returned insufficient text (${firecrawlText?.length || 0} chars), falling back to unpdf`);
          throw new Error("Firecrawl returned insufficient text");
        }
      } catch (firecrawlError) {
        console.warn("[parse-call-sheet] Firecrawl failed, falling back to unpdf:", firecrawlError);
      }
    } else {
      console.log("[parse-call-sheet] FIRECRAWL_API_KEY not configured, using unpdf");
    }

    // Fallback to unpdf if Firecrawl didn't work
    if (!pdfText || pdfText.trim().length < 100) {
      console.log("[parse-call-sheet] Extracting text from PDF with unpdf...");
      const extractStart = Date.now();
      pdfText = await extractTextFromPdf(fileData);
      extractionMethod = "unpdf";
      logAction(`unpdf extracted (${pdfText.length} chars)`, extractStart);
    }

    console.log(`[parse-call-sheet] Text extracted via ${extractionMethod}: ${pdfText.slice(0, 500)}...`);

    if (!pdfText || pdfText.trim().length < 100) {
      console.error("[parse-call-sheet] Insufficient text extracted from PDF");
      await markAsError(supabase, call_sheet_id, "PDF contains insufficient extractable text. It may be a scanned image - please upload a text-based PDF or try OCR.");
      return new Response(
        JSON.stringify({ error: "Insufficient extractable text in PDF" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to parse contacts with google/gemini-2.5-flash
    console.log("[parse-call-sheet] Sending to AI for parsing (google/gemini-2.5-flash)...");
    const aiStart = Date.now();
    const parseResult = await parseWithAI(pdfText, lovableApiKey);

    if (!parseResult || !parseResult.contacts) {
      console.error("[parse-call-sheet] AI parsing failed");
      await markAsError(supabase, call_sheet_id, "AI failed to parse contacts from the document");
      return new Response(
        JSON.stringify({ error: "AI parsing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logAction(`AI parsed ${parseResult.contacts.length} contacts`, aiStart);

    // Post-processing: Sanitize phones and validate contacts
    const sanitizeStart = Date.now();
    const sanitizedContacts = sanitizePhones(parseResult.contacts);
    const validatedContacts = validateAndNormalizeContacts(sanitizedContacts);
    logAction(`Contacts sanitized (${validatedContacts.length} final)`, sanitizeStart);

    // Calculate total elapsed time
    const totalElapsedMs = Date.now() - parseStartTime;
    const totalElapsedFormatted = `${(totalElapsedMs / 1000).toFixed(2)}s`;
    logAction(`Processing complete`);

    const parseTiming = {
      total_elapsed_ms: totalElapsedMs,
      total_elapsed_formatted: totalElapsedFormatted,
      model_used: "google/gemini-2.5-flash",
      extraction_method: extractionMethod
    };

    console.log(`[parse-call-sheet] Total processing time: ${totalElapsedFormatted}`);

    // CRITICAL: Extract canonical producers ONLY if not already set (FIRST PARSE ONLY)
    // This snapshot is IMMUTABLE and feeds the Heat Map + Network Graph
    let canonicalProducersUpdate: { canonical_producers?: CanonicalProducer[] } = {};
    if (!callSheet.canonical_producers) {
      const canonicalProducers = extractCanonicalProducers(validatedContacts);
      canonicalProducersUpdate = { canonical_producers: canonicalProducers };
      console.log(`[parse-call-sheet] LOCKED ${canonicalProducers.length} canonical producers (immutable snapshot)`);
    } else {
      console.log(`[parse-call-sheet] canonical_producers already locked, skipping (immutable)`);
    }

    // Update global_call_sheets with parsed data including timing
    const { error: updateError } = await supabase
      .from("global_call_sheets")
      .update({
        status: "parsed",
        parsed_contacts: validatedContacts,
        contacts_extracted: validatedContacts.length,
        project_title: parseResult.project_title,
        parsed_date: parseResult.parsed_date,
        parse_timing: parseTiming,
        parse_action_log: actionLog,
        error_message: null,
        updated_at: new Date().toISOString(),
        ...canonicalProducersUpdate
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

    console.log(`[parse-call-sheet] Successfully parsed call sheet ${call_sheet_id}, contacts: ${validatedContacts.length}`);

    // ============================================================================
    // AUTOMATED 4-STEP PIPELINE (Runs after EVERY successful parse)
    // Step 1: Auto-Add Crew Contacts (for uploader only)
    // Step 2: Create Attributions (link contacts to call sheet)
    // Step 3: Auto-Merge Duplicates (for this user only)
    // Step 4: Auto-Restore IG Handles (from user's IG map)
    // ============================================================================

    const uploaderUserId = callSheet.first_uploaded_by;
    
    if (uploaderUserId) {
      console.log(`[parse-call-sheet] PIPELINE START: Automating crew contact management for user ${uploaderUserId}`);
      
      try {
        // ========== STEP 1: AUTO-ADD CREW CONTACTS ==========
        console.log(`[parse-call-sheet] STEP 1: Auto-adding ${validatedContacts.length} contacts`);
        const insertedContactIds: string[] = [];
        
        for (const contact of validatedContacts) {
          // Build query to find existing contact by email, phone, or name
          // Check for existing contact with same name (case-insensitive)
          const { data: existingByName } = await supabase
            .from('crew_contacts')
            .select('id, phones, emails, roles, departments, ig_handle')
            .eq('user_id', uploaderUserId)
            .ilike('name', contact.name)
            .limit(1)
            .maybeSingle();
          
          // Check for existing contact by phone
          let existingByPhone = null;
          if (contact.phones && contact.phones.length > 0) {
            const { data } = await supabase
              .from('crew_contacts')
              .select('id, phones, emails, roles, departments, ig_handle, name')
              .eq('user_id', uploaderUserId)
              .overlaps('phones', contact.phones)
              .limit(1)
              .maybeSingle();
            existingByPhone = data;
          }
          
          // Check for existing contact by email
          let existingByEmail = null;
          if (contact.emails && contact.emails.length > 0) {
            const { data } = await supabase
              .from('crew_contacts')
              .select('id, phones, emails, roles, departments, ig_handle, name')
              .eq('user_id', uploaderUserId)
              .overlaps('emails', contact.emails)
              .limit(1)
              .maybeSingle();
            existingByEmail = data;
          }
          
          const existing = existingByName || existingByPhone || existingByEmail;
          
          if (existing) {
            // Merge with existing contact
            const mergedPhones = [...new Set([...(existing.phones || []), ...(contact.phones || [])])];
            const mergedEmails = [...new Set([...(existing.emails || []), ...(contact.emails || [])])];
            const mergedRoles = [...new Set([...(existing.roles || []), ...(contact.roles || [])])];
            const mergedDepartments = [...new Set([...(existing.departments || []), ...(contact.departments || [])])];
            
            await supabase
              .from('crew_contacts')
              .update({
                phones: mergedPhones,
                emails: mergedEmails,
                roles: mergedRoles,
                departments: mergedDepartments
              })
              .eq('id', existing.id);
            
            insertedContactIds.push(existing.id);
          } else {
            // Insert new contact
            const { data: newContact, error: insertError } = await supabase
              .from('crew_contacts')
              .insert({
                user_id: uploaderUserId,
                name: contact.name,
                phones: contact.phones || [],
                emails: contact.emails || [],
                roles: contact.roles || [],
                departments: contact.departments || [],
                confidence: contact.confidence,
                needs_review: contact.needs_review,
                project_title: parseResult.project_title
              })
              .select('id')
              .single();
            
            if (newContact && !insertError) {
              insertedContactIds.push(newContact.id);
            } else if (insertError) {
              console.error(`[parse-call-sheet] STEP 1 ERROR inserting ${contact.name}:`, insertError.message);
            }
          }
        }
        
        console.log(`[parse-call-sheet] STEP 1 COMPLETE: ${insertedContactIds.length} contacts added/merged`);
        
        // ========== STEP 2: CREATE ATTRIBUTIONS ==========
        console.log(`[parse-call-sheet] STEP 2: Creating ${insertedContactIds.length} attributions`);
        
        for (const contactId of insertedContactIds) {
          const { error: attrError } = await supabase
            .from('contact_call_sheets')
            .upsert(
              { contact_id: contactId, call_sheet_id: call_sheet_id },
              { onConflict: 'contact_id,call_sheet_id', ignoreDuplicates: true }
            );
          
          if (attrError) {
            console.error(`[parse-call-sheet] STEP 2 attribution error for ${contactId}:`, attrError.message);
          }
        }
        
        console.log(`[parse-call-sheet] STEP 2 COMPLETE: Attributions created`);
        
        // ========== STEP 3: AUTO-MERGE DUPLICATES ==========
        console.log(`[parse-call-sheet] STEP 3: Running duplicate detection for user ${uploaderUserId}`);
        
        // Fetch all contacts for this user
        const { data: userContacts } = await supabase
          .from('crew_contacts')
          .select('id, name, roles, phones, emails, ig_handle, departments')
          .eq('user_id', uploaderUserId);
        
        if (userContacts && userContacts.length > 1) {
          const duplicateGroups = findDuplicateGroupsInline(userContacts);
          
          let mergedCount = 0;
          for (const group of duplicateGroups) {
            // Merge data into primary
            const merged = mergeContactDataInline(group.primary, group.duplicates.map(d => d.contact));
            
            // Update primary contact with merged data
            await supabase
              .from('crew_contacts')
              .update({
                phones: merged.phones,
                emails: merged.emails,
                roles: merged.roles,
                departments: merged.departments,
                ig_handle: merged.ig_handle || group.primary.ig_handle
              })
              .eq('id', group.primary.id);
            
            // Get duplicate IDs
            const duplicateIds = group.duplicates.map(d => d.contact.id);
            
            // Re-assign attributions from duplicates to primary
            await supabase
              .from('contact_call_sheets')
              .update({ contact_id: group.primary.id })
              .in('contact_id', duplicateIds);
            
            // Delete duplicates
            await supabase
              .from('crew_contacts')
              .delete()
              .in('id', duplicateIds);
            
            mergedCount += duplicateIds.length;
            console.log(`[parse-call-sheet] STEP 3: Merged ${duplicateIds.length} duplicates into "${group.primary.name}"`);
          }
          
          console.log(`[parse-call-sheet] STEP 3 COMPLETE: Merged ${mergedCount} total duplicates`);
        } else {
          console.log(`[parse-call-sheet] STEP 3: No duplicates to merge (${userContacts?.length || 0} contacts)`);
        }
        
        // ========== STEP 4: AUTO-RESTORE IG HANDLES ==========
        console.log(`[parse-call-sheet] STEP 4: Restoring IG handles for user ${uploaderUserId}`);
        
        // Fetch user's IG map
        const { data: igMap } = await supabase
          .from('user_ig_map')
          .select('name, ig_handle')
          .eq('user_id', uploaderUserId);
        
        if (igMap && igMap.length > 0) {
          // Build lookup by normalized name
          const igLookup = new Map<string, string>();
          for (const entry of igMap) {
            igLookup.set(entry.name.toLowerCase().trim(), entry.ig_handle);
          }
          
          // Fetch contacts missing IG handles
          const { data: contactsMissingIG } = await supabase
            .from('crew_contacts')
            .select('id, name, ig_handle')
            .eq('user_id', uploaderUserId)
            .is('ig_handle', null);
          
          let restoredCount = 0;
          for (const contact of contactsMissingIG || []) {
            const normalizedName = contact.name.toLowerCase().trim();
            if (igLookup.has(normalizedName)) {
              await supabase
                .from('crew_contacts')
                .update({ ig_handle: igLookup.get(normalizedName) })
                .eq('id', contact.id);
              restoredCount++;
            }
          }
          
          console.log(`[parse-call-sheet] STEP 4 COMPLETE: Restored ${restoredCount} IG handles`);
        } else {
          console.log(`[parse-call-sheet] STEP 4: No IG map found for user, skipping`);
        }
        
        console.log(`[parse-call-sheet] PIPELINE COMPLETE for call sheet ${call_sheet_id}`);
        
      } catch (pipelineError) {
        // Log pipeline errors but don't fail the entire parse
        console.error(`[parse-call-sheet] PIPELINE ERROR:`, pipelineError);
      }
    } else {
      console.log(`[parse-call-sheet] PIPELINE SKIPPED: No uploader user_id found`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        contacts_count: validatedContacts.length,
        project_title: parseResult.project_title,
        unassigned_emails: parseResult.unassigned_emails?.length || 0,
        unassigned_phones: parseResult.unassigned_phones?.length || 0,
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

// ============================================================================
// POST-PROCESSING: Phone Sanitization (Extra Credit Rules)
// ============================================================================

function sanitizePhones(contacts: ParsedContact[]): ParsedContact[] {
  const seenPhones = new Set<string>();
  
  return contacts.map(contact => {
    const cleanedPhones = (contact.phones || [])
      .filter(phone => {
        if (!phone) return false;
        
        // Rule 1: If phone > 100 chars → hallucination, reject
        if (phone.length > 100) {
          console.log(`[sanitizePhones] Rejecting hallucinated phone (>100 chars): ${phone.slice(0, 50)}...`);
          return false;
        }
        
        // Rule 2: If contains JSON garbage → reject entirely
        if (/[{}\[\]:"]/.test(phone)) {
          console.log(`[sanitizePhones] Rejecting JSON garbage phone: ${phone}`);
          return false;
        }
        
        return true;
      })
      .map(phone => {
        // Extract only digits
        const digits = phone.replace(/\D/g, '');
        
        // Must be exactly 10 digits, take first 10 if more
        if (digits.length >= 10) {
          return digits.slice(0, 10);
        }
        
        return null;
      })
      .filter((phone): phone is string => {
        if (!phone) return false;
        
        // Check for duplicates across all contacts
        if (seenPhones.has(phone)) {
          console.log(`[sanitizePhones] Removing duplicate phone: ${phone}`);
          return false;
        }
        
        seenPhones.add(phone);
        return true;
      });

    // Rule 3: Max 3 phones per contact (more = hallucination)
    // Rule 4: If >5 candidates before filtering → wipe all
    if ((contact.phones || []).length > 5) {
      console.log(`[sanitizePhones] Wiping all phones for ${contact.name} (>5 candidates = hallucination)`);
      return { ...contact, phones: [], needs_review: true };
    }

    return { ...contact, phones: cleanedPhones.slice(0, 3) };
  });
}

// ============================================================================
// POST-PROCESSING: Validate and Normalize Contacts
// ============================================================================

const CANONICAL_DEPARTMENTS = [
  "Agency/Production",
  "Direction",
  "Camera",
  "Sound",
  "Grip & Electric",
  "Art",
  "Hair/Makeup/Grooming",
  "Styling/Wardrobe",
  "Casting",
  "Miscellaneous",
  "Post-Production",
  "Vendors/Services"
];

function validateAndNormalizeContacts(contacts: ParsedContact[]): ParsedContact[] {
  return contacts
    .filter(contact => {
      // Remove contacts where name is an email
      if (contact.name && contact.name.includes('@')) {
        console.log(`[validateContacts] Removing contact with email as name: ${contact.name}`);
        return false;
      }
      
      // Remove contacts with empty/null names
      if (!contact.name || contact.name.trim().length < 2) {
        return false;
      }
      
      return true;
    })
    .map(contact => {
      // Normalize departments to canonical list
      const normalizedDepartments = (contact.departments || []).map(dept => {
        const lowerDept = dept.toLowerCase();
        
        if (lowerDept.includes('hair') || lowerDept.includes('makeup') || lowerDept.includes('hmua') || lowerDept.includes('grooming')) {
          return "Hair/Makeup/Grooming";
        }
        if (lowerDept.includes('wardrobe') || lowerDept.includes('styling') || lowerDept.includes('costume')) {
          return "Styling/Wardrobe";
        }
        if (lowerDept.includes('grip') || lowerDept.includes('electric') || lowerDept.includes('g&e')) {
          return "Grip & Electric";
        }
        if (lowerDept.includes('camera') || lowerDept.includes('dp') || lowerDept.includes('bts') || lowerDept.includes('photo')) {
          return "Camera";
        }
        if (lowerDept.includes('sound') || lowerDept.includes('audio')) {
          return "Sound";
        }
        if (lowerDept.includes('art') || lowerDept.includes('set dec') || lowerDept.includes('props')) {
          return "Art";
        }
        if (lowerDept.includes('cast') || lowerDept.includes('talent') || lowerDept.includes('performer') || lowerDept.includes('actor') || lowerDept.includes('model')) {
          return "Casting";
        }
        if (lowerDept.includes('direct') || lowerDept.includes('ad ') || lowerDept === 'ad' || lowerDept.includes('script')) {
          return "Direction";
        }
        if (lowerDept.includes('produc') || lowerDept.includes('agency') || lowerDept.includes('coordinator') || lowerDept.includes('pa')) {
          return "Agency/Production";
        }
        if (lowerDept.includes('post') || lowerDept.includes('edit') || lowerDept.includes('vfx') || lowerDept.includes('color')) {
          return "Post-Production";
        }
        if (lowerDept.includes('vendor') || lowerDept.includes('rental') || lowerDept.includes('catering') || lowerDept.includes('service')) {
          return "Vendors/Services";
        }
        if (lowerDept.includes('location') || lowerDept.includes('transport') || lowerDept.includes('craft') || lowerDept.includes('medic')) {
          return "Miscellaneous";
        }
        
        // If already canonical, return as-is
        if (CANONICAL_DEPARTMENTS.includes(dept)) {
          return dept;
        }
        
        return "Miscellaneous";
      });

      // Validate emails
      const validEmails = (contact.emails || []).filter(email => {
        if (!email) return false;
        return email.includes('@') && email.includes('.') && !email.startsWith('@');
      });

      // Calculate needs_review based on confidence
      const confidence = contact.confidence || 0.75;
      const needsReview = confidence < 0.80 || contact.needs_review === true;

      return {
        ...contact,
        departments: [...new Set(normalizedDepartments)],
        emails: validEmails,
        confidence: confidence,
        needs_review: needsReview
      };
    });
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
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Parse this call sheet text and extract contacts using ALL 23 refinements and the 4-pass extraction methodology:\n\n${text.slice(0, 50000)}` }
      ],
      max_completion_tokens: 16000,
      tools: [
        {
          type: "function",
          function: {
            name: "extract_contacts",
            description: "Extract structured contact information from a call sheet using the Extra Credit parser rules",
            parameters: {
              type: "object",
              properties: {
                contacts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Full name of the person (NEVER an email address)" },
                      roles: { type: "array", items: { type: "string" }, description: "Job titles/roles using canonical names" },
                      departments: { type: "array", items: { type: "string" }, description: "One of 12 canonical departments" },
                      emails: { type: "array", items: { type: "string" }, description: "Email addresses" },
                      phones: { type: "array", items: { type: "string" }, description: "Phone numbers (exactly 10 digits each, max 1 per contact)" },
                      ig_handle: { type: "string", nullable: true, description: "Instagram handle" },
                      confidence: { type: "number", description: "Confidence score 0.0-1.0 based on calibration rules" },
                      needs_review: { type: "boolean", description: "True if confidence < 0.80 or data uncertain" }
                    },
                    required: ["name", "roles", "departments", "emails", "phones", "confidence", "needs_review"]
                  }
                },
                project_title: { type: "string", nullable: true, description: "Name of the production" },
                parsed_date: { type: "string", nullable: true, description: "Date from call sheet (YYYY-MM-DD)" },
                unassigned_emails: { type: "array", items: { type: "string" }, description: "Emails that could not be matched to a contact" },
                unassigned_phones: { type: "array", items: { type: "string" }, description: "Phones that could not be matched to a contact" }
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
      console.log(`[parse-call-sheet] AI returned ${parsed.contacts?.length || 0} contacts, ${parsed.unassigned_emails?.length || 0} unassigned emails`);
      return {
        contacts: parsed.contacts || [],
        project_title: parsed.project_title || null,
        parsed_date: parsed.parsed_date || null,
        unassigned_emails: parsed.unassigned_emails || [],
        unassigned_phones: parsed.unassigned_phones || [],
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
          unassigned_emails: parsed.unassigned_emails || [],
          unassigned_phones: parsed.unassigned_phones || [],
        };
      }
    } catch (e) {
      console.error("[parse-call-sheet] Failed to parse content as JSON:", e);
    }
  }

  throw new Error("AI returned unexpected response format");
}

// ============================================================================
// INLINE DUPLICATE DETECTION (Ported from src/lib/duplicateDetection.ts)
// These functions run inside the edge function without external imports
// ============================================================================

interface ContactForMatchingInline {
  id: string;
  name: string;
  roles: string[] | null;
  phones: string[] | null;
  emails: string[] | null;
  ig_handle: string | null;
  departments?: string[] | null;
}

interface DuplicateGroupInline {
  primary: ContactForMatchingInline;
  duplicates: Array<{
    contact: ContactForMatchingInline;
    matchedFields: ('name' | 'role' | 'phone' | 'email' | 'ig')[];
  }>;
}

function normalizePhoneInline(phone: string): string {
  return phone.replace(/\D/g, '');
}

function normalizeEmailInline(email: string): string {
  return email.toLowerCase().trim();
}

function fuzzyNameMatchInline(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  
  if (n1 === n2) return true;
  
  const parts1 = n1.split(/\s+/);
  const parts2 = n2.split(/\s+/);
  
  if (parts1.length < 2 || parts2.length < 2) {
    return n1.startsWith(n2) || n2.startsWith(n1);
  }
  
  const last1 = parts1[parts1.length - 1];
  const last2 = parts2[parts2.length - 1];
  if (last1 !== last2) return false;
  
  const first1 = parts1[0];
  const first2 = parts2[0];
  return first1.startsWith(first2) || first2.startsWith(first1);
}

function areContactsDuplicatesInline(
  contact1: ContactForMatchingInline,
  contact2: ContactForMatchingInline
): { isDuplicate: boolean; matchedFields: ('name' | 'role' | 'phone' | 'email' | 'ig')[] } {
  const matchedFields: ('name' | 'role' | 'phone' | 'email' | 'ig')[] = [];
  let hasPhoneOrEmailMatch = false;
  
  const phones1 = (contact1.phones || []).map(normalizePhoneInline);
  const phones2 = (contact2.phones || []).map(normalizePhoneInline);
  const emails1 = (contact1.emails || []).map(normalizeEmailInline);
  const emails2 = (contact2.emails || []).map(normalizeEmailInline);
  
  if (fuzzyNameMatchInline(contact1.name, contact2.name)) {
    matchedFields.push('name');
  }
  
  const roles1 = (contact1.roles || []).map(r => r.toLowerCase());
  const roles2 = (contact2.roles || []).map(r => r.toLowerCase());
  if (roles1.some(r => roles2.includes(r))) {
    matchedFields.push('role');
  }
  
  if (phones1.some(p => p && phones2.includes(p))) {
    matchedFields.push('phone');
    hasPhoneOrEmailMatch = true;
  }
  
  if (emails1.some(e => e && emails2.includes(e))) {
    matchedFields.push('email');
    hasPhoneOrEmailMatch = true;
  }
  
  const ig1 = contact1.ig_handle?.toLowerCase().replace('@', '');
  const ig2 = contact2.ig_handle?.toLowerCase().replace('@', '');
  if (ig1 && ig2 && ig1 === ig2) {
    matchedFields.push('ig');
    hasPhoneOrEmailMatch = true;
  }
  
  if (matchedFields.length < 2) {
    return { isDuplicate: false, matchedFields: [] };
  }
  
  const isSingleWordName = contact1.name.trim().split(/\s+/).length === 1 ||
                           contact2.name.trim().split(/\s+/).length === 1;
  if (isSingleWordName && !hasPhoneOrEmailMatch) {
    return { isDuplicate: false, matchedFields: [] };
  }
  
  return { isDuplicate: true, matchedFields };
}

function findDuplicateGroupsInline(contacts: ContactForMatchingInline[]): DuplicateGroupInline[] {
  const groups: DuplicateGroupInline[] = [];
  const processedIds = new Set<string>();
  
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    
    if (processedIds.has(contact.id)) continue;
    
    const duplicates: DuplicateGroupInline['duplicates'] = [];
    
    for (let j = i + 1; j < contacts.length; j++) {
      const other = contacts[j];
      
      if (processedIds.has(other.id)) continue;
      
      const { isDuplicate, matchedFields } = areContactsDuplicatesInline(contact, other);
      
      if (isDuplicate) {
        duplicates.push({ contact: other, matchedFields });
        processedIds.add(other.id);
      }
    }
    
    if (duplicates.length > 0) {
      processedIds.add(contact.id);
      groups.push({
        primary: contact,
        duplicates
      });
    }
  }
  
  return groups;
}

function mergeContactDataInline(
  primary: ContactForMatchingInline,
  duplicates: ContactForMatchingInline[]
): {
  phones: string[];
  emails: string[];
  roles: string[];
  departments: string[];
  ig_handle: string | null;
} {
  const allPhones = new Set<string>();
  const allEmails = new Set<string>();
  const allRoles = new Set<string>();
  const allDepartments = new Set<string>();
  let igHandle = primary.ig_handle;
  
  (primary.phones || []).forEach(p => allPhones.add(p));
  (primary.emails || []).forEach(e => allEmails.add(e));
  (primary.roles || []).forEach(r => allRoles.add(r));
  (primary.departments || []).forEach(d => allDepartments.add(d));
  
  for (const dup of duplicates) {
    (dup.phones || []).forEach(p => allPhones.add(p));
    (dup.emails || []).forEach(e => allEmails.add(e));
    (dup.roles || []).forEach(r => allRoles.add(r));
    (dup.departments || []).forEach(d => allDepartments.add(d));
    if (!igHandle && dup.ig_handle) {
      igHandle = dup.ig_handle;
    }
  }
  
  return {
    phones: Array.from(allPhones),
    emails: Array.from(allEmails),
    roles: Array.from(allRoles),
    departments: Array.from(allDepartments),
    ig_handle: igHandle
  };
}
