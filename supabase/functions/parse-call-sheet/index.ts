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

// ============================================================================
// ANCHOR EXTRACTION - Deterministic phone/email extraction (NO AI)
// This is the "leash" that prevents hallucinations
// ============================================================================

interface Anchors {
  phones: string[];
  emails: string[];
  igHandles: string[];
}

// Known-good email domains (expandable)
const KNOWN_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'icloud.com', 'outlook.com', 'hotmail.com',
  'aol.com', 'me.com', 'mac.com', 'live.com', 'msn.com',
  'protonmail.com', 'ymail.com', 'comcast.net', 'att.net', 'sbcglobal.net',
];

const GARBAGE_DOMAINS = [
  'amall.com', 'amalll.com', 'amial.com', 'amail.com', 'amiall.com',
  'amaill.com', 'gmial.com', 'gmaill.com', 'gmall.com',
];

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function correctEmailDomain(email: string): { corrected: string; changed: boolean; reason?: string } {
  if (email.endsWith('...') || email.endsWith('\u2026') || !email.includes('.')) {
    return { corrected: email, changed: false, reason: 'truncated_or_invalid' };
  }

  const [local, domain] = email.split('@');
  if (!local || !domain) return { corrected: email, changed: false };

  const lowerDomain = domain.toLowerCase();

  if (KNOWN_EMAIL_DOMAINS.includes(lowerDomain)) {
    return { corrected: email, changed: false };
  }

  const domainParts = lowerDomain.split('.');
  if (domainParts.length > 2 || (domainParts[0].length > 8 && !GARBAGE_DOMAINS.includes(lowerDomain))) {
    return { corrected: email, changed: false };
  }

  let bestMatch = '';
  let bestDistance = Infinity;

  for (const known of KNOWN_EMAIL_DOMAINS) {
    const dist = levenshteinDistance(lowerDomain, known);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = known;
    }
  }

  if (bestDistance <= 2 && bestDistance > 0) {
    const corrected = `${local}@${bestMatch}`;
    console.log(`[parse-call-sheet] Email corrected: ${email} -> ${corrected} (distance=${bestDistance})`);
    return { corrected, changed: true, reason: `${lowerDomain} -> ${bestMatch} (dist=${bestDistance})` };
  }

  return { corrected: email, changed: false };
}

function extractAnchors(text: string): Anchors {
  const phones = new Set<string>();
  const emails = new Set<string>();
  const igHandles = new Set<string>();

  // Phone extraction: various formats, normalized to 10 digits
  const phoneMatches = text.matchAll(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g);
  for (const m of phoneMatches) {
    const digits = m[0].replace(/\D/g, "");
    // Handle US format: 11 digits starting with 1 → strip leading 1
    const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
    if (ten.length === 10) {
      phones.add(ten);
    }
  }

  // Email extraction: standard email pattern
  const emailMatches = text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  for (const m of emailMatches) {
    let email = m[0].toLowerCase().trim();
    if (!email.startsWith('.') && !email.endsWith('.') && email.includes('.')) {
      const { corrected } = correctEmailDomain(email);
      emails.add(corrected);
    }
  }

  // IG handle extraction: @username pattern
  const igMatches = text.matchAll(/@([a-zA-Z0-9._]{2,30})/g);
  for (const m of igMatches) {
    const handle = m[1].toLowerCase();
    // Filter out common false positives
    if (!handle.includes('.com') && !handle.includes('.net') && !handle.includes('@')) {
      igHandles.add(handle);
    }
  }

  return {
    phones: [...phones],
    emails: [...emails],
    igHandles: [...igHandles]
  };
}

// ============================================================================
// PRODUCER ROLE DETECTION - For canonical producer extraction
// ============================================================================

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
  production_company: string | null;
}

// ============================================================================
// PROJECT FINGERPRINT SYSTEM - For auto-grouping call sheets into projects
// ============================================================================

interface ProjectFingerprint {
  normalized_title: string | null;
  producer_names: string[];
  director_name: string | null;
  production_company: string | null;
  date_range: {
    earliest: string | null;
    latest: string | null;
  };
  key_crew_hash: string;
}

