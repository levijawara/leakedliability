// Paginated fetch helper for contacts (handles Supabase 1000 row limit)

import { supabase } from "@/integrations/supabase/client";
import type { CrewContact, FilterConfig, SortConfig } from "@/types/callSheet";

const PAGE_SIZE = 1000;

/**
 * Fetch all contacts for the current user with pagination
 */
export async function fetchAllContacts(
  userId: string,
  options?: {
    filter?: Partial<FilterConfig>;
    sort?: SortConfig;
  }
): Promise<CrewContact[]> {
  const allContacts: CrewContact[] = [];
  let page = 0;
  let hasMore = true;
  
  while (hasMore) {
    let query = supabase
      .from('crew_contacts')
      .select('*')
      .eq('user_id', userId)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    
    // Apply filters
    if (options?.filter?.searchQuery) {
      query = query.ilike('name', `%${options.filter.searchQuery}%`);
    }
    
    if (options?.filter?.hasInstagram === true) {
      query = query.not('instagram_handle', 'is', null);
    } else if (options?.filter?.hasInstagram === false) {
      query = query.is('instagram_handle', null);
    }
    
    // Apply sorting
    if (options?.sort) {
      query = query.order(options.sort.field, {
        ascending: options.sort.direction === 'asc',
      });
    } else {
      query = query.order('name', { ascending: true });
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[fetchAllContacts] Error:', error);
      throw error;
    }
    
    if (data && data.length > 0) {
      allContacts.push(...(data as unknown as CrewContact[]));
      hasMore = data.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }
  
  return allContacts;
}

/**
 * Fetch contacts for a specific call sheet
 */
export async function fetchContactsByCallSheet(
  userId: string,
  callSheetId: string
): Promise<CrewContact[]> {
  const { data, error } = await supabase
    .from('crew_contacts')
    .select('*')
    .eq('user_id', userId)
    .eq('call_sheet_id', callSheetId)
    .order('name', { ascending: true });
  
  if (error) {
    console.error('[fetchContactsByCallSheet] Error:', error);
    throw error;
  }
  
  return (data || []) as unknown as CrewContact[];
}

/**
 * Fetch contact count for user
 */
export async function fetchContactCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('crew_contacts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (error) {
    console.error('[fetchContactCount] Error:', error);
    throw error;
  }
  
  return count || 0;
}

/**
 * Search contacts by query
 */
export async function searchContacts(
  userId: string,
  query: string,
  limit: number = 50
): Promise<CrewContact[]> {
  const { data, error } = await supabase
    .from('crew_contacts')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true })
    .limit(limit);
  
  if (error) {
    console.error('[searchContacts] Error:', error);
    throw error;
  }
  
  return (data || []) as unknown as CrewContact[];
}

/**
 * Get unique departments for user's contacts
 */
export async function fetchUniqueDepartments(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('crew_contacts')
    .select('departments')
    .eq('user_id', userId)
    .not('departments', 'is', null);
  
  if (error) {
    console.error('[fetchUniqueDepartments] Error:', error);
    throw error;
  }
  
  const departments = new Set<string>();
  for (const row of data || []) {
    if (row.departments) {
      for (const dept of row.departments) {
        departments.add(dept);
      }
    }
  }
  
  return Array.from(departments).sort();
}

/**
 * Get unique roles for user's contacts
 */
export async function fetchUniqueRoles(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('crew_contacts')
    .select('roles')
    .eq('user_id', userId)
    .not('roles', 'is', null);
  
  if (error) {
    console.error('[fetchUniqueRoles] Error:', error);
    throw error;
  }
  
  const roles = new Set<string>();
  for (const row of data || []) {
    if (row.roles) {
      for (const role of row.roles) {
        roles.add(role);
      }
    }
  }
  
  return Array.from(roles).sort();
}
