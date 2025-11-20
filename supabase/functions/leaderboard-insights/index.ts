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

    const { data: producers, error: producersError } = await supabase.from('producers').select('*');
    const { data: reports, error: reportsError } = await supabase.from('payment_reports').select('*');
    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('account_type, business_name');

    console.log('[leaderboard-insights] Producers:', producers?.length, 'Error:', producersError);
    console.log('[leaderboard-insights] Reports:', reports?.length, 'Error:', reportsError);
    console.log('[leaderboard-insights] Profiles:', profiles?.length, 'Error:', profilesError);

    if (reportsError) {
      console.error('[leaderboard-insights] Reports query error:', reportsError);
    }
    if (producersError) {
      console.error('[leaderboard-insights] Producers query error:', producersError);
    }
    if (profilesError) {
      console.error('[leaderboard-insights] Profiles query error:', profilesError);
    }

    // Calculate user statistics
    const crewCount = profiles?.filter(p => p.account_type === 'crew').length || 0;
    const vendorCount = profiles?.filter(p => p.account_type === 'vendor').length || 0;
    const producerCount = profiles?.filter(p => p.account_type === 'producer').length || 0;
    const companyCount = profiles?.filter(p => p.account_type === 'production_company').length || 0;
    const totalUsers = crewCount + vendorCount + producerCount + companyCount;

    const totalProducers = producers?.length || 0;
    const totalReports = reports?.length || 0;
    const verifiedReports = reports?.filter(r => r.verified).length || 0;
    const pendingReports = reports?.filter(r => r.status === 'pending').length || 0;
    const paidReports = reports?.filter(r => r.status === 'paid').length || 0;
    
    // Total debt EVER reported (all reports regardless of status)
    const totalDebtEver = reports?.reduce((sum, r) => sum + (r.amount_owed || 0), 0) || 0;
    
    // Total OPEN/CURRENT debt (unpaid reports only)
    const totalOpenDebt = reports?.reduce((sum, r) => 
      r.status !== 'paid' ? sum + (r.amount_owed || 0) : sum, 0) || 0;
    
    // Count distinct producers who have reports
    const distinctProducersWithReports = reports 
      ? new Set(reports.filter(r => r.producer_id).map(r => r.producer_id)).size 
      : 0;
    
    // Calculate average using TOTAL DEBT EVER (not open debt)
    const averageDebt = distinctProducersWithReports > 0 
      ? totalDebtEver / distinctProducersWithReports 
      : 0;

    console.log('[leaderboard-insights] Calculated totals:');
    console.log('  - Total Debt Ever:', totalDebtEver);
    console.log('  - Total Open Debt:', totalOpenDebt);
    console.log('  - Distinct Producers with Reports:', distinctProducersWithReports);
    console.log('  - Average Debt:', averageDebt);
    console.log('  - Total Reports:', totalReports);
    console.log('  - Verified Reports:', verifiedReports);

    const insights = {
      totalUsers,
      crewCount,
      vendorCount,
      producerCount,
      companyCount,
      totalProducers,
      totalReports,
      verifiedReports,
      pendingReports,
      paidReports,
      distinctProducersWithReports,
      totalDebtEver: Math.round(totalDebtEver * 100) / 100,
      totalOpenDebt: Math.round(totalOpenDebt * 100) / 100,
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
