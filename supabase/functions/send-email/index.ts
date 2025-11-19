import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import * as React from "https://esm.sh/react@18.3.1";
import { renderAsync } from "https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1,react-dom@18.3.1";
import { CrewReportConfirmation } from "./_templates/crew-report-confirmation.tsx";
import { ProducerPaymentConfirmation } from "./_templates/producer-payment-confirmation.tsx";
import { DisputeSubmission } from "./_templates/dispute-submission.tsx";
import { CounterDisputeSubmission } from "./_templates/counter-dispute-submission.tsx";
import { ProducerSubmission } from "./_templates/producer-submission.tsx";
import { AdminNotification } from "./_templates/admin-notification.tsx";
import { CrewReportVerified } from "./_templates/crew-report-verified.tsx";
import { CrewReportRejected } from "./_templates/crew-report-rejected.tsx";
import { WelcomeEmail } from "./_templates/welcome.tsx";
import { CrewReportPaymentConfirmed } from "./_templates/crew-report-payment-confirmed.tsx";
import { ProducerReportNotification } from "./_templates/producer-report-notification.tsx";
import { VendorReportConfirmation } from "./_templates/vendor-report-confirmation.tsx";
import { VendorReportVerified } from "./_templates/vendor-report-verified.tsx";
import { VendorReportRejected } from "./_templates/vendor-report-rejected.tsx";
import { AdminCreatedAccount } from "./_templates/admin-created-account.tsx";
import { LiabilityNotification } from "./_templates/liability-notification.tsx";
import { LiabilityLoopDetected } from "./_templates/liability-loop-detected.tsx";
import { EmailVerification } from "./_templates/email-verification.tsx";
import { PasswordReset } from "./_templates/password-reset.tsx";
import { LiabilityAccepted } from "./_templates/liability-accepted.tsx";
import { DisputeEvidenceRoundStarted } from "./_templates/dispute-evidence-round-started.tsx";
import { DisputeAdditionalInfoRequired } from "./_templates/dispute-additional-info-required.tsx";
import { DisputeResolvedPaid } from "./_templates/dispute-resolved-paid.tsx";
import { DisputeResolvedMutual } from "./_templates/dispute-resolved-mutual.tsx";
import { DisputeClosedUnresolved } from "./_templates/dispute-closed-unresolved.tsx";
import { SubscriptionPaymentFailed } from "./_templates/subscription-payment-failed.tsx";
import { SubscriptionCanceled } from "./_templates/subscription-canceled.tsx";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'PSCS <notifications@leakedliability.com>';

interface EmailRequest {
  type: 'crew_report' | 'producer_payment' | 'dispute' | 'counter_dispute' | 'producer_submission' | 'admin_notification' | 'crew_report_verified' | 'crew_report_rejected' | 'welcome' | 'crew_report_payment_confirmed' | 'producer_report_notification' | 'vendor_report' | 'vendor_report_verified' | 'vendor_report_rejected' | 'admin_created_account' | 'liability_notification' | 'liability_loop_detected' | 'email_verification' | 'password_reset' | 'liability_accepted' | 'dispute_evidence_round_started' | 'dispute_additional_info_required' | 'dispute_resolved_paid' | 'dispute_resolved_mutual' | 'dispute_closed_unresolved' | 'subscription_payment_failed' | 'subscription_canceled';
  to: string;
  subject?: string;
  template?: string;
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

