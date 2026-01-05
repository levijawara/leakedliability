/**
 * Producer Role Constants and Helpers
 * 
 * Used to identify contacts who have been in producing roles.
 * Only these roles should appear in the network graph and heat map.
 */

export const PRODUCER_ROLE_PATTERNS = [
  // Core producer roles
  'producer',
  'executive producer',
  'line producer',
  'associate producer',
  'co-producer',
  'co producer',
  'creative producer',
  'supervising producer',
  'post producer',
  'post-production producer',
  'field producer',
  'story producer',
  'segment producer',
  'senior producer',
  'junior producer',
  'assistant producer',
  'production producer',
  
  // Production management roles
  'production manager',
  'production supervisor',
  'production coordinator',
  'production contact',
  'unit production manager',
  'post production supervisor',
  'post production manager',
  'post production coordinator',
  
  // Abbreviated roles
  'upm',
  'pm',
  'ep',
  'hop',
  'lp',
  'ap',
  
  // Head of production
  'head of production',
  'head of post',
  'head of post production',
  'vp production',
  'vp of production',
  'director of production',
  'production director',
  'production executive',
];

/**
 * Check if a single role string matches a producer pattern
 */
export function isProducerRole(role: string): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  
  return PRODUCER_ROLE_PATTERNS.some(pattern => {
    // Exact match
    if (normalized === pattern) return true;
    // Contains pattern as whole word
    if (normalized.includes(pattern)) return true;
    return false;
  });
}

/**
 * Check if an array of roles contains at least one producer role
 */
export function hasProducerRole(roles: string[] | null | undefined): boolean {
  if (!roles || !Array.isArray(roles)) return false;
  return roles.some(role => isProducerRole(role));
}
