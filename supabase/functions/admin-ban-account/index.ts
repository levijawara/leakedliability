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
      console.error('[admin-ban-account] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { target_user_id, reason, action = 'ban' } = await req.json();

    console.log(`[admin-ban-account] ${action} requested by admin ${user.id} for target ${target_user_id}`);

    // Validate inputs
    if (!target_user_id || typeof target_user_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid target_user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid reason' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Execute ban_account RPC
    const { data, error } = await supabase.rpc('ban_account', {
      _target_user_id: target_user_id,
      _reason: reason
    });

    if (error) {
      console.error('[admin-ban-account] RPC error:', error);
      
      // Map specific errors to user-friendly messages
      if (error.message.includes('permission_denied')) {
        return new Response(
          JSON.stringify({ error: 'You do not have permission to ban accounts' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (error.message.includes('invalid_input')) {
        return new Response(
          JSON.stringify({ error: 'Invalid input provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to ban account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[admin-ban-account] Ban successful:`, data);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[admin-ban-account] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
