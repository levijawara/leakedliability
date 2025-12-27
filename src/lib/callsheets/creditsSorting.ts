// Sort contacts by various criteria (role, department, name)

import type { CrewContact, SortConfig, SortDirection, SortField } from "@/types/callSheet";

/**
 * Standard department order for film/TV productions
 */
export const DEPARTMENT_ORDER: string[] = [
  'Production',
  'Directing',
  'Camera',
  'Lighting',
  'Grip',
  'Electric',
  'Sound',
  'Art',
  'Set Dec',
  'Props',
  'Costume',
  'Wardrobe',
  'Hair',
  'Makeup',
  'HMU',
  'Special Effects',
  'VFX',
  'Stunts',
  'Locations',
  'Transportation',
  'Catering',
  'Craft Services',
  'Accounting',
  'Post Production',
  'Editorial',
  'Music',
  'Publicity',
  'Other',
];

/**
 * Role hierarchy within departments (higher = more senior)
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  // Production
  'Executive Producer': 100,
  'Producer': 95,
  'Line Producer': 90,
  'UPM': 85,
  'Production Manager': 85,
  'Production Coordinator': 80,
  'Production Secretary': 75,
  'Production Assistant': 70,
  'PA': 70,
  
  // Directing
  'Director': 100,
  '1st AD': 90,
  '2nd AD': 85,
  '2nd 2nd AD': 80,
  
  // Camera
  'DP': 100,
  'Director of Photography': 100,
  'Cinematographer': 100,
  'Camera Operator': 90,
  '1st AC': 85,
  '2nd AC': 80,
  'DIT': 80,
  'Loader': 75,
  
  // Keys
  'Key Grip': 95,
  'Best Boy Grip': 90,
  'Gaffer': 95,
  'Best Boy Electric': 90,
  'Key Hair': 95,
  'Key Makeup': 95,
  
  // Default
  'Default': 50,
};

/**
 * Get department sort index
 */
export function getDepartmentIndex(department: string | null): number {
  if (!department) return DEPARTMENT_ORDER.length;
  const index = DEPARTMENT_ORDER.findIndex(
    d => d.toLowerCase() === department.toLowerCase()
  );
  return index >= 0 ? index : DEPARTMENT_ORDER.length - 1;
}

/**
 * Get role hierarchy score
 */
export function getRoleScore(role: string | null): number {
  if (!role) return ROLE_HIERARCHY['Default'];
  
  // Check exact match
  if (ROLE_HIERARCHY[role]) return ROLE_HIERARCHY[role];
  
  // Check partial match
  const lowerRole = role.toLowerCase();
  for (const [key, score] of Object.entries(ROLE_HIERARCHY)) {
    if (lowerRole.includes(key.toLowerCase())) return score;
  }
  
  return ROLE_HIERARCHY['Default'];
}

/**
 * Compare two contacts for sorting
 */
export function compareContacts(
  a: CrewContact,
  b: CrewContact,
  config: SortConfig
): number {
  const multiplier = config.direction === 'asc' ? 1 : -1;
  
  switch (config.field) {
    case 'name':
      return multiplier * (a.name || '').localeCompare(b.name || '');
      
    case 'department': {
      const deptDiff = getDepartmentIndex(a.department) - getDepartmentIndex(b.department);
      if (deptDiff !== 0) return multiplier * deptDiff;
      // Secondary sort by role within department
      return (getRoleScore(b.role) - getRoleScore(a.role));
    }
    
    case 'role': {
      const roleDiff = getRoleScore(b.role) - getRoleScore(a.role);
      if (roleDiff !== 0) return multiplier * roleDiff;
      // Secondary sort by name
      return (a.name || '').localeCompare(b.name || '');
    }
    
    case 'created_at':
      return multiplier * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
    case 'updated_at':
      return multiplier * (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
      
    default:
      return 0;
  }
}

/**
 * Sort contacts by given config
 */
export function sortContacts(
  contacts: CrewContact[],
  config: SortConfig
): CrewContact[] {
  return [...contacts].sort((a, b) => compareContacts(a, b, config));
}

/**
 * Group contacts by department
 */
export function groupByDepartment(
  contacts: CrewContact[]
): Map<string, CrewContact[]> {
  const groups = new Map<string, CrewContact[]>();
  
  // Initialize groups in order
  for (const dept of DEPARTMENT_ORDER) {
    groups.set(dept, []);
  }
  groups.set('Unknown', []);
  
  // Assign contacts to groups
  for (const contact of contacts) {
    const dept = contact.department || 'Unknown';
    const matchedDept = DEPARTMENT_ORDER.find(
      d => d.toLowerCase() === dept.toLowerCase()
    ) || 'Unknown';
    
    const group = groups.get(matchedDept) || [];
    group.push(contact);
    groups.set(matchedDept, group);
  }
  
  // Sort contacts within each group by role
  for (const [dept, group] of groups.entries()) {
    groups.set(dept, sortContacts(group, { field: 'role', direction: 'desc' }));
  }
  
  // Remove empty groups
  for (const [dept, group] of groups.entries()) {
    if (group.length === 0) groups.delete(dept);
  }
  
  return groups;
}

/**
 * Get unique departments from contacts
 */
export function getUniqueDepartments(contacts: CrewContact[]): string[] {
  const depts = new Set<string>();
  for (const contact of contacts) {
    if (contact.department) depts.add(contact.department);
    if (contact.departments) {
      for (const d of contact.departments) depts.add(d);
    }
  }
  return Array.from(depts).sort((a, b) => getDepartmentIndex(a) - getDepartmentIndex(b));
}

/**
 * Get unique roles from contacts
 */
export function getUniqueRoles(contacts: CrewContact[]): string[] {
  const roles = new Set<string>();
  for (const contact of contacts) {
    if (contact.role) roles.add(contact.role);
  }
  return Array.from(roles).sort((a, b) => getRoleScore(b) - getRoleScore(a));
}
