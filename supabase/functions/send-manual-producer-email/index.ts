import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { internalHeaders } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const config = { verify_jwt: true };

interface ManualEmailRequest {
  template: string;
  producer_id: string;
  admin_id: string;
  manual_email?: string;
  manual_emails?: string[];
  custom_data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestBody: ManualEmailRequest | null = null;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get auth user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    requestBody = await req.json();
    const { template, producer_id, admin_id, manual_email, manual_emails, custom_data } = requestBody;

    console.log('[Manual Email] Request:', { template, producer_id, admin_id });

    // Fetch producer data with aggregated stats
    const { data: producer, error: producerError } = await supabase
      .from('producers')
      .select('id, name, email, company, pscs_score, total_amount_owed, oldest_debt_days')
      .eq('id', producer_id)
      .single();

    if (producerError || !producer) {
      throw new Error('Producer not found');
    }

    // Recipients: prioritize explicit manual list, then manual single email, then producer.email.
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalize = (email: string) => email.trim().toLowerCase();

    const manualEmailSingle = manual_email?.trim() ? normalize(manual_email) : null;
    const manualEmailList = Array.isArray(manual_emails)
      ? manual_emails
          .map((e) => (typeof e === "string" ? e : ""))
          .map(normalize)
      : [];

    const recipientsRaw: string[] = [];
    if (manualEmailList.length > 0) recipientsRaw.push(...manualEmailList);
    else if (manualEmailSingle) recipientsRaw.push(manualEmailSingle);
    else if (producer.email?.trim()) recipientsRaw.push(normalize(producer.email));

    const recipients = [...new Set(recipientsRaw)].filter((e) => EMAIL_REGEX.test(e));

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No valid email address provided. Please enter one manually." }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const usedManualEmail = manualEmailList.length > 0 || !!manualEmailSingle;

    console.log('[Manual Email] Producer found:', producer.name, producer.email, 'recipients:', recipients);

