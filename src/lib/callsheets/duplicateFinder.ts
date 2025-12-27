// Find duplicate contacts based on name, email, phone matching

import type { CrewContact, DuplicateMatch } from "@/types/callSheet";
import { normalizeName } from "./consolidateContacts";

/**
 * Calculate similarity between two strings (Levenshtein-based)
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length <= s2.length ? s1 : s2;
  
  // Quick check: if one contains the other
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }
  
  // Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= shorter.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= longer.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= shorter.length; i++) {
    for (let j = 1; j <= longer.length; j++) {
      const cost = shorter[i - 1] === longer[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[shorter.length][longer.length];
  return 1 - distance / longer.length;
}

/**
 * Normalize phone number for comparison
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10); // Last 10 digits
}

/**
 * Normalize email for comparison
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Calculate match score between two contacts
 */
export function calculateMatchScore(
  contact1: CrewContact,
  contact2: CrewContact
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  
  // Name matching (max 40 points)
  const nameSim = stringSimilarity(contact1.name, contact2.name);
  if (nameSim >= 0.9) {
    score += 40;
    reasons.push('Names nearly identical');
  } else if (nameSim >= 0.7) {
    score += 30;
    reasons.push('Names very similar');
  } else if (nameSim >= 0.5) {
    score += 15;
    reasons.push('Names somewhat similar');
  }
  
  // Email matching (30 points for exact match)
  if (contact1.email && contact2.email) {
    if (normalizeEmail(contact1.email) === normalizeEmail(contact2.email)) {
      score += 30;
      reasons.push('Same email address');
    }
  }
  
  // Phone matching (30 points for exact match)
  if (contact1.phone && contact2.phone) {
    if (normalizePhone(contact1.phone) === normalizePhone(contact2.phone)) {
      score += 30;
      reasons.push('Same phone number');
    }
  }
  
  // Instagram matching (20 points)
  if (contact1.instagram_handle && contact2.instagram_handle) {
    const ig1 = contact1.instagram_handle.toLowerCase().replace('@', '');
    const ig2 = contact2.instagram_handle.toLowerCase().replace('@', '');
    if (ig1 === ig2) {
      score += 20;
      reasons.push('Same Instagram handle');
    }
  }
  
  // Same department (5 points bonus)
  if (contact1.department && contact2.department) {
    if (contact1.department.toLowerCase() === contact2.department.toLowerCase()) {
      score += 5;
      reasons.push('Same department');
    }
  }
  
  return { score, reasons };
}

/**
 * Find all duplicate pairs in a list of contacts
 */
export function findDuplicates(
  contacts: CrewContact[],
  threshold: number = 50
): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = [];
  
  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const { score, reasons } = calculateMatchScore(contacts[i], contacts[j]);
      
      if (score >= threshold) {
        duplicates.push({
          contact1: contacts[i],
          contact2: contacts[j],
          matchScore: score,
          matchReasons: reasons,
        });
      }
    }
  }
  
  // Sort by match score descending
  return duplicates.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Find contacts that match a given contact
 */
export function findMatchesFor(
  contact: CrewContact,
  allContacts: CrewContact[],
  threshold: number = 50
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  
  for (const other of allContacts) {
    if (other.id === contact.id) continue;
    
    const { score, reasons } = calculateMatchScore(contact, other);
    if (score >= threshold) {
      matches.push({
        contact1: contact,
        contact2: other,
        matchScore: score,
        matchReasons: reasons,
      });
    }
  }
  
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Group duplicates into clusters
 */
export function clusterDuplicates(
  duplicates: DuplicateMatch[]
): CrewContact[][] {
  const clusters: Map<string, Set<string>> = new Map();
  const contactMap: Map<string, CrewContact> = new Map();
  
  // Build union-find structure
  for (const dup of duplicates) {
    contactMap.set(dup.contact1.id, dup.contact1);
    contactMap.set(dup.contact2.id, dup.contact2);
    
    const cluster1 = findCluster(clusters, dup.contact1.id);
    const cluster2 = findCluster(clusters, dup.contact2.id);
    
    // Merge clusters
    const mergedCluster = new Set([...cluster1, ...cluster2]);
    for (const id of mergedCluster) {
      clusters.set(id, mergedCluster);
    }
  }
  
  // Convert to array of contact arrays
  const seen = new Set<string>();
  const result: CrewContact[][] = [];
  
  for (const [id, cluster] of clusters.entries()) {
    const clusterKey = Array.from(cluster).sort().join(',');
    if (seen.has(clusterKey)) continue;
    seen.add(clusterKey);
    
    const contacts = Array.from(cluster)
      .map(cid => contactMap.get(cid))
      .filter((c): c is CrewContact => c !== undefined);
    
    if (contacts.length > 1) {
      result.push(contacts);
    }
  }
  
  return result;
}

/**
 * Helper to find cluster for a contact ID
 */
function findCluster(clusters: Map<string, Set<string>>, id: string): Set<string> {
  const existing = clusters.get(id);
  if (existing) return existing;
  
  const newCluster = new Set([id]);
  clusters.set(id, newCluster);
  return newCluster;
}

/**
 * Get duplicate statistics
 */
export function getDuplicateStats(contacts: CrewContact[]): {
  totalContacts: number;
  uniqueContacts: number;
  duplicatePairs: number;
  duplicateClusters: number;
} {
  const duplicates = findDuplicates(contacts);
  const clusters = clusterDuplicates(duplicates);
  
  const duplicateIds = new Set<string>();
  for (const dup of duplicates) {
    duplicateIds.add(dup.contact1.id);
    duplicateIds.add(dup.contact2.id);
  }
  
  return {
    totalContacts: contacts.length,
    uniqueContacts: contacts.length - duplicateIds.size + clusters.length,
    duplicatePairs: duplicates.length,
    duplicateClusters: clusters.length,
  };
}
