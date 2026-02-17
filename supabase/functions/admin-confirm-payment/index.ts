import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const config = { verify_jwt: true };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role
    const { data: isAdmin } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { payment_report_id, paid_by, payment_date, note } = await req.json();

    console.log('[admin-confirm-payment] Processing:', { payment_report_id, paid_by, payment_date });

    // Get payment report details
    const { data: report, error: reportError } = await supabaseClient
      .from('payment_reports')
      .select('*, producer:producers(name)')
      .eq('id', payment_report_id)
      .single();

    if (reportError || !report) {
      throw new Error('Payment report not found');
    }

    // Insert payment confirmation
    const { error: confirmError } = await supabaseClient
      .from('payment_confirmations')
      .insert({
        payment_report_id: report.id,
        producer_id: report.producer_id,
        confirmer_id: user.id,
        confirmation_type: 'admin_verification',
        amount_paid: report.amount_owed,
        verified: true,
        confirmed_by_admin: true,
        confirmed_by_user_id: user.id,
        paid_by: paid_by,
        notes: note || null,
      });

    if (confirmError) throw confirmError;

    // Update payment_reports with payment_date
    await supabaseClient
      .from('payment_reports')
      .update({
        payment_date: payment_date,
        closed_date: payment_date,
      })
      .eq('id', payment_report_id);

    // Delete queued notification
    await supabaseClient
      .from('queued_producer_notifications')
      .delete()
      .eq('payment_report_id', payment_report_id)
      .is('sent_at', null);

    // Log to audit_logs
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        event_type: 'admin_confirm_payment',
        payload: {
          payment_report_id,
          report_id: report.report_id,
          paid_by,
          payment_date,
          amount: report.amount_owed,
          note: note || null,
        },
      });

    // Send notification email
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('user_id', report.reporter_id)
      .maybeSingle();

    if (profile?.email) {
      const emailType = report.reporter_type === 'vendor'
        ? 'vendor_report_payment_confirmed'
        : 'crew_report_payment_confirmed';
      
      await supabaseClient.functions.invoke('send-email', {
        body: {
          type: emailType,
          to: profile.email,
          data: {
            reportId: report.report_id,
            producerName: report.producer?.name || 'Unknown',
            amount: report.amount_owed,
            paymentDate: payment_date,
          },
        },
      });
    }

    console.log('[admin-confirm-payment] Success');

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[admin-confirm-payment] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});