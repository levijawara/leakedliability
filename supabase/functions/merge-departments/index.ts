import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const config = { verify_jwt: true };

interface MergeRequest {
  sourceDepartment: string;
  targetDepartment: string;
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
    const { sourceDepartment, targetDepartment } = await req.json() as MergeRequest;

    if (!sourceDepartment || !targetDepartment) {
      return errorResponse('Both sourceDepartment and targetDepartment are required');
    }

    if (sourceDepartment === targetDepartment) {
      return errorResponse('Source and target departments cannot be the same');
    }

    console.log(`[MERGE_DEPARTMENTS] User ${user.id} merging "${sourceDepartment}" -> "${targetDepartment}"`);

    // Fetch all user's contacts that have the source department
    const { data: contacts, error: fetchError } = await supabase
      .from('crew_contacts')
      .select('id, departments')
      .eq('user_id', user.id)
      .contains('departments', [sourceDepartment]);

    if (fetchError) {
      console.error('[MERGE_DEPARTMENTS] Fetch error:', fetchError);
      return errorResponse('Failed to fetch contacts');
    }

    if (!contacts || contacts.length === 0) {
      console.log('[MERGE_DEPARTMENTS] No contacts found with source department');
      return successResponse({
        success: true,
        updated_count: 0,
        affected_ids: [],
        message: `No contacts found with department "${sourceDepartment}"`
      });
    }

    console.log(`[MERGE_DEPARTMENTS] Found ${contacts.length} contacts to update`);

    const affectedIds: string[] = [];
    const errors: string[] = [];

    // Update each contact
    for (const contact of contacts) {
      const currentDepts = contact.departments || [];
      
      // Replace source with target, removing duplicates
      const newDepts = currentDepts.map((dept: string) => 
        dept === sourceDepartment ? targetDepartment : dept
      );
      
      // Remove duplicates (in case target already existed)
      const uniqueDepts = [...new Set(newDepts)];

      const { error: updateError } = await supabase
        .from('crew_contacts')
        .update({ departments: uniqueDepts })
        .eq('id', contact.id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error(`[MERGE_DEPARTMENTS] Failed to update contact ${contact.id}:`, updateError);
        errors.push(contact.id);
      } else {
        affectedIds.push(contact.id);
      }
    }

    console.log(`[MERGE_DEPARTMENTS] Updated ${affectedIds.length} contacts, ${errors.length} errors`);

    return successResponse({
      success: errors.length === 0,
      updated_count: affectedIds.length,
      affected_ids: affectedIds,
      errors: errors.length > 0 ? errors : undefined,
      message: `Merged "${sourceDepartment}" into "${targetDepartment}" for ${affectedIds.length} contacts`
    });

  } catch (error) {
    console.error('[MERGE_DEPARTMENTS] Error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    return errorResponse('An unexpected error occurred', 500);
  }
});
