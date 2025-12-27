import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const config = { verify_jwt: true };

interface UpdateRequest {
  id: string;
  name?: string;
  roles?: string[];
  departments?: string[];
  phones?: string[];
  emails?: string[];
  ig_handle?: string;
  is_favorite?: boolean;
  needs_review?: boolean;
  hidden_roles?: string[];
  hidden_departments?: string[];
  hidden_phones?: string[];
  hidden_emails?: string[];
  hidden_ig_handle?: boolean;
  project_title?: string;
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
    const body = await req.json() as UpdateRequest;
    const { id, ...updateFields } = body;

    if (!id) {
      return errorResponse('Contact ID is required');
    }

    console.log(`[UPDATE_CONTACT] User ${user.id} updating contact ${id}`);

    // Verify ownership first
    const { data: existing, error: fetchError } = await supabase
      .from('crew_contacts')
      .select('id, ig_handle')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      console.error('[UPDATE_CONTACT] Contact not found or access denied');
      return errorResponse('Contact not found or access denied', 404);
    }

    // Build update object from provided fields
    const updateData: Record<string, unknown> = {};
    
    if (updateFields.name !== undefined) updateData.name = updateFields.name;
    if (updateFields.roles !== undefined) updateData.roles = updateFields.roles;
    if (updateFields.departments !== undefined) updateData.departments = updateFields.departments;
    if (updateFields.phones !== undefined) updateData.phones = updateFields.phones;
    if (updateFields.emails !== undefined) updateData.emails = updateFields.emails;
    if (updateFields.ig_handle !== undefined) updateData.ig_handle = updateFields.ig_handle;
    if (updateFields.is_favorite !== undefined) updateData.is_favorite = updateFields.is_favorite;
    if (updateFields.needs_review !== undefined) updateData.needs_review = updateFields.needs_review;
    if (updateFields.hidden_roles !== undefined) updateData.hidden_roles = updateFields.hidden_roles;
    if (updateFields.hidden_departments !== undefined) updateData.hidden_departments = updateFields.hidden_departments;
    if (updateFields.hidden_phones !== undefined) updateData.hidden_phones = updateFields.hidden_phones;
    if (updateFields.hidden_emails !== undefined) updateData.hidden_emails = updateFields.hidden_emails;
    if (updateFields.hidden_ig_handle !== undefined) updateData.hidden_ig_handle = updateFields.hidden_ig_handle;
    if (updateFields.project_title !== undefined) updateData.project_title = updateFields.project_title;

    if (Object.keys(updateData).length === 0) {
      return errorResponse('No fields to update');
    }

    console.log('[UPDATE_CONTACT] Update data:', JSON.stringify(updateData, null, 2));

    // Update contact with user scope
    const { data: updated, error: updateError } = await supabase
      .from('crew_contacts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[UPDATE_CONTACT] Update error:', updateError);
      return errorResponse('Failed to update contact');
    }

    // If IG handle changed, upsert to ig_usernames table
    if (updateFields.ig_handle && updateFields.ig_handle !== existing.ig_handle) {
      const newHandle = updateFields.ig_handle.replace('@', '').toLowerCase();
      
      if (newHandle) {
        console.log(`[UPDATE_CONTACT] Upserting IG handle: ${newHandle}`);
        
        const { error: igError } = await supabase
          .from('ig_usernames')
          .upsert({
            handle: newHandle,
            roles: updated.roles || [],
            occurrences: 1
          }, {
            onConflict: 'handle'
          });

        if (igError) {
          console.warn('[UPDATE_CONTACT] IG upsert warning:', igError);
          // Don't fail the whole operation for this
        }
      }
    }

    console.log(`[UPDATE_CONTACT] Successfully updated contact ${id}`);

    return successResponse({
      success: true,
      contact: updated
    });

  } catch (error) {
    console.error('[UPDATE_CONTACT] Error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    return errorResponse('An unexpected error occurred', 500);
  }
});
