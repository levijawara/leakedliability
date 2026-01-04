import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ArenaNotificationRequest {
  report_id: string; // DB ID, not report_id
  event_type: 'message' | 'redirect' | 'inactivity';
  message_text?: string;
  from_name?: string;
  to_name?: string;
  to_email?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { report_id, event_type, message_text, from_name, to_name, to_email }: ArenaNotificationRequest = await req.json();

    if (!report_id || !event_type) {
      throw new Error('Missing required fields: report_id, event_type');
    }

    // Check if arena is locked (don't send notifications if debt is paid)
    const { data: report } = await supabase
      .from('payment_reports')
      .select('report_id, arena_locked, project_name')
      .eq('id', report_id)
      .single();

    if (!report) {
      throw new Error('Report not found');
    }

    if (report.arena_locked) {
      // Arena is locked, don't send notifications
      return new Response(
        JSON.stringify({ success: true, message: 'Arena is locked, notifications skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get all participants
    const { data: participants } = await supabase
      .from('liability_arena_participants')
      .select('participant_email, participant_name')
      .eq('report_id', report_id);

    if (!participants || participants.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No participants to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Build email addresses (participants + admins)
    const emailList = [
      ...participants.map(p => p.participant_email),
      'leakedliability@gmail.com', // Always include Levi
    ];

    // Remove duplicates
    const uniqueEmails = [...new Set(emailList)];

    // Build email subject and body based on event type
    let subject = '';
    let bodyText = '';

    switch (event_type) {
      case 'message':
        subject = `New message in Liability Arena - Report #${report.report_id}`;
        bodyText = `${from_name || 'A participant'} sent a new message in the liability arena for Report #${report.report_id}:\n\n"${message_text || ''}"\n\nView the full conversation: ${Deno.env.get('PUBLIC_SITE_URL') || 'https://leakedliability.com'}/liability-arena/${report.report_id}`;
        break;
      
      case 'redirect':
        subject = `Liability Redirected - Report #${report.report_id}`;
        bodyText = `${from_name || 'A participant'} redirected liability for Report #${report.report_id} to ${to_name} (${to_email}).\n\nView the full conversation: ${Deno.env.get('PUBLIC_SITE_URL') || 'https://leakedliability.com'}/liability-arena/${report.report_id}`;
        break;
      
      case 'inactivity':
        subject = `Activity in Liability Arena - Report #${report.report_id}`;
        bodyText = `There has been activity in the liability arena for Report #${report.report_id} after a period of inactivity.\n\nView the full conversation: ${Deno.env.get('PUBLIC_SITE_URL') || 'https://leakedliability.com'}/liability-arena/${report.report_id}`;
        break;
    }

    // Send email to all participants
    const emailPromises = uniqueEmails.map(email => 
      supabase.functions.invoke('send-email', {
        body: {
          type: 'admin_notification', // Using admin notification template as fallback
          to: email,
          subject: subject,
          data: {
            message: bodyText,
            reportId: report.report_id,
            projectName: report.project_name || 'Unknown Project',
          },
        },
      })
    );

    await Promise.all(emailPromises);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: uniqueEmails.length,
        event_type,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error sending arena notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

