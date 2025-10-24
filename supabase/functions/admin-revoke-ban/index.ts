import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export const config = { verify_jwt: true };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify JWT and get admin user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (authError || !user) {
      console.error('[admin-revoke-ban] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { ban_id, reason } = await req.json();

    console.log(`[admin-revoke-ban] Revocation requested by admin ${user.id} for ban ${ban_id}`);

    // Validate inputs
    if (!ban_id || typeof ban_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid ban_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid reason for revocation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Execute revoke_ban RPC
    const { data, error } = await supabase.rpc('revoke_ban', {
      _ban_id: ban_id,
      _reason: reason
    });

    if (error) {
      console.error('[admin-revoke-ban] RPC error:', error);
      
      // Map specific errors
      if (error.message.includes('permission_denied')) {
        return new Response(
          JSON.stringify({ error: 'You do not have permission to revoke bans' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (error.message.includes('ban_not_found_or_already_revoked')) {
        return new Response(
          JSON.stringify({ error: 'Ban not found or already revoked' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to revoke ban' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[admin-revoke-ban] Revocation successful:`, data);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[admin-revoke-ban] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
