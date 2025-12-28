/**
 * Shared Call Sheet Parser Module
 * Unified parsing logic for both parse-queue and parse-call-sheet
 */

// Standard film departments for classification
export const STANDARD_DEPARTMENTS = [
  'Production', 'Camera', 'Electric', 'Grip', 'Sound', 'Art', 'Set Dec',
  'Props', 'Wardrobe', 'Hair', 'Makeup', 'Locations', 'Transportation',
  'Catering', 'Craft Service', 'Accounting', 'Post Production', 'VFX',
  'Stunts', 'SFX', 'Script', 'AD', 'Talent', 'Background', 'Extras',
  'Medical', 'Security', 'Publicity', 'Legal', 'Insurance', 'Other'
] as const;

// Role-to-department pattern matching
export const ROLE_PATTERNS: Array<{ pattern: RegExp; department: string }> = [
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

// Regex patterns for extraction
export const PHONE_PATTERNS = [
  /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
];

export const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
export const IG_PATTERN = /@([a-zA-Z0-9._]{1,30})/g;

// Types
export interface ParsedContact {
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

export interface NormalizedContact {
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
  confidence: number;
  needs_review: boolean;
}

export interface ParseResult {
  contacts: NormalizedContact[];
  raw_text?: string;
  parsing_method: string;
  pages_processed: number;
  errors: string[];
}

// JSON schema for structured AI output
export const CONTACT_JSON_SCHEMA = {
  name: "crew_contacts",
  strict: true,
  schema: {
    type: "object",
    properties: {
      contacts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Full name of the crew member" },
            roles: { 
              type: "array", 
              items: { type: "string" },
              description: "Job titles/positions (e.g., ['Director of Photography', 'Camera Operator'])"
            },
            departments: { 
              type: "array", 
              items: { type: "string" },
              description: "Film departments (e.g., ['Camera', 'Electric'])"
            },
            phones: { 
              type: "array", 
              items: { type: "string" },
              description: "Phone numbers"
            },
            emails: { 
              type: "array", 
              items: { type: "string" },
              description: "Email addresses"
            },
            ig_handle: { 
              type: ["string", "null"],
              description: "Instagram handle without @ symbol"
            },
            confidence: { 
              type: "number",
              description: "Confidence score 0.0-1.0 based on data completeness"
            }
          },
          required: ["name", "roles", "departments", "phones", "emails", "ig_handle", "confidence"],
          additionalProperties: false
        }
      },
      unassigned_emails: {
        type: "array",
        items: { type: "string" },
        description: "Emails found but not matched to a person"
      },
      unassigned_phones: {
        type: "array",
        items: { type: "string" },
        description: "Phone numbers found but not matched to a person"
      },
      shoot_date: {
        type: ["string", "null"],
        description: "Shoot date if found (ISO format)"
      },
      project_title: {
        type: ["string", "null"],
        description: "Project/production title if found"
      }
    },
    required: ["contacts", "unassigned_emails", "unassigned_phones", "shoot_date", "project_title"],
    additionalProperties: false
  }
};

// System prompt for AI parsing
export const SYSTEM_PROMPT = `You are a professional film industry call sheet parser. Your task is to extract crew contact information from call sheets.

DEPARTMENTS (use exactly these names):
${STANDARD_DEPARTMENTS.join(', ')}

EXTRACTION RULES:
1. Extract every person with at least a name
2. Match roles to the correct department using industry knowledge
3. Format phone numbers consistently (digits only, no formatting)
4. Lowercase all emails
5. Remove @ from Instagram handles
6. Set confidence based on data completeness:
   - 0.95: Name + role + phone + email
   - 0.85: Name + role + (phone OR email)
   - 0.70: Name + role only
   - 0.50: Name only

COMMON ABBREVIATIONS:
- DP/DOP = Director of Photography (Camera)
- UPM = Unit Production Manager (Production)
- 1st AC = First Assistant Camera (Camera)
- G&E = Grip and Electric
- HMU = Hair, Makeup, Wardrobe
- AD = Assistant Director

Return structured JSON with all contacts found.`;

/**
 * Detect department from role text
 */
export function detectDepartment(role: string): string {
  for (const { pattern, department } of ROLE_PATTERNS) {
    if (pattern.test(role)) {
      return department;
    }
  }
  return 'Other';
}

/**
 * Normalize contact to consistent schema
 */
export function normalizeContact(raw: ParsedContact): NormalizedContact {
  const roles = Array.isArray(raw.roles) ? raw.roles : (raw.role ? [raw.role] : []);
  const departments = Array.isArray(raw.departments) ? raw.departments : (raw.department ? [raw.department] : []);
  const phones = Array.isArray(raw.phones) ? raw.phones : (raw.phone ? [raw.phone] : []);
  const emails = Array.isArray(raw.emails) ? raw.emails : (raw.email ? [raw.email] : []);
  const igHandle = raw.ig_handle || raw.instagram_handle || null;
  
  // Auto-detect department if missing
  const finalDepartments = departments.length > 0 
    ? departments.map(d => String(d).trim()).filter(Boolean)
    : roles.length > 0 
      ? [detectDepartment(roles[0])]
      : [];

  const confidence = typeof raw.confidence === "number" ? raw.confidence : 0.5;

  return {
    name: String(raw.name || "Unknown").trim(),
    roles: roles.map(r => String(r).trim()).filter(Boolean),
    departments: finalDepartments,
    phones: phones.map(p => String(p).replace(/\D/g, '')).filter(p => p.length >= 10),
    emails: emails.map(e => String(e).trim().toLowerCase()).filter(Boolean),
    ig_handle: igHandle ? String(igHandle).replace(/^@/, "").trim() : null,
    confidence,
    needs_review: confidence < 0.7 || roles.length === 0 || finalDepartments.includes('Other'),
  };
}

