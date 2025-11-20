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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[leaderboard-insights] Generating insights for admin:', user.id);

    const { data: producers } = await supabase.from('producers').select('*');
    const { data: reports } = await supabase.from('payment_reports').select('*');

    const totalProducers = producers?.length || 0;
    const totalReports = reports?.length || 0;
    const verifiedReports = reports?.filter(r => r.verified).length || 0;
    const pendingReports = reports?.filter(r => r.status === 'pending').length || 0;
    const paidReports = reports?.filter(r => r.status === 'paid').length || 0;
    
    const totalDebt = reports?.reduce((sum, r) => 
      r.status !== 'paid' ? sum + (r.amount_owed || 0) : sum, 0) || 0;
    
    const averageDebt = totalProducers > 0 ? totalDebt / totalProducers : 0;

    const insights = {
      totalProducers,
      totalReports,
      verifiedReports,
      pendingReports,
      paidReports,
      totalDebt: Math.round(totalDebt * 100) / 100,
      averageDebt: Math.round(averageDebt * 100) / 100
    };

    return new Response(
      JSON.stringify({ success: true, data: insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[leaderboard-insights] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
