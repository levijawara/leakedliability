import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LiabilityNotificationRequest {
  report_id: string;
  accused_name: string;
  accused_email: string;
  accused_role: string;
  accuser_id?: string;
}

const logStep = (step: string, data?: any) => {
  console.log(`[send-liability-notification] ${step}`, data || '');
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting liability notification process');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { report_id, accused_name, accused_email, accused_role, accuser_id }: LiabilityNotificationRequest = await req.json();
    
    logStep('Request payload', { report_id, accused_email, accused_role });
    
    if (!report_id || !accused_name || !accused_email || !accused_role) {
      throw new Error('Missing required fields: report_id, accused_name, accused_email, accused_role');
    }
    
    // Fetch payment report details
    logStep('Fetching payment report details');
    const { data: report, error: reportError } = await supabase
      .from('payment_reports')
      .select(`
        id,
        report_id,
        amount_owed,
        days_overdue,
        invoice_date,
        project_name,
        status,
        producer_id,
        producer_email,
        producers!inner(name, company, email)
      `)
      .eq('id', report_id)
      .single();
    
    if (reportError || !report) {
      logStep('Error fetching report', reportError);
      throw new Error(`Failed to fetch report: ${reportError?.message}`);
    }
    
    logStep('Report fetched', report);
    
    // Generate unique token
    logStep('Generating liability claim token');
    const { data: tokenData, error: tokenError } = await supabase
      .from('liability_claim_tokens')
      .insert({
        report_id: report_id,
        accused_email: accused_email,
      })
      .select()
      .single();
    
    if (tokenError || !tokenData) {
      logStep('Error creating token', tokenError);
      throw new Error(`Failed to create token: ${tokenError?.message}`);
    }
    
    logStep('Token created', { token: tokenData.token });
    
    // Generate escrow payment session
    logStep('Creating escrow payment record');
    
    // Look up or create producer by accused_email
    const { data: producer, error: producerError } = await supabase
      .from('producers')
      .upsert(
        { 
          email: accused_email, 
          name: accused_name,
          verification_status: 'unverified',
          auto_created: true 
        },
        { onConflict: 'email', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (producerError) {
      logStep('Error upserting producer', producerError);
      throw new Error(`Failed to upsert producer: ${producerError.message}`);
    }

    // Generate unique 12-character payment code
    const generatePaymentCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 12; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let paymentCode = generatePaymentCode();
    let codeExists = true;
    let attempts = 0;

    // Ensure payment code is unique (max 5 attempts)
    while (codeExists && attempts < 5) {
      const { data: existing } = await supabase
        .from('escrow_payments')
        .select('id')
        .eq('payment_code', paymentCode)
        .single();
      
      if (!existing) {
        codeExists = false;
      } else {
        paymentCode = generatePaymentCode();
        attempts++;
      }
    }

    // Insert escrow payment record
    const { data: escrowPayment, error: escrowError } = await supabase
      .from('escrow_payments')
      .insert({
        producer_id: producer.id,
        crew_member_id: producer.id, // Placeholder
        payment_report_id: report_id,
        amount_due: report.amount_owed,
        status: 'pending',
        payment_code: paymentCode,
        metadata: {
          accused_name: accused_name,
          accused_email: accused_email,
          accused_role: accused_role,
          project_name: report.project_name,
          report_id: report.report_id,
          liability_token: tokenData.token,
          created_via: 'liability_notification'
        }
      })
      .select()
      .single();

    if (escrowError) {
      logStep('Error creating escrow payment', escrowError);
      // Don't throw - escrow is optional, liability notification should still work
      console.error('Failed to create escrow payment, continuing without it', escrowError);
    }

    logStep('Escrow payment created', { payment_code: paymentCode });
    
    // Build claim URL with proper domain
    const publicUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://leakedliability.com";
    const claimUrl = `${publicUrl}/liability/claim/${tokenData.token}`;
    const paymentUrl = escrowPayment ? `${publicUrl}/pay/${paymentCode}` : null;
    
    // Create liability chain entry
    logStep('Creating liability chain entry');
    const { error: chainError } = await supabase
      .from('liability_chain')
      .insert({
        report_id: report_id,
        accuser_id: accuser_id || null,
        accused_name: accused_name,
        accused_email: accused_email,
        accused_role: accused_role,
        accused_response: 'pending',
      });
    
    if (chainError) {
      logStep('Error creating liability chain entry', chainError);
      throw new Error(`Failed to create liability chain: ${chainError.message}`);
    }
    
    // Update payment report with current liable party
    logStep('Updating payment report');
    const { error: updateError } = await supabase
      .from('payment_reports')
      .update({
        current_liable_name: accused_name,
        current_liable_email: accused_email,
        is_in_liability_chain: true,
      })
      .eq('id', report_id);
    
    if (updateError) {
      logStep('Error updating payment report', updateError);
      throw new Error(`Failed to update report: ${updateError.message}`);
    }
    
    // Log to liability history
    logStep('Logging to liability history');
    const { error: historyError } = await supabase
      .from('liability_history')
      .insert({
        report_id: report_id,
        new_name: accused_name,
        new_email: accused_email,
        triggered_by: accuser_id || null,
        action_type: accuser_id ? 'liability_redirect' : 'initial_report',
      });
    
    if (historyError) {
      logStep('Error logging history', historyError);
      // Don't throw - history is non-critical
    }
    
    // Send email via send-email function
    logStep('Sending liability notification email');
    const expirationDate = new Date(tokenData.expires_at).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    
    // Determine target email with fallback
    const reportEmail = (report as any).producer_email;
    const producerEmail = (report as any).producers?.email;
    const targetEmail = accused_email || reportEmail || producerEmail;

    if (!targetEmail) {
      logStep('ERROR: No email available for liability notification', { report_id });
      throw new Error('No email address available for accused party');
    }

    logStep('Sending to email', { 
      to: targetEmail, 
      source: accused_email ? 'accused' : reportEmail ? 'report' : 'producer' 
    });
    
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: targetEmail,
        subject: `You've Been Named as Responsible Party - Report #${report.report_id}`,
        template: 'liability_notification',
        data: {
          reportId: report.report_id,
          amountOwed: report.amount_owed,
          projectName: report.project_name,
          invoiceDate: new Date(report.invoice_date).toLocaleDateString(),
          daysOverdue: report.days_overdue,
          claimUrl,
          expirationDate,
          accusedName: accused_name,
          paymentUrl: paymentUrl,
          paymentCode: escrowPayment ? paymentCode : null,
        },
      },
    });
    
    if (emailError) {
      logStep('Error sending email', emailError);
      // Log but don't throw - notification was created
      console.error('Failed to send email, but notification was created', emailError);
    }
    
    logStep('Liability notification sent successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        token: tokenData.token,
        claim_url: claimUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    logStep('Error in send-liability-notification', error);
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
