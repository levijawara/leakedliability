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

    console.log('[report-analytics] Generating report analytics for admin:', user.id);

    const { data: submissions } = await supabase
      .from('submissions')
      .select('submission_type, verified, status');

    const submissionStats = submissions?.reduce((acc: any, sub: any) => {
      const type = sub.submission_type;
      if (!acc[type]) {
        acc[type] = { total: 0, verified: 0, pending: 0, rejected: 0 };
      }
      acc[type].total++;
      if (sub.verified) acc[type].verified++;
      if (sub.status === 'pending') acc[type].pending++;
      if (sub.status === 'rejected') acc[type].rejected++;
      return acc;
    }, {});

    const { data: reports } = await supabase
      .from('payment_reports')
      .select('status, reporter_type, amount_owed, days_overdue');

    const reportStats = {
      byStatus: reports?.reduce((acc: any, r: any) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {}),
      byReporterType: reports?.reduce((acc: any, r: any) => {
        acc[r.reporter_type] = (acc[r.reporter_type] || 0) + 1;
        return acc;
      }, {}),
      totalAmount: reports?.reduce((sum, r) => sum + (r.amount_owed || 0), 0) || 0,
      averageDaysOverdue: reports?.length 
        ? reports.reduce((sum, r) => sum + (r.days_overdue || 0), 0) / reports.length 
        : 0
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          submissions: submissionStats,
          reports: reportStats
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[report-analytics] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
