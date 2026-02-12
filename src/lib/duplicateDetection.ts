// Shared duplicate detection utilities
// Used by ParseSummaryPanel and DuplicateMergeModal

export interface DuplicateMatch {
  existingId: string;
  existingName: string;
  matchedFields: ('name' | 'role' | 'phone' | 'email' | 'ig')[];
  matchScore: number;
}

export interface ContactForMatching {
  id: string;
  name: string;
  roles: string[] | null;
  phones: string[] | null;
  emails: string[] | null;
  ig_handle: string | null;
}

export interface DuplicateGroup {
  primary: ContactForMatching;
  duplicates: Array<{
    contact: ContactForMatching;
    matchedFields: ('name' | 'role' | 'phone' | 'email' | 'ig')[];
  }>;
}

// Normalize phone number for matching (digits only)
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Normalize email for matching (lowercase, trimmed)
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Fuzzy name matching
export function fuzzyNameMatch(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  
  // Exact match (case-insensitive)
  if (n1 === n2) return true;
  
  // Split into parts
  const parts1 = n1.split(/\s+/);
  const parts2 = n2.split(/\s+/);
  
  // Single word names: check if one is prefix of other
  if (parts1.length < 2 || parts2.length < 2) {
    return n1.startsWith(n2) || n2.startsWith(n1);
  }
  
  // Compare last names (must match exactly)
  const last1 = parts1[parts1.length - 1];
  const last2 = parts2[parts2.length - 1];
  if (last1 !== last2) return false;
  
  // Compare first names (allow prefix matching: Josh ↔ Joshua)
  const first1 = parts1[0];
  const first2 = parts2[0];
  return first1.startsWith(first2) || first2.startsWith(first1);
}

// Check if two contacts are potential duplicates (2-of-5 matching)
export function areContactsDuplicates(
  contact1: ContactForMatching,
  contact2: ContactForMatching
): { isDuplicate: boolean; matchedFields: ('name' | 'role' | 'phone' | 'email' | 'ig')[] } {
  const matchedFields: ('name' | 'role' | 'phone' | 'email' | 'ig')[] = [];
  let hasPhoneOrEmailMatch = false;
  
  // Pre-normalize arrays
  const phones1 = (contact1.phones || []).map(normalizePhone);
  const phones2 = (contact2.phones || []).map(normalizePhone);
  const emails1 = (contact1.emails || []).map(normalizeEmail);
  const emails2 = (contact2.emails || []).map(normalizeEmail);
  
  // Field 1: Name (fuzzy OR exact match)
  const exactNameMatch = contact1.name.toLowerCase().trim() === contact2.name.toLowerCase().trim();
  if (fuzzyNameMatch(contact1.name, contact2.name) || exactNameMatch) {
    matchedFields.push('name');
  }
  
  // Field 2: Role (any overlap)
  const roles1 = (contact1.roles || []).map(r => r.toLowerCase());
  const roles2 = (contact2.roles || []).map(r => r.toLowerCase());
  if (roles1.some(r => roles2.includes(r))) {
    matchedFields.push('role');
  }
  
  // Field 3: Phone (exact match, normalized)
  if (phones1.some(p => p && phones2.includes(p))) {
    matchedFields.push('phone');
    hasPhoneOrEmailMatch = true;
  }
  
  // Field 4: Email (case-insensitive)
  if (emails1.some(e => e && emails2.includes(e))) {
    matchedFields.push('email');
    hasPhoneOrEmailMatch = true;
  }
  
  // Field 5: IG Handle (exact match, case-insensitive)
  const ig1 = contact1.ig_handle?.toLowerCase().replace('@', '');
  const ig2 = contact2.ig_handle?.toLowerCase().replace('@', '');
  if (ig1 && ig2 && ig1 === ig2) {
    matchedFields.push('ig');
    hasPhoneOrEmailMatch = true;
  }
  
  // Require 2+ matched fields
  if (matchedFields.length < 2) {
    return { isDuplicate: false, matchedFields: [] };
  }
  
  // Single-word name protection: require phone/email match
  const isSingleWordName = contact1.name.trim().split(/\s+/).length === 1 ||
                           contact2.name.trim().split(/\s+/).length === 1;
  if (isSingleWordName && !hasPhoneOrEmailMatch) {
    return { isDuplicate: false, matchedFields: [] };
  }
  
  return { isDuplicate: true, matchedFields };
}

// Find all duplicate groups in a list of contacts
export function findDuplicateGroups(contacts: ContactForMatching[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const processedIds = new Set<string>();
  
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    
    // Skip if already in a group
    if (processedIds.has(contact.id)) continue;
    
    const duplicates: DuplicateGroup['duplicates'] = [];
    
    for (let j = i + 1; j < contacts.length; j++) {
      const other = contacts[j];
      
      // Skip if already in a group
      if (processedIds.has(other.id)) continue;
      
      const { isDuplicate, matchedFields } = areContactsDuplicates(contact, other);
      
      if (isDuplicate) {
        duplicates.push({ contact: other, matchedFields });
        processedIds.add(other.id);
      }
    }
    
    // Only create a group if duplicates were found
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

// Merge contact data (union of arrays, deduplicated)
export function mergeContactData<T extends ContactForMatching>(
  primary: T,
  duplicates: ContactForMatching[]
): {
  phones: string[];
  emails: string[];
  roles: string[];
  departments: string[];
  ig_handle: string | null;
  source_files: string[];
} {
  const allPhones = new Set<string>();
  const allEmails = new Set<string>();
  const allRoles = new Set<string>();
  const allDepartments = new Set<string>();
  const allSourceFiles = new Set<string>();
  let igHandle = primary.ig_handle;
  
  // Add primary contact data
  (primary.phones || []).forEach(p => allPhones.add(p));
  (primary.emails || []).forEach(e => allEmails.add(e));
  (primary.roles || []).forEach(r => allRoles.add(r));
  if ('departments' in primary) {
    ((primary as any).departments || []).forEach((d: string) => allDepartments.add(d));
  }
  if ('source_files' in primary) {
    ((primary as any).source_files || []).forEach((s: string) => allSourceFiles.add(s));
  }
  
  // Add duplicate contact data
  for (const dup of duplicates) {
    (dup.phones || []).forEach(p => allPhones.add(p));
    (dup.emails || []).forEach(e => allEmails.add(e));
    (dup.roles || []).forEach(r => allRoles.add(r));
    if ('departments' in dup) {
      ((dup as any).departments || []).forEach((d: string) => allDepartments.add(d));
    }
    if ('source_files' in dup) {
      ((dup as any).source_files || []).forEach((s: string) => allSourceFiles.add(s));
    }
    if (!igHandle && dup.ig_handle) {
      igHandle = dup.ig_handle;
    }
  }
  
  return {
    phones: Array.from(allPhones),
    emails: Array.from(allEmails),
    roles: Array.from(allRoles),
    departments: Array.from(allDepartments),
    ig_handle: igHandle,
    source_files: Array.from(allSourceFiles)
  };
}
