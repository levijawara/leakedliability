import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const config = { verify_jwt: true };

interface MergeRequest {
  primaryId: string;
  secondaryId: string;
  mergedValues?: {
    name?: string;
    roles?: string[];
    departments?: string[];
    phones?: string[];
    emails?: string[];
    ig_handle?: string;
  };
}

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
    console.error('[AUTH] Error:', error?.message || 'No user found');
    throw new Error("Unauthorized - Invalid token");
  }

  console.log('[AUTH] User authenticated:', user.id);
  return { user, token };
};

const errorResponse = (message: string, status = 400) => {
  console.error(`[ERROR] ${message}`);
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

// Merge arrays, removing duplicates
const mergeArrays = (arr1: string[] | null, arr2: string[] | null): string[] => {
  const combined = [...(arr1 || []), ...(arr2 || [])];
  return [...new Set(combined)];
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const { user } = await requireAuth(req);
    const supabase = getSupabase();

    // Parse request body
    const { primaryId, secondaryId, mergedValues } = await req.json() as MergeRequest;

    if (!primaryId || !secondaryId) {
      return errorResponse('Both primaryId and secondaryId are required');
    }

    if (primaryId === secondaryId) {
      return errorResponse('Cannot merge a contact with itself');
    }

    console.log(`[MERGE_CONTACTS] User ${user.id} merging ${secondaryId} into ${primaryId}`);

    // Fetch both contacts - MUST belong to user
    const { data: contacts, error: fetchError } = await supabase
      .from('crew_contacts')
      .select('*')
      .in('id', [primaryId, secondaryId])
      .eq('user_id', user.id);

    if (fetchError) {
      console.error('[MERGE_CONTACTS] Fetch error:', fetchError);
      return errorResponse('Failed to fetch contacts');
    }

    if (!contacts || contacts.length !== 2) {
      return errorResponse('One or both contacts not found or access denied', 404);
    }

    const primary = contacts.find(c => c.id === primaryId);
    const secondary = contacts.find(c => c.id === secondaryId);

    if (!primary || !secondary) {
      return errorResponse('Contact mismatch error', 500);
    }

    // Build merged contact data
    const mergedData = {
      name: mergedValues?.name || primary.name,
      roles: mergedValues?.roles || mergeArrays(primary.roles, secondary.roles),
      departments: mergedValues?.departments || mergeArrays(primary.departments, secondary.departments),
      phones: mergedValues?.phones || mergeArrays(primary.phones, secondary.phones),
      emails: mergedValues?.emails || mergeArrays(primary.emails, secondary.emails),
      ig_handle: mergedValues?.ig_handle || primary.ig_handle || secondary.ig_handle,
      source_files: mergeArrays(primary.source_files, secondary.source_files),
      // Take the lower confidence (more conservative)
      confidence: Math.min(
        primary.confidence ?? 100,
        secondary.confidence ?? 100
      ),
      // Merge hidden fields too
      hidden_roles: mergeArrays(primary.hidden_roles, secondary.hidden_roles),
      hidden_departments: mergeArrays(primary.hidden_departments, secondary.hidden_departments),
      hidden_phones: mergeArrays(primary.hidden_phones, secondary.hidden_phones),
      hidden_emails: mergeArrays(primary.hidden_emails, secondary.hidden_emails),
      // If either needs review, merged one does too
      needs_review: primary.needs_review || secondary.needs_review,
      // Preserve favorite status
      is_favorite: primary.is_favorite || secondary.is_favorite,
    };

    console.log('[MERGE_CONTACTS] Merged data:', JSON.stringify(mergedData, null, 2));

    // Update primary contact
    const { data: updated, error: updateError } = await supabase
      .from('crew_contacts')
      .update(mergedData)
      .eq('id', primaryId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[MERGE_CONTACTS] Update error:', updateError);
      return errorResponse('Failed to update primary contact');
    }

    // Delete secondary contact
    const { error: deleteError } = await supabase
      .from('crew_contacts')
      .delete()
      .eq('id', secondaryId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[MERGE_CONTACTS] Delete error:', deleteError);
      return errorResponse('Failed to delete secondary contact');
    }

    console.log(`[MERGE_CONTACTS] Successfully merged. Primary: ${primaryId}, Deleted: ${secondaryId}`);

    return successResponse({
      success: true,
      merged_contact: updated,
      deleted_id: secondaryId
    });

  } catch (error) {
    console.error('[MERGE_CONTACTS] Error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    return errorResponse('An unexpected error occurred', 500);
  }
});
