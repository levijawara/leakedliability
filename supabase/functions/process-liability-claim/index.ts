import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessClaimRequest {
  token: string;
  action: 'accept' | 'dispute' | 'redirect';
  redirect_to?: {
    name: string;
    email: string;
    role: string;
    affirmation: boolean;
  };
  dispute_reason?: string;
  user_ip?: string;
}

const logStep = (step: string, data?: any) => {
  console.log(`[process-liability-claim] ${step}`, data || '');
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting liability claim processing');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { token, action, redirect_to, dispute_reason, user_ip }: ProcessClaimRequest = await req.json();
    
    logStep('Request payload', { token, action });
    
    if (!token || !action) {
      throw new Error('Missing required fields: token, action');
    }
    
    // Validate and fetch token
    logStep('Validating token');
    const { data: tokenData, error: tokenError } = await supabase
      .from('liability_claim_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (tokenError || !tokenData) {
      logStep('Invalid or expired token', tokenError);
      throw new Error('Invalid or expired token');
    }
    
    logStep('Token validated', { report_id: tokenData.report_id });
    
    // Fetch report details
    const { data: report, error: reportError } = await supabase
      .from('payment_reports')
      .select('*')
      .eq('id', tokenData.report_id)
      .single();
    
    if (reportError || !report) {
      throw new Error(`Failed to fetch report: ${reportError?.message}`);
    }
    
    // Get current liability chain entry
    const { data: chainEntry } = await supabase
      .from('liability_chain')
      .select('*')
      .eq('report_id', tokenData.report_id)
      .eq('accused_email', tokenData.accused_email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    // Process based on action
    if (action === 'accept') {
      logStep('Processing ACCEPT action');
      
      // Update liability chain
      if (chainEntry) {
        await supabase
          .from('liability_chain')
          .update({
            accused_response: 'accepted',
            response_at: new Date().toISOString(),
          })
          .eq('id', chainEntry.id);
      }
      
      // Update payment report status
      await supabase
        .from('payment_reports')
        .update({
          status: 'pending', // Still pending payment, but liability accepted
        })
        .eq('id', tokenData.report_id);
      
      // Log to history
      await supabase
        .from('liability_history')
        .insert({
          report_id: tokenData.report_id,
          new_name: tokenData.accused_email,
          new_email: tokenData.accused_email,
          action_type: 'accepted_responsibility',
        });
      
      // Mark token as used
      await supabase
        .from('liability_claim_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id);
      
      logStep('Accept action completed');
      
      return new Response(
        JSON.stringify({ success: true, action: 'accepted' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
      
    } else if (action === 'dispute') {
      logStep('Processing DISPUTE action');
      
      if (!dispute_reason) {
        throw new Error('Dispute reason is required');
      }
      
      // Update liability chain
      if (chainEntry) {
        await supabase
          .from('liability_chain')
          .update({
            accused_response: 'disputed',
            response_at: new Date().toISOString(),
          })
          .eq('id', chainEntry.id);
      }
      
      // Create dispute entry
      await supabase
        .from('disputes')
        .insert({
          payment_report_id: tokenData.report_id,
          disputer_id: null, // Anonymous dispute via email
          dispute_type: 'liability_chain',
          explanation: dispute_reason,
        });
      
      // Log to history
      await supabase
        .from('liability_history')
        .insert({
          report_id: tokenData.report_id,
          new_name: tokenData.accused_email,
          new_email: tokenData.accused_email,
          action_type: 'dispute_filed',
          affirmation_text: dispute_reason,
        });
      
      // Mark token as used
      await supabase
        .from('liability_claim_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id);
      
      logStep('Dispute action completed');
      
      return new Response(
        JSON.stringify({ success: true, action: 'disputed' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
      
    } else if (action === 'redirect') {
      logStep('Processing REDIRECT action');
      
      if (!redirect_to || !redirect_to.name || !redirect_to.email || !redirect_to.role || !redirect_to.affirmation) {
        throw new Error('Redirect requires: name, email, role, and affirmation');
      }
      
      // Check if this creates a loop
      logStep('Checking for liability loop');
      const { data: existingChain } = await supabase
        .from('liability_chain')
        .select('*')
        .eq('report_id', tokenData.report_id)
        .eq('accused_email', redirect_to.email);
      
      if (existingChain && existingChain.length > 0) {
        logStep('LOOP DETECTED - redirecting back to someone already in chain');
        
        // Get original entry
        const { data: originalEntry } = await supabase
          .from('liability_chain')
          .select('*')
          .eq('report_id', tokenData.report_id)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        
        if (originalEntry) {
          // Revert to original accused party
          await supabase
            .from('payment_reports')
            .update({
              current_liable_name: originalEntry.accused_name,
              current_liable_email: originalEntry.accused_email,
              liability_loop_detected: true,
            })
            .eq('id', tokenData.report_id);
          
          // Log loop detection
          await supabase
            .from('liability_history')
            .insert({
              report_id: tokenData.report_id,
              previous_name: tokenData.accused_email,
              previous_email: tokenData.accused_email,
              new_name: originalEntry.accused_name,
              new_email: originalEntry.accused_email,
              action_type: 'loop_detected',
            });
          
          // Send loop detection emails
          await supabase.functions.invoke('send-email', {
            body: {
              to: originalEntry.accused_email,
              subject: `Liability Loop Detected - Report #${report.report_id}`,
              template: 'liability_loop_detected',
              data: {
                reportId: report.report_id,
                originalName: originalEntry.accused_name,
                amountOwed: report.amount_owed,
                projectName: report.project_name,
              },
            },
          });
        }
        
        // Mark token as used
        await supabase
          .from('liability_claim_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('id', tokenData.id);
        
        return new Response(
          JSON.stringify({ success: true, action: 'loop_detected', reverted_to: originalEntry?.accused_name }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // No loop - proceed with redirect
      logStep('No loop detected, proceeding with redirect');
      
      // Update current liability chain entry
      if (chainEntry) {
        await supabase
          .from('liability_chain')
          .update({
            accused_response: 'redirected',
            response_at: new Date().toISOString(),
          })
          .eq('id', chainEntry.id);
      }
      
      // Mark token as used
      await supabase
        .from('liability_claim_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id);
      
      // Send new liability notification to redirected party
      logStep('Sending notification to new accused party');
      const { data: notificationResult, error: notificationError } = await supabase.functions.invoke(
        'send-liability-notification',
        {
          body: {
            report_id: tokenData.report_id,
            accused_name: redirect_to.name,
            accused_email: redirect_to.email,
            accused_role: redirect_to.role,
            accuser_id: null, // Anonymous via email
          },
        }
      );
      
      if (notificationError) {
        logStep('Error sending notification', notificationError);
        throw new Error(`Failed to send notification: ${notificationError.message}`);
      }
      
      logStep('Redirect completed successfully');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'redirected',
          redirected_to: redirect_to.email,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    throw new Error('Invalid action');
    
  } catch (error: any) {
    logStep('Error in process-liability-claim', error);
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