    // Fetch latest payment report for this producer (if needed for template data)
    const { data: latestReport } = await supabase
      .from('payment_reports')
      .select('*')
      .eq('producer_id', producer_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build template data based on template type
    const templateData = buildTemplateData(template, producer, latestReport, custom_data);

    console.log('[Manual Email] Sending email with template:', template);

    let sentCount = 0;
    let failedCount = 0;

    // Send one email per recipient (send-email supports a single `to`).
    for (const recipientEmail of recipients) {
      try {
        const { error: emailError } = await supabase.functions.invoke("send-email", {
          body: {
            type: template,
            to: recipientEmail,
            data: templateData,
            origin: "manual_admin",
          },
          headers: internalHeaders(),
        });

        if (emailError) throw emailError;

        sentCount++;

        const { error: logError } = await supabase
          .from("manual_email_logs")
          .insert({
            admin_id: admin_id,
            producer_id: producer_id,
            template_key: template,
            producer_email: recipientEmail,
            status: "success",
            metadata: {
              producer_name: producer.name,
              used_manual_email: usedManualEmail,
              manual_email_value: usedManualEmail
                ? manualEmailList.length > 0
                  ? manualEmailList
                  : manualEmailSingle
                : null,
              template_data: templateData,
            },
          });

        if (logError) {
          console.error("[Manual Email] Failed to log success:", logError);
        }
      } catch (e: any) {
        failedCount++;
        const errorMessage = e?.message || "Failed to send email";

        try {
          const { error: logError } = await supabase
            .from("manual_email_logs")
            .insert({
              admin_id: admin_id,
              producer_id: producer_id,
              template_key: template,
              producer_email: recipientEmail,
              status: "failed",
              error_message: errorMessage,
              metadata: {
                producer_name: producer.name,
                used_manual_email: usedManualEmail,
                template_data: templateData,
              },
            });

          if (logError) {
            console.error("[Manual Email] Failed to log failure:", logError);
          }
        } catch (logCatch) {
          console.error("[Manual Email] Failure logging threw:", logCatch);
        }
      }
    }

    const success = failedCount === 0 && sentCount > 0;

    return new Response(
      JSON.stringify({
        success,
        sent: sentCount,
        failed: failedCount,
        error: success
          ? undefined
          : `Email sending completed with failures. Sent ${sentCount}, failed ${failedCount}.`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('[Manual Email] Error:', error?.message || error);

    if (requestBody) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        await supabase.from("manual_email_logs").insert({
          admin_id: requestBody.admin_id,
          producer_id: requestBody.producer_id,
          template_key: requestBody.template,
          producer_email: "unknown",
          status: "failed",
          error_message: error?.message || "Unknown error",
        });
      } catch (logError: any) {
        console.error('[Manual Email] Failed to log error:', logError?.message || logError);
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: error?.message || "An unexpected error occurred" }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
});

// Helper function to build template-specific data
function buildTemplateData(template: string, producer: any, latestReport: any, customData: any = {}) {
  // Include company in producer display name
  const producerDisplayName = producer.company 
    ? `${producer.name} (${producer.company})`
    : producer.name;

  const baseData = {
    producerName: producerDisplayName,
    ...customData
  };

  // Build data based on template type
  switch (template) {
    case 'liability_notification': {
      const accusedName = producerDisplayName; 
      const amountOwed = producer.total_amount_owed || 0;
      const projectName = latestReport?.project_name || 'Unknown Project';

      const invoiceDate = latestReport?.invoice_date
        ? new Date(latestReport.invoice_date).toLocaleDateString()
        : 'Not specified';

      const daysOverdue = producer.oldest_debt_days || 0;

      const claimUrl = `${Deno.env.get('SUPABASE_URL')}/liability/claim/manual`;

      // Keep expirationDate for template compatibility
      const expirationDate = new Date().toLocaleDateString();

      return {
        accusedName,
        amountOwed,
        projectName,
        reportId: latestReport?.report_id || 'N/A',
        invoiceDate,
        daysOverdue,
        claimUrl,
        expirationDate
      };
    }

    case 'producer_report_notification':
      return {
        ...baseData,
        amount: producer.total_amount_owed || 0,
        projectName: latestReport?.project_name || 'Unknown Project',
        reportId: latestReport?.report_id || 'N/A',
        daysOverdue: producer.oldest_debt_days || 0,
        claimUrl: `${Deno.env.get('SUPABASE_URL')}/liability/claim/manual`
      };

    case 'producer_payment':
    case 'crew_report_payment_confirmed':
      return {
        ...baseData,
        amount: producer.total_amount_owed || 0,
        projectName: latestReport?.project_name || 'Unknown Project',
        reportId: latestReport?.report_id || 'N/A',
        paidDate: new Date().toLocaleDateString()
      };

    case 'liability_accepted':
      return {
        ...baseData,
        amount: producer.total_amount_owed || 0,
        projectName: latestReport?.project_name || 'Unknown Project',
        reportId: latestReport?.report_id || 'N/A',
        confirmedBy: producer.name
      };

    case 'liability_loop_detected':
      return {
        ...baseData,
        reportId: latestReport?.report_id || 'N/A',
        originalAccused: producer.name,
        claimUrl: `${Deno.env.get('SUPABASE_URL')}/liability/claim/manual`
      };

    case 'subscription_payment_failed':
      return {
        ...baseData,
        customerName: producer.name,
        tier: 'Producer Tier 1',
        gracePeriodEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString()
      };

    case 'subscription_canceled':
      return {
        ...baseData,
        customerName: producer.name,
        tier: 'Producer Tier 1',
        canceledDate: new Date().toLocaleDateString()
      };

    case 'crew_report_verified':
    case 'vendor_report_verified':
      return {
        ...baseData,
        fullName: producer.name,
        amount: producer.total_amount_owed || 0,
        reportId: latestReport?.report_id || 'N/A'
      };

    case 'crew_report_rejected':
    case 'vendor_report_rejected':
      return {
        ...baseData,
        fullName: producer.name,
        reason: 'Additional information required',
        reportId: latestReport?.report_id || 'N/A'
      };

    case 'dispute_evidence_round_started':
      return {
        ...baseData,
        reportId: latestReport?.report_id || 'N/A',
        round: 1,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
      };

    case 'dispute_additional_info_required':
      return {
        ...baseData,
        reportId: latestReport?.report_id || 'N/A',
        reason: 'Additional documentation needed'
      };

    case 'dispute_resolved_paid':
    case 'dispute_resolved_mutual':
    case 'dispute_closed_unresolved':
      return {
        ...baseData,
        reportId: latestReport?.report_id || 'N/A',
        amount: producer.total_amount_owed || 0,
        resolution: 'Manual admin resolution'
      };

    case 'welcome':
    case 'admin_created_account':
      return {
        ...baseData,
        email: producer.email,
        tempPassword: 'N/A'
      };

    case 'email_verification':
      return {
        ...baseData,
        verificationUrl: `${Deno.env.get('SUPABASE_URL')}/verify-email`
      };

    case 'password_reset':
      return {
        ...baseData,
        resetUrl: `${Deno.env.get('SUPABASE_URL')}/reset-password`
      };

    default:
      return baseData;
  }
}
