import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

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
  custom_data?: any;
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

    const { template, producer_id, admin_id, manual_email, custom_data }: ManualEmailRequest = await req.json();

    console.log('[Manual Email] Request:', { template, producer_id, admin_id });

    // Fetch producer data
    const { data: producer, error: producerError } = await supabase
      .from('producers')
      .select('id, name, email, company, pscs_score, total_amount_owed')
      .eq('id', producer_id)
      .single();

    if (producerError || !producer) {
      throw new Error('Producer not found');
    }

    // Prioritize manual email over producer email
    const finalEmail = manual_email?.trim() || producer.email;
    
    if (!finalEmail) {
      throw new Error('No email address provided. Please enter one manually.');
    }

    console.log('[Manual Email] Producer found:', producer.name, producer.email);

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

    // Call send-email function with manual origin flag
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        type: template,
        to: finalEmail,
        data: templateData,
        origin: 'manual_admin'
      }
    });

    if (emailError) {
      throw emailError;
    }

    console.log('[Manual Email] Email sent successfully');

    // Log to manual_email_logs table
    const { error: logError } = await supabase
      .from('manual_email_logs')
      .insert({
        admin_id: admin_id,
        producer_id: producer_id,
        template_key: template,
        producer_email: finalEmail,
        status: 'success',
        metadata: { 
          producer_name: producer.name,
          used_manual_email: !!manual_email,
          manual_email_value: manual_email || null,
          template_data: templateData
        }
      });

    if (logError) {
      console.error('[Manual Email] Failed to log email:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email sent to ${producer.name} (${finalEmail})` 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error('[Manual Email] Error:', error);

    // Try to log failure
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const body = await req.json();
      await supabase.from('manual_email_logs').insert({
        admin_id: body.admin_id,
        producer_id: body.producer_id,
        template_key: body.template,
        producer_email: 'unknown',
        status: 'failed',
        error_message: error.message
      });
    } catch (logError) {
      console.error('[Manual Email] Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
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
    case 'liability_notification':
      return {
        ...baseData,
        amount: latestReport?.amount_owed || 0,
        projectName: latestReport?.project_name || 'Unknown Project',
        reportId: latestReport?.report_id || 'N/A',
        claimUrl: `${Deno.env.get('SUPABASE_URL')}/liability/claim/manual`,
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
      };

    case 'producer_report_notification':
      return {
        ...baseData,
        amount: latestReport?.amount_owed || 0,
        projectName: latestReport?.project_name || 'Unknown Project',
        reportId: latestReport?.report_id || 'N/A',
        daysOverdue: latestReport?.days_overdue || 0,
        claimUrl: `${Deno.env.get('SUPABASE_URL')}/liability/claim/manual`
      };

    case 'producer_payment':
    case 'crew_report_payment_confirmed':
      return {
        ...baseData,
        amount: latestReport?.amount_owed || 0,
        projectName: latestReport?.project_name || 'Unknown Project',
        reportId: latestReport?.report_id || 'N/A',
        paidDate: new Date().toLocaleDateString()
      };

    case 'liability_accepted':
      return {
        ...baseData,
        amount: latestReport?.amount_owed || 0,
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
        amount: latestReport?.amount_owed || 0,
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
        amount: latestReport?.amount_owed || 0,
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
