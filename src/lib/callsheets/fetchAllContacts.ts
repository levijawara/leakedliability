// Paginated fetch helper for contacts (handles Supabase 1000 row limit)

import { supabase } from "@/integrations/supabase/client";
import type { CrewContact, FilterConfig, SortConfig } from "@/types/callSheet";

const PAGE_SIZE = 1000;

// Helper to convert DB row to CrewContact (maps ig_handle -> instagram_handle)
function toCrewContact(row: Record<string, unknown>): CrewContact {
  return {
    ...row,
    instagram_handle: row.ig_handle as string | null,
  } as unknown as CrewContact;
}

/**
 * Fetch all contacts for the current user with pagination
 */
export async function fetchAllContacts(
  userId: string,
  _options?: {
    filter?: Partial<FilterConfig>;
    sort?: SortConfig;
  }
): Promise<CrewContact[]> {
  const allContacts: CrewContact[] = [];
  let page = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('crew_contacts')
      .select('*')
      .eq('user_id', userId)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    
    if (error) {
      console.error('[fetchAllContacts] Error:', error);
      throw error;
    }
    
    if (data && data.length > 0) {
      for (const row of data) {
        allContacts.push(toCrewContact(row));
      }
      hasMore = data.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }
  
  // Sort by name client-side
  allContacts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  
  return allContacts;
}

/**
 * Fetch contacts for a specific call sheet
 */
export async function fetchContactsByCallSheet(
  userId: string,
  callSheetId: string
): Promise<CrewContact[]> {
  // Use RPC or simple query to avoid deep type instantiation
  const { data, error } = await supabase
    .from('crew_contacts')
    .select('*')
    .match({ user_id: userId, call_sheet_id: callSheetId });
  
  if (error) {
    console.error('[fetchContactsByCallSheet] Error:', error);
    throw error;
  }
  
  const contacts: CrewContact[] = [];
  for (const row of data || []) {
    contacts.push(toCrewContact(row));
  }
  contacts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return contacts;
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
 * Fetch contacts without IG handles (paginated)
 */
export async function fetchContactsWithoutIG(userId: string): Promise<CrewContact[]> {
  const allContacts: CrewContact[] = [];
  let page = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('crew_contacts')
      .select('*')
      .eq('user_id', userId)
      .is('ig_handle', null)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    
    if (error) {
      console.error('[fetchContactsWithoutIG] Error:', error);
      throw error;
    }
    
    if (data && data.length > 0) {
      for (const row of data) {
        allContacts.push(toCrewContact(row));
      }
      hasMore = data.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }
  
  allContacts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return allContacts;
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
    .limit(limit);
  
  if (error) {
    console.error('[searchContacts] Error:', error);
    throw error;
  }
  
  const contacts: CrewContact[] = [];
  for (const row of data || []) {
    contacts.push(toCrewContact(row));
  }
  contacts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return contacts;
}

/**
 * Get unique departments for user's contacts
 */
export async function fetchUniqueDepartments(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('crew_contacts')
    .select('departments')
    .eq('user_id', userId);
  
  if (error) {
    console.error('[fetchUniqueDepartments] Error:', error);
    throw error;
  }
  
  const departments = new Set<string>();
  for (const row of data || []) {
    const depts = row.departments as string[] | null;
    if (depts) {
      for (const dept of depts) {
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
    .eq('user_id', userId);
  
  if (error) {
    console.error('[fetchUniqueRoles] Error:', error);
    throw error;
  }
  
  const roles = new Set<string>();
  for (const row of data || []) {
    const rowRoles = row.roles as string[] | null;
    if (rowRoles) {
      for (const role of rowRoles) {
        roles.add(role);
      }
    }
  }
  
  return Array.from(roles).sort();
}
