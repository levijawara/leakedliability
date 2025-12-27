// Hook for role dictionary and autocomplete

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  normalizeRole, 
  getRoleSuggestions, 
  getAllCanonicalRoles,
  ROLE_ALIASES 
} from '@/lib/callsheets/roleNormalization';

interface UseRoleDictionaryResult {
  allRoles: string[];
  searchRoles: (query: string) => string[];
  normalizeRole: (role: string) => string;
  isKnownRole: (role: string) => boolean;
}

/**
 * Hook for role dictionary and normalization
 */
export function useRoleDictionary(): UseRoleDictionaryResult {
  const allRoles = useMemo(() => getAllCanonicalRoles(), []);

  const searchRoles = useCallback((query: string): string[] => {
    return getRoleSuggestions(query);
  }, []);

  const checkIsKnownRole = useCallback((role: string): boolean => {
    const normalized = normalizeRole(role);
    return Object.values(ROLE_ALIASES).includes(normalized);
  }, []);

  return {
    allRoles,
    searchRoles,
    normalizeRole,
    isKnownRole: checkIsKnownRole,
  };
}

/**
 * Hook for role autocomplete with search
 */
export function useRoleAutocomplete() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { searchRoles } = useRoleDictionary();

  useEffect(() => {
    if (query.length >= 2) {
      setSuggestions(searchRoles(query));
    } else {
      setSuggestions([]);
    }
  }, [query, searchRoles]);

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setQuery('');
  }, []);

  return {
    query,
    suggestions,
    search,
    clearSuggestions,
  };
}

/**
 * Get roles grouped by department
 */
export function useRolesByDepartment(): Map<string, string[]> {
  return useMemo(() => {
    const map = new Map<string, string[]>();

    // Group roles by inferred department
    const departmentRoles: Record<string, string[]> = {
      'Production': [
        'Executive Producer', 'Producer', 'Line Producer', 'UPM',
        'Production Manager', 'Production Coordinator', 'Production Assistant'
      ],
      'Directing': [
        'Director', '1st AD', '2nd AD', '2nd 2nd AD'
      ],
      'Camera': [
        'DP', 'Camera Operator', 'A Camera Operator', 'B Camera Operator',
        '1st AC', '2nd AC', 'Loader', 'DIT'
      ],
      'Grip': [
        'Key Grip', 'Best Boy Grip', 'Dolly Grip', 'Grip'
      ],
      'Electric': [
        'Gaffer', 'Best Boy Electric', 'Electrician'
      ],
      'Sound': [
        'Sound Mixer', 'Boom Operator', 'Utility Sound'
      ],
      'Art': [
        'Production Designer', 'Art Director', 'Set Decorator',
        'Leadman', 'Swing', 'Set Dresser'
      ],
      'Props': [
        'Prop Master', 'Assistant Props'
      ],
      'Costume': [
        'Costume Designer', 'Wardrobe Supervisor', 'Costumer', 'Set Costumer'
      ],
      'Hair & Makeup': [
        'Hair & Makeup', 'Key Hair', 'Key Makeup', 'Makeup Artist', 'Hair Stylist'
      ],
      'Locations': [
        'Location Manager', 'Assistant Location Manager', 'Location Scout'
      ],
      'Transportation': [
        'Transportation Captain', 'Driver', 'Picture Car'
      ],
      'Craft Services': [
        'Craft Services', 'Caterer'
      ],
    };

    for (const [dept, roles] of Object.entries(departmentRoles)) {
      map.set(dept, roles);
    }

    return map;
  }, []);
}