function normalizeTitle(title: string | null): string | null {
  if (!title) return null;
  return title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function findDirector(contacts: ParsedContact[]): string | null {
  const directorRoles = ['director', 'director of photography', 'dp', 'cinematographer'];
  for (const contact of contacts) {
    const hasDirectorRole = (contact.roles || []).some(role => 
      directorRoles.includes(role.toLowerCase().trim())
    );
    if (hasDirectorRole) {
      return normalizeName(contact.name);
    }
  }
  return null;
}

function hashTopCrew(contacts: ParsedContact[]): string {
  const names = contacts
    .map(c => normalizeName(c.name))
    .filter(n => n && !n.includes('tbd'))
    .sort()
    .slice(0, 5);
  return names.join('|').slice(0, 64);
}

function generateFingerprint(
  projectTitle: string | null,
  canonicalProducers: CanonicalProducer[],
  contacts: ParsedContact[],
  parsedDate: string | null
): ProjectFingerprint {
  return {
    normalized_title: normalizeTitle(projectTitle),
    producer_names: canonicalProducers.map(p => normalizeName(p.name)),
    director_name: findDirector(contacts),
    production_company: null,
    date_range: { earliest: parsedDate, latest: parsedDate },
    key_crew_hash: hashTopCrew(contacts)
  };
}

function fuzzyTitleMatch(t1: string | null, t2: string | null): number {
  if (!t1 || !t2) return 0;
  if (t1 === t2) return 1;
  if (t1.includes(t2) || t2.includes(t1)) return 0.85;
  
  const words1 = new Set(t1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(t2.split(' ').filter(w => w.length > 2));
  if (words1.size === 0 || words2.size === 0) return 0;
  
  let overlap = 0;
  for (const w of words1) {
    if (words2.has(w)) overlap++;
  }
  
  return overlap / Math.max(words1.size, words2.size);
}

function computeFingerprintSimilarity(fp1: ProjectFingerprint, fp2: ProjectFingerprint): number {
  let score = 0;
  let weights = 0;

  if (fp1.normalized_title || fp2.normalized_title) {
    const titleSim = fuzzyTitleMatch(fp1.normalized_title, fp2.normalized_title);
    score += titleSim * 30;
    weights += 30;
  }

  if (fp1.producer_names.length > 0 && fp2.producer_names.length > 0) {
    const set1 = new Set(fp1.producer_names);
    const set2 = new Set(fp2.producer_names);
    let overlap = 0;
    for (const name of set1) {
      if (set2.has(name)) overlap++;
    }
    const maxPossible = Math.max(set1.size, set2.size);
    score += (overlap / maxPossible) * 40;
    weights += 40;
  }

  if (fp1.director_name && fp2.director_name) {
    if (fp1.director_name === fp2.director_name) {
      score += 20;
    } else if (fp1.director_name.includes(fp2.director_name) || fp2.director_name.includes(fp1.director_name)) {
      score += 15;
    }
    weights += 20;
  }

  if (fp1.date_range.earliest && fp2.date_range.earliest) {
    try {
      const d1 = new Date(fp1.date_range.earliest).getTime();
      const d2 = new Date(fp2.date_range.earliest).getTime();
      const daysDiff = Math.abs((d1 - d2) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 5) score += 10;
      else if (daysDiff <= 14) score += 5;
    } catch { /* ignore date parse errors */ }
    weights += 10;
  }

  return weights > 0 ? score / weights : 0;
}

const FINGERPRINT_MATCH_THRESHOLD = 0.65;

// ============================================================================
// EXTRACTION QUALITY SCORING
// ============================================================================

interface ExtractionQuality {
  passed: boolean;
  charCount: number;
  phonePatterns: number;
  emailPatterns: number;
  keywordScore: number;
  callTimePatterns: number;
  passedVia: 'contact' | 'crew_grid' | 'priority' | null;
  reason?: string;
}

function scoreExtraction(text: string, priorityMode: boolean = false): ExtractionQuality {
  const charCount = text.trim().length;
  
  const phoneRegex = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phoneMatches = text.match(phoneRegex) || [];
  const phonePatterns = new Set(phoneMatches.map(p => p.replace(/\D/g, ''))).size;
  
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const emailMatches = text.match(emailRegex) || [];
  const emailPatterns = new Set(emailMatches.map(e => e.toLowerCase())).size;
  
  const callTimeRegex = /\b\d{1,2}:\d{2}\s?(AM|PM|A|P)\b/gi;
  const callTimePatterns = (text.match(callTimeRegex) || []).length;
  
  const keywords = [
    'CALL SHEET', 'CALL TIME', 'CREW', 'LOCATION', 'LUNCH', 
    'WRAP', 'PRODUCTION', 'DIRECTOR', 'PRODUCER', 'SET',
    'DEPARTMENT', 'CAMERA', 'SOUND', 'GRIP', 'ELECTRIC',
    'HAIR', 'MAKEUP', 'WARDROBE', 'TALENT', 'CAST'
  ];
  const keywordScore = keywords.filter(kw => text.toUpperCase().includes(kw)).length;
  
  const hasEnoughContent = charCount >= 800;
  const hasContactInfo = phonePatterns >= 3 || emailPatterns >= 2;
  const hasKeywords = keywordScore >= 1;
  const passesContactRule = hasEnoughContent && hasContactInfo && hasKeywords;
  const passesCrewGridRule = charCount >= 400 && callTimePatterns >= 8 && keywordScore >= 1;
  const passesPriorityRule = priorityMode && charCount >= 200 && keywordScore >= 1;
  
  const passed = passesContactRule || passesCrewGridRule || passesPriorityRule;
  const passedVia = passesContactRule ? 'contact' : 
                    passesCrewGridRule ? 'crew_grid' : 
                    passesPriorityRule ? 'priority' : null;
  
  let reason: string | undefined;
  if (!passed) {
    const issues: string[] = [];
    if (!hasEnoughContent) issues.push(`chars: ${charCount}/800`);
    if (!hasContactInfo) issues.push(`phones: ${phonePatterns}/3 OR emails: ${emailPatterns}/2`);
    if (callTimePatterns < 8) issues.push(`callTimes: ${callTimePatterns}/8`);
    if (!hasKeywords) issues.push(`keywords: ${keywordScore}/1`);
    reason = `Quality check failed: ${issues.join(', ')}`;
  }
  
  return { passed, charCount, phonePatterns, emailPatterns, keywordScore, callTimePatterns, passedVia, reason };
}

// ============================================================================
// MULTIMODAL SYSTEM PROMPT - Anchors-first, vision-aware
// ============================================================================

const MULTIMODAL_SYSTEM_PROMPT = `You are an expert call sheet parser. You will receive:
1. Screenshot image(s) of the call sheet - USE THIS TO SEE THE TABLE LAYOUT
2. Pre-extracted anchors (phones/emails) - THESE ARE GROUND TRUTH
3. Optional text hints

# CRITICAL RULES - ANCHORS ARE YOUR LEASH

**PREFER ANCHORS, BUT TRUST YOUR VISION**
- You will receive a list of pre-extracted phones and emails (anchors)
- PREFER phones/emails from the anchors list — these are high-confidence
- If you see a phone/email clearly visible in the document but it's NOT in anchors, you MAY include it — set confidence lower (0.70-0.80) and add it to "unverified_candidates" too
- NEVER invent or hallucinate phone numbers or emails — only output what you can SEE

**USE THE DOCUMENT FOR LAYOUT**
- The document shows the actual table structure - USE IT
- Row alignment, column boundaries, section headers - all visible
- Match each anchor phone/email to the correct person by their visual row position
- For multi-page documents, extract contacts from ALL pages

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

# OUTPUT REQUIREMENTS

For each contact, provide:
- name: Full name (NEVER an email)
- roles: Job titles using canonical names
- departments: One of 12 canonical departments
- phones: ONLY phones from the anchors list (max 1 per person)
- emails: ONLY emails from the anchors list
- ig_handle: Instagram handle if visible
- confidence: 0.0-1.0 based on certainty
- needs_review: true if confidence < 0.80

Also return:
- project_title: Production name if visible
- parsed_date: Date in YYYY-MM-DD format
- unassigned_emails: Anchor emails that couldn't be matched to anyone
- unassigned_phones: Anchor phones that couldn't be matched to anyone
- unverified_candidates: Phones/emails seen in image but NOT in anchors (for verification)

# CONFIDENCE CALIBRATION
- 0.95+: All data clearly visible in same row, anchor matched
- 0.85-0.94: Layout trusted, anchor matched
- 0.70-0.84: Some inference needed, set needs_review=true
- Below 0.70: Uncertain, definitely needs_review=true`;

// ============================================================================
// TEXT-ONLY FALLBACK PROMPT (when screenshots unavailable)
// ============================================================================

const TEXT_FALLBACK_PROMPT = `You are an expert call sheet parser. Extract ALL contacts using these rules:

# ANCHORS ARE HIGH-CONFIDENCE DATA
- Pre-extracted phones/emails will be provided as "anchors"
- PREFER phones/emails from the anchors list
- If you find additional phones/emails clearly present in the text, include them with lower confidence (0.70-0.80)
- Never hallucinate contact information — only output what is explicitly in the text

# EXTRACTION METHOD
1. Find each person's name and role
2. Match anchor phones/emails by proximity in the text
3. If uncertain which phone belongs to whom, leave it unassigned

# 12 CANONICAL DEPARTMENTS
1. Agency/Production, 2. Direction, 3. Camera, 4. Sound, 5. Grip & Electric
6. Art, 7. Hair/Makeup/Grooming, 8. Styling/Wardrobe, 9. Casting
10. Miscellaneous, 11. Post-Production, 12. Vendors/Services

# OUTPUT
- contacts: Array of {name, roles, departments, phones, emails, ig_handle, confidence, needs_review}
- project_title, parsed_date
- unassigned_emails, unassigned_phones (anchors that couldn't be matched)`;

// ============================================================================
// MAIN SERVE HANDLER
// ============================================================================

serve(async (req) => {
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

    const parseStartTime = Date.now();
    const actionLog: { action: string; timestamp: string; duration_ms?: number }[] = [];
    
    const logAction = (action: string, startTime?: number) => {
      const entry: { action: string; timestamp: string; duration_ms?: number } = {
        action,
        timestamp: new Date().toISOString()
      };
      if (startTime) entry.duration_ms = Date.now() - startTime;
      actionLog.push(entry);
      console.log(`[parse-call-sheet] ${action}${entry.duration_ms ? ` (${entry.duration_ms}ms)` : ''}`);
    };

    logAction("Started processing (Option B: Anchor + Vision)");
    console.log(`[parse-call-sheet] Processing call sheet: ${call_sheet_id}`);

    // Fetch call sheet record
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

    // Download PDF
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

    const isPriorityMode = callSheet.extraction_mode === "firecrawl_priority";
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");

    // =========================================================================
    // STEP 1: EXTRACT ANCHORS FROM UNPDF (deterministic, fast)
    // =========================================================================
    
    const anchorStart = Date.now();
    const unpdfText = await extractTextFromPdf(fileData);
    const anchors = extractAnchors(unpdfText);
    logAction(`Anchors extracted: ${anchors.phones.length} phones, ${anchors.emails.length} emails, ${anchors.igHandles.length} IGs`, anchorStart);
    console.log(`[parse-call-sheet] Anchors: phones=${JSON.stringify(anchors.phones.slice(0, 3))}..., emails=${JSON.stringify(anchors.emails.slice(0, 3))}...`);

    // Quality check on unpdf text
    const unpdfQuality = scoreExtraction(unpdfText, isPriorityMode);
    console.log(`[parse-call-sheet] unpdf quality: passed=${unpdfQuality.passed}, chars=${unpdfQuality.charCount}, phones=${unpdfQuality.phonePatterns}`);

    // =========================================================================
    // STEP 2: GET FIRECRAWL SCREENSHOT (multimodal input)
    // =========================================================================
    
    // Convert PDF to base64 for direct AI model upload (replaces Firecrawl single-page screenshot)
    let pdfBase64 = "";
    let extractionMethod = "unpdf_text_only";
    
    const pdfConvertStart = Date.now();
    try {
      const arrayBuffer = await fileData.arrayBuffer();
      // Convert to base64 for Gemini PDF upload
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      pdfBase64 = btoa(binary);
      extractionMethod = "direct_pdf_upload";
      logAction(`PDF converted to base64 (${(pdfBase64.length / 1024).toFixed(1)} KB base64)`, pdfConvertStart);
    } catch (pdfErr) {
      console.warn("[parse-call-sheet] PDF base64 conversion failed:", pdfErr);
      logAction(`PDF base64 conversion failed: ${pdfErr instanceof Error ? pdfErr.message : 'unknown'}`);
    }

    // =========================================================================
    // STEP 3: QUALITY GATE - Determine best extraction path
    // =========================================================================
    
    const hasPdfDirect = pdfBase64.length > 0;
    const bestTextQuality = unpdfQuality;
    const bestText = unpdfText;
    
    // Minimum anchor threshold
    const minAnchors = anchors.phones.length >= 1 || anchors.emails.length >= 1;
    
    if (!minAnchors && !hasPdfDirect && !bestTextQuality.passed) {
      const errorDetails = `No anchors (phones: ${anchors.phones.length}, emails: ${anchors.emails.length}), no screenshot, quality check failed`;
      console.error(`[parse-call-sheet] Quality too low: ${errorDetails}`);
      await markAsError(supabase, call_sheet_id, 
        `Document quality too low for reliable parsing. ${errorDetails}. Try uploading a higher quality PDF.`
      );
      return new Response(
        JSON.stringify({ success: false, error_code: "quality_too_low", error: "Document quality too low", quality: bestTextQuality }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // STEP 4: MULTIMODAL AI PARSING (with anchors as leash)
    // =========================================================================
    
    const aiStart = Date.now();
    let parseResult: ParseResult;
    let modelUsed = "google/gemini-2.5-pro"; // Single-pass with strongest model
    let escalated = false;

    if (hasPdfDirect) {
      // PRIMARY PATH: Direct PDF upload to Gemini (full visual context, all pages)
      console.log("[parse-call-sheet] Using direct PDF upload path (all pages, full context)");
      parseResult = await parseWithDirectPdf(
        pdfBase64,
        anchors,
        bestText.slice(0, 30000), // Text as supplemental context (increased from 10k)
        lovableApiKey,
        "google/gemini-2.5-pro"
      );
      modelUsed = "google/gemini-2.5-pro";
    } else {
      // FALLBACK PATH: Text-only with anchors
      console.log("[parse-call-sheet] Using text-only path with anchors (no PDF available)");
      parseResult = await parseWithTextOnly(
        bestText,
        anchors,
        lovableApiKey,
        "google/gemini-2.5-pro" // Use strongest model even for text-only
      );
      modelUsed = "google/gemini-2.5-pro";
    }

    if (!parseResult || !parseResult.contacts) {
      console.error("[parse-call-sheet] AI parsing failed");
      await markAsError(supabase, call_sheet_id, "AI failed to parse contacts from the document");
      return new Response(
        JSON.stringify({ error: "AI parsing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logAction(`AI parsed ${parseResult.contacts.length} contacts`, aiStart);

    // =========================================================================
    // STEP 5: VERIFICATION + REPAIR (deterministic)
    // =========================================================================
    
    const verifyStart = Date.now();
    const { verified, metrics } = verifyAndRepairContacts(parseResult, anchors);
    logAction(`Verified: ${verified.length} contacts, ${metrics.unassignedPhones} unassigned phones, ${metrics.unassignedEmails} unassigned emails`, verifyStart);
    
    console.log(`[parse-call-sheet] Verification metrics: unassignedRatio=${metrics.unassignedRatio.toFixed(2)}, unknownNameRatio=${metrics.unknownNameRatio.toFixed(2)}`);

    // STEP 6: ESCALATION REMOVED — Single-pass with strongest model (gemini-2.5-pro)
    // Previous architecture used triple-pass (flash → GPT escalation → GPT correction)
    // which added latency and mutation risk. Now using one strong model pass.
    logAction(`Single-pass complete, skipping escalation (using ${modelUsed})`);

    // =========================================================================
    // STEP 7: FINAL SANITIZATION + VALIDATION
    // =========================================================================
    
    const sanitizeStart = Date.now();
    const sanitizedContacts = sanitizePhones(parseResult.contacts);
    const validatedContacts = validateAndNormalizeContacts(sanitizedContacts);
    
    // Anchor scoring pass: lower confidence for non-anchor data instead of deleting
    const finalContacts = scoreByAnchorMatch(validatedContacts, anchors);
    logAction(`Final: ${finalContacts.length} contacts after sanitization`, sanitizeStart);

    // =========================================================================
    // STEP 7.5: GPT-5.2 FINAL CORRECTION PASS
    // =========================================================================
    
    const correctionStart = Date.now();
    const correctedContacts = await correctWithGPT52(bestText, finalContacts, lovableApiKey);
    logAction(`GPT-5.2 correction: ${correctedContacts.length} contacts (was ${finalContacts.length})`, correctionStart);

    const totalElapsedMs = Date.now() - parseStartTime;

    const parseTiming = {
      total_elapsed_ms: totalElapsedMs,
      total_elapsed_formatted: `${(totalElapsedMs / 1000).toFixed(2)}s`,
      model_used: modelUsed,
      extraction_method: extractionMethod,
      has_pdf_direct: hasPdfDirect,
      escalated: escalated,
      gpt52_correction: true,
      anchors_found: { phones: anchors.phones.length, emails: anchors.emails.length },
      verification_metrics: metrics,
      unpdf_quality: unpdfQuality
    };

    console.log(`[parse-call-sheet] Complete: ${correctedContacts.length} contacts, ${totalElapsedMs}ms, method=${extractionMethod}, model=${modelUsed}`);

    // Extract canonical producers (first parse only)
    let canonicalProducersUpdate: { canonical_producers?: CanonicalProducer[] } = {};
    if (!callSheet.canonical_producers) {
      const canonicalProducers = extractCanonicalProducers(correctedContacts);
      canonicalProducersUpdate = { canonical_producers: canonicalProducers };
      console.log(`[parse-call-sheet] LOCKED ${canonicalProducers.length} canonical producers`);
    }

    // Update database
    const { error: updateError } = await supabase
      .from("global_call_sheets")
      .update({
        status: "parsed",
        parsed_contacts: correctedContacts,
        contacts_extracted: correctedContacts.length,
        project_title: parseResult.project_title,
        parsed_date: parseResult.parsed_date,
        parse_timing: parseTiming,
        parse_action_log: actionLog,
        error_message: null,
        updated_at: new Date().toISOString(),
        extraction_mode: "auto",
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

    // =========================================================================
    // LL 2.0: Create/update production_instance for Active Productions leaderboard
    // =========================================================================
    const todayStr = new Date().toISOString().slice(0, 10);
    const shootStartDate = parseResult.parsed_date || todayStr;
    const canonicalProducersForContacts = canonicalProducersUpdate.canonical_producers
      ?? (callSheet.canonical_producers as CanonicalProducer[] | null)
      ?? extractCanonicalProducers(correctedContacts);
    const { error: piError } = await supabase
      .from("production_instances")
      .upsert(
        {
          global_call_sheet_id: call_sheet_id,
          production_name: parseResult.project_title || callSheet.original_file_name || "Unknown Production",
          company_name: parseResult.production_company ?? null,
          primary_contacts: canonicalProducersForContacts,
          shoot_start_date: shootStartDate,
          extracted_date: todayStr,
          verification_status: "unverified",
          metadata: {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "global_call_sheet_id" }
      );
    if (piError) {
      console.warn("[parse-call-sheet] Failed to upsert production_instance (non-fatal):", piError);
    } else {
      console.log("[parse-call-sheet] Upserted production_instance for Active Productions board");
    }

    // =========================================================================
    // PROJECT FINGERPRINT MATCHING
    // =========================================================================
    
    const fingerprintProducers = callSheet.canonical_producers 
      ? callSheet.canonical_producers as CanonicalProducer[]
      : extractCanonicalProducers(correctedContacts);
    
    const fingerprint = generateFingerprint(
      parseResult.project_title,
      fingerprintProducers,
      correctedContacts,
      parseResult.parsed_date
    );
    
    let projectId: string | null = null;
    
    if (!callSheet.youtube_video_id) {
      const { data: existingProjects } = await supabase
        .from("youtube_videos")
        .select("id, project_fingerprint, canonical_title, title, source_count, shoot_start_date, shoot_end_date")
        .not("project_fingerprint", "is", null);
      
      let bestMatch: { id: string; canonical_title: string | null; title: string | null; source_count: number; shoot_end_date: string | null } | null = null;
      let bestScore = 0;
      
      for (const project of existingProjects || []) {
        if (!project.project_fingerprint) continue;
        const score = computeFingerprintSimilarity(fingerprint, project.project_fingerprint as ProjectFingerprint);
        if (score > bestScore && score >= FINGERPRINT_MATCH_THRESHOLD) {
          bestScore = score;
          bestMatch = project;
        }
      }
      
      if (bestMatch) {
        projectId = bestMatch.id;
        await supabase.from("global_call_sheets").update({ youtube_video_id: bestMatch.id }).eq("id", call_sheet_id);
        
        const newEndDate = parseResult.parsed_date && bestMatch.shoot_end_date
          ? (parseResult.parsed_date > bestMatch.shoot_end_date ? parseResult.parsed_date : bestMatch.shoot_end_date)
          : parseResult.parsed_date || bestMatch.shoot_end_date;
        
        await supabase.from("youtube_videos").update({
          shoot_end_date: newEndDate,
          source_count: (bestMatch.source_count || 1) + 1
        }).eq("id", bestMatch.id);
        
        console.log(`[parse-call-sheet] MATCHED to project: "${bestMatch.canonical_title || bestMatch.title}" (${(bestScore * 100).toFixed(1)}%)`);
      } else {
        const { data: newProject, error: createError } = await supabase
          .from("youtube_videos")
          .insert({
            video_id: null,
            title: parseResult.project_title,
            canonical_title: parseResult.project_title,
            project_fingerprint: fingerprint,
            shoot_start_date: parseResult.parsed_date,
            shoot_end_date: parseResult.parsed_date,
            verified: false,
            source_count: 1,
            project_type: 'music_video'
          })
          .select("id")
          .single();
        
        if (!createError && newProject) {
          projectId = newProject.id;
          await supabase.from("global_call_sheets").update({ youtube_video_id: newProject.id }).eq("id", call_sheet_id);
          console.log(`[parse-call-sheet] CREATED new project: "${parseResult.project_title}"`);
        }
      }
    } else {
      projectId = callSheet.youtube_video_id;
    }

    return new Response(
      JSON.stringify({
        success: true,
        contacts_count: correctedContacts.length,
        project_title: parseResult.project_title,
        project_id: projectId,
        extraction_method: extractionMethod,
        model_used: modelUsed,
        escalated: escalated,
        anchors_found: { phones: anchors.phones.length, emails: anchors.emails.length },
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function markAsError(supabase: any, callSheetId: string, errorMessage: string) {
  await supabase
    .from("global_call_sheets")
    .update({ status: "error", error_message: errorMessage, updated_at: new Date().toISOString() })
    .eq("id", callSheetId);
}

async function extractTextFromPdf(pdfBlob: Blob): Promise<string> {
  try {
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const { text, totalPages } = await extractText(arrayBuffer, { mergePages: true });
    console.log(`[parse-call-sheet] PDF pages: ${totalPages}, raw text: ${text.length} chars`);
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
  } catch (error) {
    console.error("[parse-call-sheet] unpdf extraction failed:", error);
    return "";
  }
}

// ============================================================================
// DIRECT PDF UPLOAD AI PARSING (Change 1: full visual context, all pages)
// ============================================================================

async function parseWithDirectPdf(
  pdfBase64: string,
  anchors: Anchors,
  textHint: string,
  apiKey: string,
  model: string
): Promise<ParseResult> {
  const content: any[] = [];
  
  // Send PDF directly as a file (Gemini supports inline_data for PDFs)
  content.push({
    type: "image_url",
    image_url: { url: `data:application/pdf;base64,${pdfBase64}` }
  });
  
  content.push({
    type: "text",
    text: `Parse this call sheet PDF. The FULL document is attached — extract contacts from ALL pages.

## HIGH-CONFIDENCE ANCHORS (prefer these)
Phones: ${JSON.stringify(anchors.phones)}
Emails: ${JSON.stringify(anchors.emails)}
IG Handles: ${JSON.stringify(anchors.igHandles)}

## RULES
- PREFER phones/emails from the anchors above — these are verified by OCR
- If you see a phone/email clearly in the PDF but NOT in anchors, include it with lower confidence (0.70-0.80) and also add to unverified_candidates
- Match each anchor to the correct person by their row position in the document
- Extract contacts from ALL pages

## SUPPLEMENTAL TEXT (for name verification)
${textHint.slice(0, 30000)}`
  });

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: MULTIMODAL_SYSTEM_PROMPT },
        { role: "user", content: content }
      ],
      max_completion_tokens: 16000,
      tools: [buildContactExtractionTool()],
      tool_choice: { type: "function", function: { name: "extract_contacts" } }
    }),
  });

  return handleAIResponse(response);
}

// ============================================================================
// MULTIMODAL AI PARSING (screenshot + anchors — legacy fallback)

async function parseWithMultimodal(
  screenshots: string[],
  anchors: Anchors,
  textHint: string,
  apiKey: string,
  model: string
): Promise<ParseResult> {
  // Build multimodal content array
  const content: any[] = [];
  
  // Add screenshot images (limit to first 3 pages)
  for (const base64 of screenshots.slice(0, 3)) {
    // Determine if it's already a data URL or raw base64
    const imageUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    content.push({
      type: "image_url",
      image_url: { url: imageUrl }
    });
  }
  
  // Add instruction with anchors
  content.push({
    type: "text",
    text: `Parse this call sheet. USE THE IMAGE to see the table layout.

## HIGH-CONFIDENCE ANCHORS (prefer these)
Phones: ${JSON.stringify(anchors.phones)}
Emails: ${JSON.stringify(anchors.emails)}
IG Handles: ${JSON.stringify(anchors.igHandles)}

## RULES
- PREFER phones/emails from the anchors above — these are high-confidence
- If you see a phone/email clearly in the document but NOT in anchors, include it with lower confidence (0.70-0.80) and also add to unverified_candidates
- Match each anchor to the correct person by their row position in the document
- Extract contacts from ALL pages of the document

## SUPPLEMENTAL TEXT (for name verification)
${textHint.slice(0, 30000)}`
  });

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: MULTIMODAL_SYSTEM_PROMPT },
        { role: "user", content: content }
      ],
      max_completion_tokens: 16000,
      tools: [buildContactExtractionTool()],
      tool_choice: { type: "function", function: { name: "extract_contacts" } }
    }),
  });

  return handleAIResponse(response);
}

// ============================================================================
// TEXT-ONLY AI PARSING (fallback when no screenshot)
// ============================================================================

async function parseWithTextOnly(
  text: string,
  anchors: Anchors,
  apiKey: string,
  model: string
): Promise<ParseResult> {
  const prompt = `Parse this call sheet text. Extract ALL contacts.

## HIGH-CONFIDENCE ANCHORS (prefer these)
Phones: ${JSON.stringify(anchors.phones)}
Emails: ${JSON.stringify(anchors.emails)}
IG Handles: ${JSON.stringify(anchors.igHandles)}

## RULES
- PREFER phones/emails from the anchors above — these are high-confidence
- If you find additional phones/emails clearly present in the text, include them with lower confidence (0.70-0.80)
- Match anchors to people by proximity in the text
- If uncertain, leave the anchor unassigned

## CALL SHEET TEXT
${text.slice(0, 100000)}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: TEXT_FALLBACK_PROMPT },
        { role: "user", content: prompt }
      ],
      max_completion_tokens: 16000,
      tools: [buildContactExtractionTool()],
      tool_choice: { type: "function", function: { name: "extract_contacts" } }
    }),
  });

  return handleAIResponse(response);
}

function buildContactExtractionTool() {
  return {
    type: "function",
    function: {
      name: "extract_contacts",
      description: "Extract contacts from call sheet",
      parameters: {
        type: "object",
        properties: {
          contacts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                roles: { type: "array", items: { type: "string" } },
                departments: { type: "array", items: { type: "string" } },
                emails: { type: "array", items: { type: "string" } },
                phones: { type: "array", items: { type: "string" } },
                ig_handle: { type: "string", nullable: true },
                confidence: { type: "number" },
                needs_review: { type: "boolean" }
              },
              required: ["name", "roles", "departments", "emails", "phones", "confidence", "needs_review"]
            }
          },
          project_title: { type: "string", nullable: true },
          parsed_date: { type: "string", nullable: true },
          unassigned_emails: { type: "array", items: { type: "string" } },
          unassigned_phones: { type: "array", items: { type: "string" } },
          unverified_candidates: {
            type: "object",
            properties: {
              phones: { type: "array", items: { type: "string" } },
              emails: { type: "array", items: { type: "string" } }
            }
          }
        },
        required: ["contacts"]
      }
    }
  };
}

async function handleAIResponse(response: Response): Promise<ParseResult> {
  if (!response.ok) {
    const errorText = await response.text();
    console.error("[parse-call-sheet] AI API error:", response.status, errorText);
    if (response.status === 429) throw new Error("AI rate limit exceeded");
    if (response.status === 402) throw new Error("AI credits exhausted");
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (toolCall?.function?.arguments) {
    try {
      const parsed = JSON.parse(toolCall.function.arguments);
      console.log(`[parse-call-sheet] AI returned ${parsed.contacts?.length || 0} contacts`);
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

  // Fallback: try content
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
// GPT-5.2 FINAL CORRECTION PASS
// ============================================================================

async function correctWithGPT52(
  rawText: string,
  contacts: ParsedContact[],
  apiKey: string
): Promise<ParsedContact[]> {
  const CORRECTION_SYSTEM_PROMPT = `You are a professional call sheet data editor. You receive raw OCR text from a PDF and a structured JSON parse of that text. Your job is to correct errors in the JSON using the raw text as ground truth.

Rules:
1. Fix OCR-garbled email domains (Levenshtein distance <= 2 from gmail.com, icloud.com, yahoo.com, outlook.com, hotmail.com only). Never guess a company domain from context.
2. Reject truncated emails (ending in "..." or missing TLD).
3. Correct obvious name misspellings ONLY if the raw text explicitly contains the correct spelling.
4. Validate roles/departments against what appears in the raw text.
5. Merge duplicates ONLY if BOTH email AND phone match, or the raw text clearly identifies them as the same person.
6. Do NOT invent data. If you cannot confidently fix something, leave it unchanged.
7. Do NOT remove contacts. Only correct or merge them.
8. Preserve phone numbers exactly as provided.
9. Do NOT expand partial names or initials into full names unless the raw text explicitly contains that exact full name.
10. Never rewrite, reformat, normalize, or add country codes to phone numbers. Return them exactly as they appear in the input JSON.
11. If a contact does not appear in the raw text provided, do not modify it.`;

  const userPrompt = `## RAW EXTRACTED TEXT (ground truth)
${rawText.slice(0, 20000)}

## PARSED CONTACTS JSON (correct any errors)
${JSON.stringify(contacts, null, 2)}

Review the parsed contacts against the raw text. Fix any OCR errors, misspellings, or incorrect email domains. Return the corrected contacts array.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.2",
        messages: [
          { role: "system", content: CORRECTION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        max_completion_tokens: 16000,
        tools: [{
          type: "function",
          function: {
            name: "return_corrected_contacts",
            description: "Return the corrected contacts array",
            parameters: {
              type: "object",
              properties: {
                contacts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      roles: { type: "array", items: { type: "string" } },
                      departments: { type: "array", items: { type: "string" } },
                      emails: { type: "array", items: { type: "string" } },
                      phones: { type: "array", items: { type: "string" } },
                      ig_handle: { type: "string", nullable: true },
                      confidence: { type: "number" },
                      needs_review: { type: "boolean" }
                    },
                    required: ["name", "roles", "departments", "emails", "phones", "confidence", "needs_review"]
                  }
                }
              },
              required: ["contacts"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "return_corrected_contacts" } }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[parse-call-sheet] GPT-5.2 correction failed (${response.status}): ${errText.slice(0, 200)}`);
      return contacts; // Fallback to original
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.warn("[parse-call-sheet] GPT-5.2 returned no tool call, falling back to original");
      return contacts;
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const corrected: ParsedContact[] = parsed.contacts || [];

    // Post-response validation: drop zombie contacts
    const validated = corrected.filter(c => {
      const hasName = c.name && c.name.trim().length > 0;
      const hasContact = (c.emails && c.emails.length > 0) || (c.phones && c.phones.length > 0);
      // CHANGED: No longer require roles. A contact with name + phone/email is valid.
      return hasName && hasContact;
    });

    const dropped = corrected.length - validated.length;
    if (dropped > 0) {
      console.warn(`[parse-call-sheet] GPT-5.2 correction: dropped ${dropped} zombie contacts`);
    }

    console.log(`[parse-call-sheet] GPT-5.2 correction complete: ${validated.length} contacts returned (input: ${contacts.length})`);
    return validated;

  } catch (err) {
    console.warn(`[parse-call-sheet] GPT-5.2 correction error, falling back to original: ${err instanceof Error ? err.message : 'unknown'}`);
    return contacts; // Fallback to original
  }
}

// ============================================================================
// VERIFICATION + REPAIR (deterministic anchor enforcement)
// ============================================================================

interface VerificationMetrics {
  totalContacts: number;
  assignedPhones: number;
  assignedEmails: number;
  unassignedPhones: number;
  unassignedEmails: number;
  unassignedRatio: number;
  unknownNameRatio: number;
}

function verifyAndRepairContacts(
  parseResult: ParseResult,
  anchors: Anchors
): { verified: ParsedContact[]; metrics: VerificationMetrics } {
  const anchorPhoneSet = new Set(anchors.phones);
  const anchorEmailSet = new Set(anchors.emails.map(e => e.toLowerCase()));
  
  const usedPhones = new Set<string>();
  const usedEmails = new Set<string>();
  let unknownNameCount = 0;
  
  // First pass: validate contacts and track used anchors
  const verifiedContacts = parseResult.contacts.map(contact => {
    // Validate phones against anchors
    const validPhones = (contact.phones || [])
      .map(p => p.replace(/\D/g, '').slice(0, 10))
      .filter(p => p.length === 10 && anchorPhoneSet.has(p) && !usedPhones.has(p));
    
    validPhones.forEach(p => usedPhones.add(p));
    
    // Validate emails against anchors
    const validEmails = (contact.emails || [])
      .map(e => e.toLowerCase().trim())
      .filter(e => anchorEmailSet.has(e) && !usedEmails.has(e));
    
    validEmails.forEach(e => usedEmails.add(e));
    
    // Track unknown names
    const isUnknownName = !contact.name || 
      contact.name.toLowerCase().includes('unknown') || 
      contact.name.toLowerCase().includes('tbd');
    if (isUnknownName) unknownNameCount++;
    
    return {
      ...contact,
      phones: validPhones,
      emails: validEmails,
      needs_review: contact.needs_review || validPhones.length === 0 && validEmails.length === 0
    };
  });
  
  // Calculate unassigned anchors
  const unassignedPhones = anchors.phones.filter(p => !usedPhones.has(p));
  const unassignedEmails = anchors.emails.filter(e => !usedEmails.has(e.toLowerCase()));
  
  const totalAnchors = anchors.phones.length + anchors.emails.length;
  const unassignedRatio = totalAnchors > 0 
    ? (unassignedPhones.length + unassignedEmails.length) / totalAnchors 
    : 0;
  
  const unknownNameRatio = verifiedContacts.length > 0 
    ? unknownNameCount / verifiedContacts.length 
    : 0;
  
  // Repair: create stub contacts for unassigned anchors (high recall)
  const stubContacts: ParsedContact[] = [];
  
  for (const phone of unassignedPhones) {
    stubContacts.push({
      name: "Unknown - Review Required",
      roles: ["Unknown"],
      departments: ["Miscellaneous"],
      emails: [],
      phones: [phone],
      ig_handle: null,
      confidence: 0.50,
      needs_review: true
    });
  }
  
  for (const email of unassignedEmails) {
    // Check if this email is already on a stub
    const alreadyOnStub = stubContacts.some(s => s.emails.includes(email));
    if (!alreadyOnStub) {
      stubContacts.push({
        name: "Unknown - Review Required",
        roles: ["Unknown"],
        departments: ["Miscellaneous"],
        emails: [email],
        phones: [],
        ig_handle: null,
        confidence: 0.50,
        needs_review: true
      });
    }
  }
  
  return {
    verified: [...verifiedContacts, ...stubContacts],
    metrics: {
      totalContacts: verifiedContacts.length,
      assignedPhones: usedPhones.size,
      assignedEmails: usedEmails.size,
      unassignedPhones: unassignedPhones.length,
      unassignedEmails: unassignedEmails.length,
      unassignedRatio,
      unknownNameRatio
    }
  };
}

// ============================================================================
// ANCHOR SCORING (prefer, don't enforce — Change 2)
// ============================================================================

function scoreByAnchorMatch(contacts: ParsedContact[], anchors: Anchors): ParsedContact[] {
  const anchorPhoneSet = new Set(anchors.phones);
  const anchorEmailSet = new Set(anchors.emails.map(e => e.toLowerCase()));
  
  return contacts.map(contact => {
    const phones = (contact.phones || []).map(p => {
      const normalized = p.replace(/\D/g, '').slice(0, 10);
      return normalized.length === 10 ? normalized : null;
    }).filter((p): p is string => p !== null);
    
    const emails = (contact.emails || []).map(e => e.toLowerCase().trim()).filter(e => e.includes('@'));
    
    // Check if contact data matches anchors
    const phonesInAnchors = phones.filter(p => anchorPhoneSet.has(p));
    const phonesNotInAnchors = phones.filter(p => !anchorPhoneSet.has(p));
    const emailsInAnchors = emails.filter(e => anchorEmailSet.has(e));
    const emailsNotInAnchors = emails.filter(e => !anchorEmailSet.has(e));
    
    // Lower confidence for non-anchor data
    let confidence = contact.confidence || 0.85;
    if (phonesNotInAnchors.length > 0 || emailsNotInAnchors.length > 0) {
      confidence = Math.min(confidence, 0.75);
    }
    
    return {
      ...contact,
      phones: [...phonesInAnchors, ...phonesNotInAnchors], // Keep all, anchors first
      emails: [...emailsInAnchors, ...emailsNotInAnchors],
      confidence,
      needs_review: confidence < 0.80 || contact.needs_review === true
    };
  });
}

// ============================================================================
// POST-PROCESSING: Phone Sanitization
// ============================================================================

function sanitizePhones(contacts: ParsedContact[]): ParsedContact[] {
  const seenPhones = new Set<string>();
  
  return contacts.map(contact => {
    const cleanedPhones = (contact.phones || [])
      .filter(phone => {
        if (!phone) return false;
        if (phone.length > 100) return false;
        if (/[{}\[\]:"]/.test(phone)) return false;
        return true;
      })
      .map(phone => {
        const digits = phone.replace(/\D/g, '');
        if (digits.length >= 10) return digits.slice(0, 10);
        return null;
      })
      .filter((phone): phone is string => {
        if (!phone) return false;
        if (seenPhones.has(phone)) return false;
        seenPhones.add(phone);
        return true;
      });

    if ((contact.phones || []).length > 5) {
      return { ...contact, phones: [], needs_review: true };
    }

    return { ...contact, phones: cleanedPhones.slice(0, 3) };
  });
}

// ============================================================================
// POST-PROCESSING: Validate and Normalize Contacts
// ============================================================================

const CANONICAL_DEPARTMENTS = [
  "Agency/Production", "Direction", "Camera", "Sound", "Grip & Electric",
  "Art", "Hair/Makeup/Grooming", "Styling/Wardrobe", "Casting",
  "Miscellaneous", "Post-Production", "Vendors/Services"
];

function validateAndNormalizeContacts(contacts: ParsedContact[]): ParsedContact[] {
  return contacts
    .filter(contact => {
      if (contact.name && contact.name.includes('@')) return false;
      if (!contact.name || contact.name.trim().length < 2) return false;
      return true;
    })
    .map(contact => {
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
        
        if (CANONICAL_DEPARTMENTS.includes(dept)) return dept;
        return "Miscellaneous";
      });

      const validEmails = (contact.emails || [])
        .filter(email => {
          if (!email) return false;
          if (email.endsWith('...') || email.endsWith('\u2026')) return false;
          return email.includes('@') && email.includes('.') && !email.startsWith('@');
        })
        .map(email => {
          const { corrected } = correctEmailDomain(email);
          return corrected;
        });

      const confidence = contact.confidence || 0.75;
      const needsReview = confidence < 0.80 || contact.needs_review === true;

      return {
        ...contact,
        departments: [...new Set(normalizedDepartments)],
        emails: validEmails,
        confidence,
        needs_review: needsReview
      };
    });
}
