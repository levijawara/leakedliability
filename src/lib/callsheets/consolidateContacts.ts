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
  
  // Check if one contains the other (e.g., "John Smith" vs "John")
  if (n1.includes(n2) || n2.includes(n1)) {
    const shorter = n1.length < n2.length ? n1 : n2;
    const longer = n1.length >= n2.length ? n1 : n2;
    // Only match if shorter is at least 60% of longer
    if (shorter.length / longer.length >= 0.6) return true;
  }
  
  return false;
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
    email: primary.email || secondary.email,
    phone: primary.phone || secondary.phone,
    role: primary.role || secondary.role,
    department: primary.department || secondary.department,
    instagram_handle: primary.instagram_handle || secondary.instagram_handle,
    notes: primary.notes || secondary.notes,
    departments: mergeDepartments(primary.departments, secondary.departments),
    source_files: mergeSourceFiles(primary.source_files, secondary.source_files),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Merge department arrays, removing duplicates
 */
function mergeDepartments(
  deps1: string[] | null,
  deps2: string[] | null
): string[] | null {
  const all = [...(deps1 || []), ...(deps2 || [])];
  if (all.length === 0) return null;
  return [...new Set(all)];
}

/**
 * Merge source file arrays, removing duplicates
 */
function mergeSourceFiles(
  files1: string[] | null,
  files2: string[] | null
): string[] | null {
  const all = [...(files1 || []), ...(files2 || [])];
  if (all.length === 0) return null;
  return [...new Set(all)];
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
    
    // Find existing match
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
    email: parsed.email || null,
    phone: parsed.phone || null,
    role: parsed.role || null,
    department: parsed.department || null,
    departments: parsed.department ? [parsed.department] : null,
    instagram_handle: parsed.instagram_handle || null,
    notes: null,
    source_files: [filename],
    call_sheet_id: callSheetId,
  };
}