/**
 * Extract phones from text using regex
 */
export function extractPhones(text: string): string[] {
  const phones: string[] = [];
  for (const pattern of PHONE_PATTERNS) {
    const regex = new RegExp(pattern.source, 'g');
    const matches = text.match(regex);
    if (matches) {
      phones.push(...matches.map(p => p.replace(/\D/g, '')));
    }
  }
  return [...new Set(phones)].filter(p => p.length >= 10);
}

/**
 * Extract emails from text using regex
 */
export function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_PATTERN);
  return matches ? [...new Set(matches.map(e => e.toLowerCase()))] : [];
}

/**
 * Extract IG handles from text using regex
 */
export function extractIgHandles(text: string): string[] {
  const matches: string[] = [];
  let match;
  const regex = new RegExp(IG_PATTERN.source, 'gi');
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return [...new Set(matches)];
}

/**
 * Call Lovable AI Gateway with JSON schema
 */
export async function callAIWithSchema(
  content: string,
  model: string = "openai/gpt-5-mini"
): Promise<{ contacts: ParsedContact[]; unassignedEmails: string[]; unassignedPhones: string[] }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  console.log(`[callSheetParser] Calling AI (${model}) with ${content.length} chars...`);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Parse this call sheet and extract all crew contacts:\n\n${content.substring(0, 15000)}` }
      ],
      response_format: {
        type: "json_schema",
        json_schema: CONTACT_JSON_SCHEMA
      },
      max_completion_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[callSheetParser] AI error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded - Please try again later");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted - Please add credits");
    }
    throw new Error(`AI request failed: ${response.status}`);
  }

  const data = await response.json();
  const aiContent = data.choices?.[0]?.message?.content || "{}";
  
  console.log("[callSheetParser] AI response received, parsing JSON...");

  try {
    const parsed = JSON.parse(aiContent);
    console.log(`[callSheetParser] Parsed ${parsed.contacts?.length || 0} contacts`);
    
    return {
      contacts: parsed.contacts || [],
      unassignedEmails: parsed.unassigned_emails || [],
      unassignedPhones: parsed.unassigned_phones || [],
    };
  } catch (e) {
    console.error("[callSheetParser] Failed to parse AI response:", e);
    throw new Error("Failed to parse AI response as JSON");
  }
}

/**
 * Cleanup pass using cheaper model
 */
export async function cleanupContacts(contacts: NormalizedContact[]): Promise<NormalizedContact[]> {
  if (contacts.length === 0) return contacts;

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return contacts;

  console.log("[callSheetParser] Running cleanup pass...");

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-nano",
        messages: [
          { 
            role: "system", 
            content: `You are a data cleaning assistant. Fix any obvious errors in these film crew contacts:
- Normalize names (proper capitalization)
- Fix truncated roles
- Correct department assignments
- Flag low confidence entries (set needs_review: true)
Return the cleaned JSON array only.` 
          },
          { role: "user", content: JSON.stringify(contacts) }
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      console.warn("[callSheetParser] Cleanup failed, using original");
      return contacts;
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "[]";
    
    const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return contacts;

    const cleaned = JSON.parse(jsonMatch[0]);
    console.log(`[callSheetParser] Cleanup complete, ${cleaned.length} contacts`);
    return cleaned;
  } catch (error) {
    console.warn("[callSheetParser] Cleanup pass failed:", error);
    return contacts;
  }
}

/**
 * Fallback regex-based parsing
 */
export function parseWithRegex(rawText: string): NormalizedContact[] {
  console.log("[callSheetParser] Using regex fallback parser...");
  
  const contacts: NormalizedContact[] = [];
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
          roles: [role.trim()],
          departments: [detectDepartment(role)],
          phones,
          emails,
          ig_handle: igs[0] || null,
          confidence: 0.6,
          needs_review: true,
        });
        break;
      }
    }
  }

  console.log(`[callSheetParser] Regex fallback found ${contacts.length} contacts`);
  return contacts;
}

/**
 * Main parse function - unified logic for both parsers
 */
export async function parseCallSheetText(
  rawText: string,
  options: { useAI?: boolean; includeCleanup?: boolean } = {}
): Promise<ParseResult> {
  const { useAI = true, includeCleanup = true } = options;
  const errors: string[] = [];

  if (!rawText || rawText.length < 50) {
    errors.push('Insufficient text extracted');
    return {
      contacts: [],
      raw_text: rawText,
      parsing_method: 'failed',
      pages_processed: 0,
      errors,
    };
  }

  let contacts: NormalizedContact[] = [];
  let parsingMethod = 'unknown';

  // Try AI parsing first
  if (useAI) {
    try {
      const aiResult = await callAIWithSchema(rawText);
      contacts = aiResult.contacts.map(normalizeContact);
      parsingMethod = 'ai_structured';

      if (contacts.length > 0 && includeCleanup) {
        contacts = await cleanupContacts(contacts);
        parsingMethod = 'ai_with_cleanup';
      }
    } catch (error: unknown) {
      console.warn("[callSheetParser] AI parsing failed, falling back to regex:", error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`AI parsing failed: ${message}`);
    }
  }

  // Fallback to regex if AI fails or is disabled
  if (contacts.length === 0) {
    contacts = parseWithRegex(rawText);
    parsingMethod = 'regex_fallback';
  }

  console.log(`[callSheetParser] Final result: ${contacts.length} contacts via ${parsingMethod}`);

  return {
    contacts,
    raw_text: rawText,
    parsing_method: parsingMethod,
    pages_processed: 1, // Will be set by caller if PDF
    errors,
  };
}
