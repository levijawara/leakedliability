import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const config = { verify_jwt: true };

interface DeleteRequest {
  id: string;
  deleteFile?: boolean; // Optional: also delete file from storage
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
    const { id, deleteFile = false } = await req.json() as DeleteRequest;

    if (!id) {
      return errorResponse('Call sheet ID is required');
    }

    console.log(`[DELETE_CALL_SHEET] User ${user.id} deleting call sheet ${id}`);

    // Verify ownership and get file path
    const { data: sheet, error: fetchError } = await supabase
      .from('call_sheets')
      .select('id, file_path, file_name, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !sheet) {
      console.error('[DELETE_CALL_SHEET] Call sheet not found or access denied');
      return errorResponse('Call sheet not found or access denied', 404);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('call_sheets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[DELETE_CALL_SHEET] Delete error:', deleteError);
      return errorResponse('Failed to delete call sheet');
    }

    console.log(`[DELETE_CALL_SHEET] Database record deleted: ${id}`);

    // Optionally delete file from storage
    let fileDeleted = false;
    if (deleteFile && sheet.file_path) {
      // User-scoped file path: {user_id}/{filename}
      const storagePath = `${user.id}/${sheet.file_path}`;
      
      console.log(`[DELETE_CALL_SHEET] Deleting file from storage: ${storagePath}`);
      
      const { error: storageError } = await supabase
        .storage
        .from('call_sheets')
        .remove([storagePath]);

      if (storageError) {
        console.warn('[DELETE_CALL_SHEET] Storage delete warning:', storageError);
        // Don't fail the whole operation - file may already be gone
      } else {
        fileDeleted = true;
        console.log(`[DELETE_CALL_SHEET] File deleted from storage`);
      }
    }

    return successResponse({
      success: true,
      id,
      file_deleted: fileDeleted,
      message: `Call sheet ${sheet.file_name} deleted successfully`
    });

  } catch (error) {
    console.error('[DELETE_CALL_SHEET] Error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    return errorResponse('An unexpected error occurred', 500);
  }
});
