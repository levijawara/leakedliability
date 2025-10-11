import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import * as React from "https://esm.sh/react@18.3.1";
import { renderAsync } from "https://esm.sh/@react-email/components@0.0.22";
import { CrewReportConfirmation } from "./_templates/crew-report-confirmation.tsx";
import { ProducerPaymentConfirmation } from "./_templates/producer-payment-confirmation.tsx";
import { DisputeSubmission } from "./_templates/dispute-submission.tsx";
import { CounterDisputeSubmission } from "./_templates/counter-dispute-submission.tsx";
import { ProducerSubmission } from "./_templates/producer-submission.tsx";
import { AdminNotification } from "./_templates/admin-notification.tsx";
import { CrewReportVerified } from "./_templates/crew-report-verified.tsx";
import { CrewReportRejected } from "./_templates/crew-report-rejected.tsx";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

interface EmailRequest {
  type: 'crew_report' | 'producer_payment' | 'dispute' | 'counter_dispute' | 'producer_submission' | 'admin_notification' | 'crew_report_verified' | 'crew_report_rejected';
  to: string;
  data: any;
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

    const { type, to, data }: EmailRequest = await req.json();
    
    let html: string;
    let subject: string;

    // Render appropriate email template based on type
    switch (type) {
      case 'crew_report':
        html = await renderAsync(
          React.createElement(CrewReportConfirmation, data)
        );
        subject = 'Payment Report Submitted Successfully';
        break;
      
      case 'producer_payment':
        html = await renderAsync(
          React.createElement(ProducerPaymentConfirmation, data)
        );
        subject = 'Payment Confirmation Received';
        break;
      
      case 'dispute':
        html = await renderAsync(
          React.createElement(DisputeSubmission, data)
        );
        subject = 'Dispute Submitted';
        break;
      
      case 'counter_dispute':
        html = await renderAsync(
          React.createElement(CounterDisputeSubmission, data)
        );
        subject = 'Counter-Dispute Submitted';
        break;
      
      case 'producer_submission':
        html = await renderAsync(
          React.createElement(ProducerSubmission, data)
        );
        subject = 'Submission Received';
        break;
      
      case 'admin_notification':
        html = await renderAsync(
          React.createElement(AdminNotification, data)
        );
        subject = `New Submission: ${data.submissionType}`;
        break;
      
      case 'crew_report_verified':
        html = await renderAsync(
          React.createElement(CrewReportVerified, data)
        );
        subject = 'Your Payment Report Has Been Verified ✓';
        break;
      
      case 'crew_report_rejected':
        html = await renderAsync(
          React.createElement(CrewReportRejected, data)
        );
        subject = 'Your Payment Report Requires Additional Information';
        break;
      
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'PSCS <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    });

    if (emailError) {
      throw emailError;
    }

    // Log email to database
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: to,
        email_type: type,
        subject,
        status: 'sent',
        metadata: { resend_id: emailData?.id, data },
      });

    if (logError) {
      console.error('Error logging email:', logError);
    }

    console.log('Email sent successfully:', { type, to, subject });

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error sending email:', error);

    // Try to log failed email
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabase.from('email_logs').insert({
        recipient_email: 'unknown',
        email_type: 'error',
        subject: 'Failed to send',
        status: 'failed',
        error_message: error.message,
      });
    } catch (logError) {
      console.error('Error logging failed email:', logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
