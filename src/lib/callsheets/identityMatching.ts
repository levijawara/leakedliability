// Identity matching utilities for names, emails, phone numbers

import { normalizeName } from "./consolidateContacts";
import { normalizePhone, normalizeEmail, stringSimilarity } from "./duplicateFinder";

export interface IdentityMatch {
  type: 'name' | 'email' | 'phone' | 'instagram';
  value1: string;
  value2: string;
  confidence: number;
  isExactMatch: boolean;
}

/**
 * Check if two names likely refer to the same person
 */
export function matchNames(name1: string, name2: string): IdentityMatch | null {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  if (!n1 || !n2) return null;
  
  // Exact match
  if (n1 === n2) {
    return {
      type: 'name',
      value1: name1,
      value2: name2,
      confidence: 1.0,
      isExactMatch: true,
    };
  }
  
  // Check similarity
  const similarity = stringSimilarity(n1, n2);
  if (similarity >= 0.7) {
    return {
      type: 'name',
      value1: name1,
      value2: name2,
      confidence: similarity,
      isExactMatch: false,
    };
  }
  
  // Check if one is contained in the other (first/last name scenarios)
  const parts1 = n1.split(' ');
  const parts2 = n2.split(' ');
  
  // Check for shared surname
  if (parts1.length >= 2 && parts2.length >= 2) {
    const lastName1 = parts1[parts1.length - 1];
    const lastName2 = parts2[parts2.length - 1];
    const firstName1 = parts1[0];
    const firstName2 = parts2[0];
    
    // Same last name + similar first name
    if (lastName1 === lastName2 && stringSimilarity(firstName1, firstName2) >= 0.5) {
      return {
        type: 'name',
        value1: name1,
        value2: name2,
        confidence: 0.8,
        isExactMatch: false,
      };
    }
  }
  
  return null;
}

/**
 * Check if two emails match
 */
export function matchEmails(email1: string | null, email2: string | null): IdentityMatch | null {
  if (!email1 || !email2) return null;
  
  const e1 = normalizeEmail(email1);
  const e2 = normalizeEmail(email2);
  
  if (e1 === e2) {
    return {
      type: 'email',
      value1: email1,
      value2: email2,
      confidence: 1.0,
      isExactMatch: true,
    };
  }
  
  // Check for similar local parts (before @)
  const local1 = e1.split('@')[0];
  const local2 = e2.split('@')[0];
  
  if (stringSimilarity(local1, local2) >= 0.8) {
    return {
      type: 'email',
      value1: email1,
      value2: email2,
      confidence: 0.6,
      isExactMatch: false,
    };
  }
  
  return null;
}

/**
 * Check if two phone numbers match
 */
export function matchPhones(phone1: string | null, phone2: string | null): IdentityMatch | null {
  if (!phone1 || !phone2) return null;
  
  const p1 = normalizePhone(phone1);
  const p2 = normalizePhone(phone2);
  
  if (p1.length < 7 || p2.length < 7) return null;
  
  if (p1 === p2) {
    return {
      type: 'phone',
      value1: phone1,
      value2: phone2,
      confidence: 1.0,
      isExactMatch: true,
    };
  }
  
  // Check if one ends with the other (ignoring area code)
  const shorter = p1.length < p2.length ? p1 : p2;
  const longer = p1.length >= p2.length ? p1 : p2;
  
  if (longer.endsWith(shorter) && shorter.length >= 7) {
    return {
      type: 'phone',
      value1: phone1,
      value2: phone2,
      confidence: 0.9,
      isExactMatch: false,
    };
  }
  
  return null;
}

/**
 * Check if two Instagram handles match
 */
export function matchInstagram(
  ig1: string | null,
  ig2: string | null
): IdentityMatch | null {
  if (!ig1 || !ig2) return null;
  
  const handle1 = ig1.toLowerCase().replace(/^@/, '').trim();
  const handle2 = ig2.toLowerCase().replace(/^@/, '').trim();
  
  if (!handle1 || !handle2) return null;
  
  if (handle1 === handle2) {
    return {
      type: 'instagram',
      value1: ig1,
      value2: ig2,
      confidence: 1.0,
      isExactMatch: true,
    };
  }
  
  return null;
}

/**
 * Find all identity matches between two contacts
 */
export function findIdentityMatches(
  contact1: { name: string; email?: string | null; phone?: string | null; instagram_handle?: string | null },
  contact2: { name: string; email?: string | null; phone?: string | null; instagram_handle?: string | null }
): IdentityMatch[] {
  const matches: IdentityMatch[] = [];
  
  const nameMatch = matchNames(contact1.name, contact2.name);
  if (nameMatch) matches.push(nameMatch);
  
  const emailMatch = matchEmails(contact1.email, contact2.email);
  if (emailMatch) matches.push(emailMatch);
  
  const phoneMatch = matchPhones(contact1.phone, contact2.phone);
  if (phoneMatch) matches.push(phoneMatch);
  
  const igMatch = matchInstagram(contact1.instagram_handle, contact2.instagram_handle);
  if (igMatch) matches.push(igMatch);
  
  return matches;
}

/**
 * Calculate overall identity confidence between two contacts
 */
export function calculateIdentityConfidence(matches: IdentityMatch[]): number {
  if (matches.length === 0) return 0;
  
  // Weight different match types
  const weights: Record<IdentityMatch['type'], number> = {
    email: 0.35,
    phone: 0.30,
    instagram: 0.25,
    name: 0.20,
  };
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const match of matches) {
    const weight = weights[match.type];
    totalWeight += weight;
    weightedSum += match.confidence * weight;
  }
  
  // Bonus for multiple matches
  const multiMatchBonus = Math.min(0.2, (matches.length - 1) * 0.1);
  
  return Math.min(1.0, weightedSum / totalWeight + multiMatchBonus);
}

/**
 * Format a phone number for display
 */
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone;
}

/**
 * Extract email domain
 */
export function getEmailDomain(email: string): string {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : '';
}
