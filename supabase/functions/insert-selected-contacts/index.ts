import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface ContactInput {
  name: string;
  role?: string;
  roles?: string[];
  department?: string;
  departments?: string[];
  phone?: string;
  phones?: string[];
  email?: string;
  emails?: string[];
  ig_handle?: string;
  confidence?: number;
  needs_review?: boolean;
  project_title?: string;
}

interface InsertRequest {
  contacts: ContactInput[];
  call_sheet_id?: string;
  merge_duplicates?: boolean;
}

// Helper functions
const getSupabase = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey, { 
    auth: { persistSession: false } 
  });
};

const requireAuth = async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    throw new Error("Unauthorized - No auth token provided");
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = getSupabase();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('[INSERT_CONTACTS] Auth error:', error?.message || 'No user found');
    throw new Error("Unauthorized - Invalid token");
  }

  console.log('[INSERT_CONTACTS] User authenticated:', user.id);
  return { user, token };
};

const errorResponse = (message: string, status = 400) => {
  console.error(`[INSERT_CONTACTS] Error: ${message}`);
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};

const successResponse = (data: unknown, status = 200) => {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};

/**
 * Normalize contact data to database format
 */
function normalizeContact(contact: ContactInput, userId: string, callSheetId?: string) {
  // Convert single values to arrays
  const roles = contact.roles || (contact.role ? [contact.role] : []);
  const departments = contact.departments || (contact.department ? [contact.department] : []);
  const phones = contact.phones || (contact.phone ? [contact.phone] : null);
  const emails = contact.emails || (contact.email ? [contact.email] : null);

  return {
    user_id: userId,
    name: contact.name.trim(),
    roles: roles.length > 0 ? roles : null,
    departments: departments.length > 0 ? departments : null,
    phones,
    emails,
    ig_handle: contact.ig_handle?.replace('@', '') || null,
    confidence: contact.confidence ?? 0.85,
    needs_review: contact.needs_review ?? false,
    project_title: contact.project_title || null,
    source_files: callSheetId ? [callSheetId] : null,
  };
}

/**
 * Find existing contact by name (case-insensitive)
 */
async function findExistingContact(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  name: string
) {
  const { data, error } = await supabase
    .from('crew_contacts')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', name.trim())
    .single();

  if (error && error.code !== 'PGRST116') {
    console.warn('[INSERT_CONTACTS] Search error:', error.message);
  }

  return data;
}

/**
 * Merge arrays, removing duplicates
 */
function mergeArrays(existing: string[] | null, incoming: string[] | null): string[] | null {
  if (!existing && !incoming) return null;
  const combined = [...(existing || []), ...(incoming || [])];
  const unique = [...new Set(combined.filter(Boolean))];
  return unique.length > 0 ? unique : null;
}

/**
 * Merge two contacts
 */
function mergeContacts(existing: Record<string, unknown>, incoming: Record<string, unknown>) {
  return {
    ...existing,
    roles: mergeArrays(existing.roles as string[] | null, incoming.roles as string[] | null),
    departments: mergeArrays(existing.departments as string[] | null, incoming.departments as string[] | null),
    phones: mergeArrays(existing.phones as string[] | null, incoming.phones as string[] | null),
    emails: mergeArrays(existing.emails as string[] | null, incoming.emails as string[] | null),
    source_files: mergeArrays(existing.source_files as string[] | null, incoming.source_files as string[] | null),
    ig_handle: incoming.ig_handle || existing.ig_handle,
    project_title: incoming.project_title || existing.project_title,
    confidence: Math.max(
      (existing.confidence as number) || 0, 
      (incoming.confidence as number) || 0
    ),
    needs_review: (existing.needs_review as boolean) && (incoming.needs_review as boolean),
  };
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const { user } = await requireAuth(req);
    const userId = user.id;

    const supabase = getSupabase();

    // Parse request body
    const body: InsertRequest = await req.json();
    const { 
      contacts, 
      call_sheet_id, 
      merge_duplicates = true 
    } = body;

    if (!contacts || !Array.isArray(contacts)) {
      return errorResponse('contacts array is required');
    }

    if (contacts.length === 0) {
      return successResponse({
        success: true,
        inserted: 0,
        merged: 0,
        skipped: 0,
      });
    }

    // Verify call sheet ownership if provided
    if (call_sheet_id) {
      const { data: callSheet, error: csError } = await supabase
        .from('call_sheets')
        .select('id, user_id')
        .eq('id', call_sheet_id)
        .single();

      if (csError || !callSheet) {
        return errorResponse('Call sheet not found', 404);
      }

      if (callSheet.user_id !== userId) {
        return errorResponse('Access denied to this call sheet', 403);
      }
    }

    console.log(`[INSERT_CONTACTS] Processing ${contacts.length} contacts for user ${userId}`);

    let inserted = 0;
    let merged = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const contact of contacts) {
      try {
        // Validate name
        if (!contact.name || contact.name.trim().length < 2) {
          skipped++;
          continue;
        }

        const normalizedContact = normalizeContact(contact, userId, call_sheet_id);

        if (merge_duplicates) {
          // Check for existing contact
          const existing = await findExistingContact(supabase, userId, contact.name);

          if (existing) {
            // Merge with existing
            const mergedData = mergeContacts(existing, normalizedContact);
            
            const { error: updateError } = await supabase
              .from('crew_contacts')
              .update(mergedData)
              .eq('id', existing.id)
              .eq('user_id', userId);

            if (updateError) {
              console.warn(`[INSERT_CONTACTS] Merge error for ${contact.name}:`, updateError.message);
              errors.push(`Failed to merge ${contact.name}: ${updateError.message}`);
              skipped++;
            } else {
              merged++;
              console.log(`[INSERT_CONTACTS] Merged: ${contact.name}`);
            }
            continue;
          }
        }

        // Insert new contact
        const { error: insertError } = await supabase
          .from('crew_contacts')
          .insert(normalizedContact);

        if (insertError) {
          console.warn(`[INSERT_CONTACTS] Insert error for ${contact.name}:`, insertError.message);
          errors.push(`Failed to insert ${contact.name}: ${insertError.message}`);
          skipped++;
        } else {
          inserted++;
          console.log(`[INSERT_CONTACTS] Inserted: ${contact.name}`);
        }

      } catch (contactError: unknown) {
        const message = contactError instanceof Error ? contactError.message : 'Unknown error';
        console.error(`[INSERT_CONTACTS] Error processing ${contact.name}:`, message);
        errors.push(`Error processing ${contact.name}: ${message}`);
        skipped++;
      }
    }

    // Update call sheet status if provided
    if (call_sheet_id && (inserted > 0 || merged > 0)) {
      const { error: updateError } = await supabase
        .from('call_sheets')
        .update({
          review_completed_at: new Date().toISOString(),
          status: 'reviewed',
        })
        .eq('id', call_sheet_id)
        .eq('user_id', userId);

      if (updateError) {
        console.warn('[INSERT_CONTACTS] Failed to update call sheet status:', updateError.message);
      }
    }

    console.log(`[INSERT_CONTACTS] Complete: ${inserted} inserted, ${merged} merged, ${skipped} skipped`);

    return successResponse({
      success: true,
      inserted,
      merged,
      skipped,
      total: contacts.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: unknown) {
    console.error('[INSERT_CONTACTS] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    
    if (message.includes('Unauthorized')) {
      return errorResponse(message, 401);
    }
    
    return errorResponse(message, 500);
  }
});
