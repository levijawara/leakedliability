// Consolidate contacts by matching names/identifiers

import type { CrewContact, ParsedContact } from "@/types/callSheet";

/**
 * Normalize a name for comparison (lowercase, trim, remove extra spaces)
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

/**
 * Check if two names are likely the same person
 */
export function namesMatch(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  if (n1 === n2) return true;
  
  if (n1.includes(n2) || n2.includes(n1)) {
    const shorter = n1.length < n2.length ? n1 : n2;
    const longer = n1.length >= n2.length ? n1 : n2;
    if (shorter.length / longer.length >= 0.6) return true;
  }
  
  return false;
}

/**
 * Merge arrays, removing duplicates
 */
function mergeArrays(arr1: string[] | null, arr2: string[] | null): string[] | null {
  const all = [...(arr1 || []), ...(arr2 || [])];
  if (all.length === 0) return null;
  return [...new Set(all)];
}

/**
 * Merge two contacts, preferring non-null values from the first
 */
export function mergeContacts(
  primary: CrewContact,
  secondary: CrewContact
): CrewContact {
  return {
    ...primary,
    emails: mergeArrays(primary.emails, secondary.emails),
    phones: mergeArrays(primary.phones, secondary.phones),
    roles: mergeArrays(primary.roles, secondary.roles),
    departments: mergeArrays(primary.departments, secondary.departments),
    instagram_handle: primary.instagram_handle || secondary.instagram_handle,
    notes: primary.notes || secondary.notes,
    source_files: mergeArrays(primary.source_files, secondary.source_files),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Consolidate a list of contacts by name
 */
export function consolidateContactsByName(
  contacts: CrewContact[]
): CrewContact[] {
  const consolidated: Map<string, CrewContact> = new Map();
  
  for (const contact of contacts) {
    const normalizedName = normalizeName(contact.name);
    
    let matched = false;
    for (const [key, existing] of consolidated.entries()) {
      if (namesMatch(contact.name, existing.name)) {
        consolidated.set(key, mergeContacts(existing, contact));
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      consolidated.set(normalizedName, contact);
    }
  }
  
  return Array.from(consolidated.values());
}

/**
 * Convert parsed contacts to CrewContact format
 */
export function parsedToCrewContact(
  parsed: ParsedContact,
  userId: string,
  callSheetId: string,
  filename: string
): Omit<CrewContact, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    name: parsed.name,
    emails: parsed.email ? [parsed.email] : null,
    phones: parsed.phone ? [parsed.phone] : null,
    roles: parsed.role ? [parsed.role] : null,
    departments: parsed.department ? [parsed.department] : null,
    instagram_handle: parsed.instagram_handle || null,
    notes: null,
    source_files: [filename],
    call_sheet_id: callSheetId,
    confidence: parsed.confidence || null,
    hidden_emails: null,
    hidden_phones: null,
    hidden_roles: null,
    hidden_departments: null,
    hidden_ig_handle: null,
  };
}
