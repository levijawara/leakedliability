// Normalize and standardize role names across call sheets

/**
 * Master list of standard film/TV production departments
 */
export const MASTER_DEPARTMENTS = [
  'Production',
  'Directing',
  'Camera',
  'Grip',
  'Electric',
  'Sound',
  'Art',
  'Props',
  'Costume',
  'Hair & Makeup',
  'Locations',
  'Transportation',
  'Craft Services',
  'Other',
] as const;

export type MasterDepartment = typeof MASTER_DEPARTMENTS[number];

/**
 * Common role aliases and their canonical forms
 */
export const ROLE_ALIASES: Record<string, string> = {
  // Production
  'ep': 'Executive Producer',
  'exec producer': 'Executive Producer',
  'executive prod': 'Executive Producer',
  'prod': 'Producer',
  'lp': 'Line Producer',
  'line prod': 'Line Producer',
  'upm': 'UPM',
  'unit production manager': 'UPM',
  'pm': 'Production Manager',
  'poc': 'Production Coordinator',
  'prod coordinator': 'Production Coordinator',
  'production coord': 'Production Coordinator',
  'pa': 'Production Assistant',
  'prod asst': 'Production Assistant',
  'production asst': 'Production Assistant',
  
  // Directing
  'dir': 'Director',
  '1st ad': '1st AD',
  'first ad': '1st AD',
  'first assistant director': '1st AD',
  '2nd ad': '2nd AD',
  'second ad': '2nd AD',
  'second assistant director': '2nd AD',
  '2nd 2nd': '2nd 2nd AD',
  '2nd 2nd ad': '2nd 2nd AD',
  
  // Camera
  'dp': 'DP',
  'dop': 'DP',
  'director of photography': 'DP',
  'cinematographer': 'DP',
  'camera op': 'Camera Operator',
  'cam op': 'Camera Operator',
  'a cam op': 'A Camera Operator',
  'b cam op': 'B Camera Operator',
  '1st ac': '1st AC',
  'first ac': '1st AC',
  'focus puller': '1st AC',
  '2nd ac': '2nd AC',
  'second ac': '2nd AC',
  'loader': 'Loader',
  'film loader': 'Loader',
  'dit': 'DIT',
  'digital imaging tech': 'DIT',
  
  // Grip
  'key grip': 'Key Grip',
  'kg': 'Key Grip',
  'bb grip': 'Best Boy Grip',
  'best boy grip': 'Best Boy Grip',
  'bbg': 'Best Boy Grip',
  'dolly grip': 'Dolly Grip',
  
  // Electric
  'gaffer': 'Gaffer',
  'chief lighting tech': 'Gaffer',
  'bbe': 'Best Boy Electric',
  'bb electric': 'Best Boy Electric',
  'best boy electric': 'Best Boy Electric',
  'electrician': 'Electrician',
  'set electrician': 'Electrician',
  
  // Sound
  'sound mixer': 'Sound Mixer',
  'production sound mixer': 'Sound Mixer',
  'psm': 'Sound Mixer',
  'boom op': 'Boom Operator',
  'boom operator': 'Boom Operator',
  'boom': 'Boom Operator',
  'utility sound': 'Utility Sound',
  
  // Art Department
  'pd': 'Production Designer',
  'production designer': 'Production Designer',
  'art director': 'Art Director',
  'ad': 'Art Director',
  'set decorator': 'Set Decorator',
  'set dec': 'Set Decorator',
  'leadman': 'Leadman',
  'lead man': 'Leadman',
  'swing': 'Swing',
  'set dresser': 'Set Dresser',
  
  // Props
  'prop master': 'Prop Master',
  'props master': 'Prop Master',
  'property master': 'Prop Master',
  'asst props': 'Assistant Props',
  'props asst': 'Assistant Props',
  
  // Costume/Wardrobe
  'costume designer': 'Costume Designer',
  'cd': 'Costume Designer',
  'wardrobe supervisor': 'Wardrobe Supervisor',
  'wardrobe sup': 'Wardrobe Supervisor',
  'costumer': 'Costumer',
  'set costumer': 'Set Costumer',
  
  // Hair & Makeup
  'hmu': 'Hair & Makeup',
  'hair makeup': 'Hair & Makeup',
  'key hair': 'Key Hair',
  'key makeup': 'Key Makeup',
  'mua': 'Makeup Artist',
  'makeup artist': 'Makeup Artist',
  'hair stylist': 'Hair Stylist',
  
  // Locations
  'lm': 'Location Manager',
  'location manager': 'Location Manager',
  'alm': 'Assistant Location Manager',
  'asst location manager': 'Assistant Location Manager',
  'location scout': 'Location Scout',
  
  // Transportation
  'transpo captain': 'Transportation Captain',
  'transport captain': 'Transportation Captain',
  'tc': 'Transportation Captain',
  'driver': 'Driver',
  'picture car': 'Picture Car',
  
  // Craft Services / Catering
  'craft services': 'Craft Services',
  'crafty': 'Craft Services',
  'craft service': 'Craft Services',
  'caterer': 'Caterer',
  'catering': 'Caterer',
};

/**
 * Normalize a role to its canonical form
 */
export function normalizeRole(role: string): string {
  if (!role) return '';
  
  const cleaned = role.toLowerCase().trim();
  
  // Check for exact alias match
  if (ROLE_ALIASES[cleaned]) {
    return ROLE_ALIASES[cleaned];
  }
  
  // Check for partial matches
  for (const [alias, canonical] of Object.entries(ROLE_ALIASES)) {
    if (cleaned.includes(alias) || alias.includes(cleaned)) {
      return canonical;
    }
  }
  
  // Title case the original if no match
  return toTitleCase(role);
}

/**
 * Convert string to title case
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extract role from a combined role/department string
 * e.g., "Camera - 1st AC" -> { role: "1st AC", department: "Camera" }
 */
export function parseRoleDepartment(input: string): { role: string; department: string | null } {
  // Common separators
  const separators = [' - ', ' / ', ' | ', ': '];
  
  for (const sep of separators) {
    if (input.includes(sep)) {
      const parts = input.split(sep);
      if (parts.length === 2) {
        return {
          department: parts[0].trim(),
          role: normalizeRole(parts[1].trim()),
        };
      }
    }
  }
  
  return {
    role: normalizeRole(input),
    department: null,
  };
}

/**
 * Get suggested roles for autocomplete
 */
export function getRoleSuggestions(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (normalizedQuery.length < 2) return [];
  
  const matches = new Set<string>();
  
  // Add matching canonical roles
  for (const canonical of Object.values(ROLE_ALIASES)) {
    if (canonical.toLowerCase().includes(normalizedQuery)) {
      matches.add(canonical);
    }
  }
  
  // Add matching aliases that map to roles
  for (const [alias, canonical] of Object.entries(ROLE_ALIASES)) {
    if (alias.includes(normalizedQuery)) {
      matches.add(canonical);
    }
  }
  
  return Array.from(matches).slice(0, 10);
}

/**
 * Check if a role is valid/known
 */
export function isKnownRole(role: string): boolean {
  const normalized = normalizeRole(role);
  return Object.values(ROLE_ALIASES).includes(normalized);
}

/**
 * Get all canonical roles
 */
export function getAllCanonicalRoles(): string[] {
  return [...new Set(Object.values(ROLE_ALIASES))].sort();
}
