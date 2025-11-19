import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendNotificationsRequest {
  notification_ids: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Verify admin role
    const { data: roleData, error: roleError } = await supabase.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin'
    });

    if (roleError || !roleData) {
      console.error('[send-producer-notifications] Non-admin attempt:', userData.user.id);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { notification_ids }: SendNotificationsRequest = await req.json();

    if (!notification_ids || !Array.isArray(notification_ids) || notification_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'notification_ids array required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`[send-producer-notifications] Processing ${notification_ids.length} notifications`);

    // Fetch notification details
  const { data: notifications, error: fetchError } = await supabase
    .from('queued_producer_notifications')
    .select(`
      *,
      payment_reports!inner(
        id,
        producer_id,
        producer_email,
        invoice_date,
        report_id,
        producers!inner(
          name,
          company,
          oldest_debt_days,
          email
        )
      )
    `)
    .in('id', notification_ids)
    .is('sent_at', null);

    if (fetchError) {
      console.error('[send-producer-notifications] Fetch error:', fetchError);
      throw fetchError;
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ 
          sent: 0, 
          skipped: notification_ids.length, 
          failed: 0,
          message: 'No valid unsent notifications found' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    let sent = 0;
    let failed = 0;
    const failedIds: string[] = [];

    // Send emails
    for (const notification of notifications) {
      try {
        // Determine target email with fallback logic
        const reportEmail = (notification as any).payment_reports?.producer_email;
        const producerEmail = (notification as any).payment_reports?.producers?.email;
        const targetEmail = reportEmail || producerEmail;

        if (!targetEmail) {
          console.warn(`[send-producer-notifications] No email available for notification ${notification.id} - skipping`);
          failed++;
          failedIds.push(notification.id);
          continue;
        }

        console.log(`[send-producer-notifications] Using email: ${targetEmail} (source: ${reportEmail ? 'report' : 'producer'})`);

        // Generate liability claim token
        const { data: tokenData, error: tokenError } = await supabase
          .from('liability_claim_tokens')
          .insert({
            report_id: (notification as any).payment_reports?.id,
            accused_email: targetEmail,
          })
          .select()
          .single();

        if (tokenError) {
          console.error(`[send-producer-notifications] Token creation failed for ${notification.id}:`, tokenError);
          failed++;
          failedIds.push(notification.id);
          continue;
        }

        // Create liability chain entry
        const producerName = (notification as any).payment_reports?.producers?.name || 'Producer';
        const producerCompany = (notification as any).payment_reports?.producers?.company;
        const accusedName = producerCompany ? `${producerName} (${producerCompany})` : producerName;

        const { error: chainError } = await supabase
          .from('liability_chain')
          .insert({
            report_id: (notification as any).payment_reports?.id,
            accused_name: accusedName,
            accused_email: targetEmail,
            accused_role: 'Producer',
            accuser_id: null, // Initial notification, no accuser
          });

        if (chainError) {
          console.error(`[send-producer-notifications] Chain creation failed for ${notification.id}:`, chainError);
          // Continue anyway - chain is for tracking, not critical
        }

        // Build claim URL and format dates
        const publicUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://leakedliability.com";
        const claimUrl = `${publicUrl}/liability/claim/${tokenData.token}`;

        const expirationDate = new Date(tokenData.expires_at).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });

        const invoiceDate = new Date((notification as any).payment_reports?.invoice_date).toLocaleDateString();

        // Send email with liability_notification template
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: targetEmail,
            subject: `You've Been Named as Responsible Party - Report #${notification.report_id}`,
            template: 'liability_notification',
            data: {
              reportId: notification.report_id,
              amountOwed: notification.amount_owed,
              projectName: notification.project_name,
              invoiceDate,
              daysOverdue: notification.days_overdue,
              claimUrl,
              expirationDate,
              accusedName,
            },
          },
        });

        if (emailError) {
          console.error(`[send-producer-notifications] Email failed for ${notification.id}:`, emailError);
          failed++;
          failedIds.push(notification.id);
          continue;
        }

        // Mark as sent
        const { error: updateError } = await supabase
          .from('queued_producer_notifications')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', notification.id);

        if (updateError) {
          console.error(`[send-producer-notifications] Update failed for ${notification.id}:`, updateError);
          failed++;
          failedIds.push(notification.id);
          continue;
        }

        sent++;
        console.log(`[send-producer-notifications] Sent email for notification ${notification.id}`);

      } catch (error) {
        console.error(`[send-producer-notifications] Error processing ${notification.id}:`, error);
        failed++;
        failedIds.push(notification.id);
      }
    }

    const skipped = notification_ids.length - notifications.length;

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: userData.user.id,
      event_type: 'producer_notifications_sent',
      payload: {
        requested: notification_ids.length,
        sent,
        failed,
        skipped,
        failed_ids: failedIds
      }
    });

    console.log(`[send-producer-notifications] Complete: sent=${sent}, failed=${failed}, skipped=${skipped}`);

    return new Response(
      JSON.stringify({ sent, failed, skipped }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('[send-producer-notifications] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