    // Phase 3: Enforce authentication for email sending
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Email request without authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error('Invalid authentication token:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const authenticatedUserId = userData.user.id;
    const authenticatedUserEmail = userData.user.email;
    console.log('Email request from authenticated user:', authenticatedUserId);

    // Get request body and check email type
    const { type, to, data, template, subject: customSubject }: EmailRequest = await req.json();
    
    // Support both old 'type' and new 'template' parameter
    const emailType = template || type;
    
    // Check email verification (except for welcome emails, liability notifications, auth emails, dispute emails, and subscription emails)
    if (emailType !== 'welcome' 
        && emailType !== 'liability_notification' 
        && emailType !== 'liability_loop_detected' 
        && emailType !== 'liability_accepted' 
        && emailType !== 'email_verification' 
        && emailType !== 'password_reset'
        && emailType !== 'dispute_evidence_round_started'
        && emailType !== 'dispute_additional_info_required'
        && emailType !== 'dispute_resolved_paid'
        && emailType !== 'dispute_resolved_mutual'
        && emailType !== 'dispute_closed_unresolved'
        && emailType !== 'subscription_payment_failed'
        && emailType !== 'subscription_canceled'
        && !userData.user.email_confirmed_at) {
      console.log('User email not verified, blocking email send');
      return new Response(
        JSON.stringify({ error: 'Please verify your email before performing this action' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    let html: string;
    let subject: string;

    // Render appropriate email template based on type
    switch (emailType) {
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
      
      case 'welcome':
        html = await renderAsync(
          React.createElement(WelcomeEmail, data)
        );
        subject = 'Welcome to Leaked Liability - PSCS';
        break;
      
      case 'crew_report_payment_confirmed':
        html = await renderAsync(
          React.createElement(CrewReportPaymentConfirmed, data)
        );
        subject = `✅ Payment Received - Report ${data.reportId}`;
        break;
      
      case 'producer_report_notification':
        // Verify producer email ownership before sending
        const { data: producerLink } = await supabase
          .from('producer_account_links')
          .select('producer_id, producers(name)')
          .eq('producer_id', data.producerId)
          .maybeSingle();
        
        // Only send if producer has a verified account link
        if (!producerLink) {
          console.log(`Skipping producer notification: No verified account for producer ${data.producerId}`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Producer email not verified - notification skipped' 
            }),
            { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        html = await renderAsync(
          React.createElement(ProducerReportNotification, data)
        );
        subject = `A Report Has Been Filed Involving Your Company – Report ID: ${data.reportId}`;
        break;
      
      case 'vendor_report':
        html = await renderAsync(
          React.createElement(VendorReportConfirmation, data)
        );
        subject = 'Vendor Report Submitted Successfully';
        break;
      
      case 'vendor_report_verified':
        html = await renderAsync(
          React.createElement(VendorReportVerified, data)
        );
        subject = 'Your Vendor Report Has Been Verified ✓';
        break;
      
      case 'vendor_report_rejected':
        html = await renderAsync(
          React.createElement(VendorReportRejected, data)
        );
        subject = 'Your Vendor Report Requires Additional Information';
        break;
      
      case 'admin_created_account':
        html = await renderAsync(
          React.createElement(AdminCreatedAccount, data)
        );
        subject = 'Your Leaked Liability Account Has Been Created';
        break;
      
      case 'liability_notification':
        html = await renderAsync(
          React.createElement(LiabilityNotification, data)
        );
        subject = customSubject || data.subject || `You've Been Named as Responsible Party - Report #${data.reportId}`;
        break;
      
      case 'liability_loop_detected':
        html = await renderAsync(
          React.createElement(LiabilityLoopDetected, data)
        );
        subject = customSubject || data.subject || `Liability Loop Detected - Report #${data.reportId}`;
        break;
      
      case 'email_verification':
        html = await renderAsync(
          React.createElement(EmailVerification, data)
        );
        subject = 'Verify Your Email Address - Leaked Liability';
        break;
      
      case 'password_reset':
        html = await renderAsync(
          React.createElement(PasswordReset, data)
        );
        subject = 'Reset Your Password - Leaked Liability';
        break;
      
      case 'liability_accepted':
        html = await renderAsync(
          React.createElement(LiabilityAccepted, data)
        );
        subject = customSubject || `Liability Accepted - Report #${data.reportId}`;
        break;
      
      case 'dispute_evidence_round_started':
        html = await renderAsync(
          React.createElement(DisputeEvidenceRoundStarted, data)
        );
        subject = customSubject || `Dispute Evidence Required - Report #${data.reportId}`;
        break;
      
      case 'dispute_additional_info_required':
        html = await renderAsync(
          React.createElement(DisputeAdditionalInfoRequired, data)
        );
        subject = customSubject || `Additional Information Required - Report #${data.reportId}`;
        break;
      
      case 'dispute_resolved_paid':
        html = await renderAsync(
          React.createElement(DisputeResolvedPaid, data)
        );
        subject = customSubject || `Dispute Resolved: Payment Confirmed - Report #${data.reportId}`;
        break;
      
      case 'dispute_resolved_mutual':
        html = await renderAsync(
          React.createElement(DisputeResolvedMutual, data)
        );
        subject = customSubject || `Dispute Resolved: Mutual Agreement - Report #${data.reportId}`;
        break;
      
      case 'dispute_closed_unresolved':
        html = await renderAsync(
          React.createElement(DisputeClosedUnresolved, data)
        );
        subject = customSubject || `Dispute Closed: Unresolved - Report #${data.reportId}`;
        break;
      
      case 'subscription_payment_failed':
        html = await renderAsync(
          React.createElement(SubscriptionPaymentFailed, data)
        );
        subject = customSubject || 'Payment Failed - Action Required';
        break;
      
      case 'subscription_canceled':
        html = await renderAsync(
          React.createElement(SubscriptionCanceled, data)
        );
        subject = customSubject || 'Subscription Canceled';
        break;
      
      default:
        throw new Error(`Unknown email type: ${emailType}`);
    }

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
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
        email_type: emailType,
        subject,
        status: 'sent',
        metadata: { resend_id: emailData?.id, data },
      });

    if (logError) {
      console.error('Error logging email:', logError);
    }

    console.log('Email sent successfully:', { type: emailType, to, from: FROM_EMAIL, subject });

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
