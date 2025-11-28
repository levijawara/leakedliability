import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const config = { verify_jwt: true };

interface RedirectRequest {
  reportId: string;          // The CR-XXXXXXXX format report ID
  originalName: string;      // Originally reported producer name
  originalEmail: string;     // Originally reported producer email
  newName: string;           // Newly accused producer name
  newEmail: string;          // Newly accused producer email
  reason?: string;           // Optional reason for redirect
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[admin-redirect-liability] Starting redirect operation');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
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
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('[admin-redirect-liability] Admin check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { reportId, originalName, originalEmail, newName, newEmail, reason } = await req.json() as RedirectRequest;

    console.log('[admin-redirect-liability] Redirect request:', {
      reportId,
      originalName,
      originalEmail,
      newName,
      newEmail
    });

    // Validate inputs
    if (!reportId || !originalName || !originalEmail || !newName || !newEmail) {
      throw new Error('Missing required fields');
    }

    // 1. Find the payment report by report_id (CR-XXXXXXXX format)
    const { data: report, error: reportError } = await supabase
      .from('payment_reports')
      .select('id, producer_id, status, report_id, current_liable_name, current_liable_email, is_in_liability_chain, liability_chain_length')
      .eq('report_id', reportId)
      .maybeSingle();

    if (reportError) {
      console.error('[admin-redirect-liability] Error finding report:', reportError);
      throw new Error(`Failed to find report: ${reportError.message}`);
    }

    if (!report) {
      throw new Error(`Report not found with ID: ${reportId}`);
    }

    console.log('[admin-redirect-liability] Found report:', report);

    // 2. Don't allow redirect on paid reports
    if (report.status === 'paid') {
      throw new Error('Cannot redirect liability on a paid/closed report');
    }

    // 3. Get original producer info
    const { data: originalProducer, error: origError } = await supabase
      .from('producers')
      .select('id, name, email, is_placeholder')
      .eq('id', report.producer_id)
      .single();

    if (origError || !originalProducer) {
      console.error('[admin-redirect-liability] Error finding original producer:', origError);
      throw new Error('Failed to find original producer');
    }

    console.log('[admin-redirect-liability] Original producer:', originalProducer);

    // 4. Ensure new producer exists (or create as placeholder)
    // First check by email (case-insensitive)
    let newProducerId: string | null = null;
    let newProducerCreated = false;

    const { data: byEmail, error: emailError } = await supabase
      .from('producers')
      .select('id, name, email')
      .ilike('email', newEmail.trim())
      .maybeSingle();

    if (!emailError && byEmail) {
      newProducerId = byEmail.id;
      console.log('[admin-redirect-liability] Found new producer by email:', byEmail);
    } else {
      // Check by name (case-insensitive)
      const { data: byName, error: nameError } = await supabase
        .from('producers')
        .select('id, name, email')
        .ilike('name', newName.trim())
        .maybeSingle();

      if (!nameError && byName) {
        newProducerId = byName.id;
        console.log('[admin-redirect-liability] Found new producer by name:', byName);
        
        // Update email if missing
        if (!byName.email && newEmail) {
          await supabase
            .from('producers')
            .update({ email: newEmail.toLowerCase().trim() })
            .eq('id', byName.id);
          console.log('[admin-redirect-liability] Updated producer email');
        }
      }
    }

    // If no existing producer found, create as placeholder
    if (!newProducerId) {
      console.log('[admin-redirect-liability] Creating new producer placeholder');
      const { data: created, error: createError } = await supabase
        .from('producers')
        .insert({
          name: newName.trim(),
          email: newEmail.toLowerCase().trim(),
          is_placeholder: true,
          has_claimed_account: false,
          verification_status: 'unverified',
          account_status: 'active',
          auto_created: true
        })
        .select('id')
        .single();

      if (createError || !created) {
        console.error('[admin-redirect-liability] Error creating producer:', createError);
        throw new Error(`Failed to create new producer: ${createError?.message}`);
      }

      newProducerId = created.id;
      newProducerCreated = true;
      console.log('[admin-redirect-liability] Created new producer:', newProducerId);
    }

    // 5. Update the payment report
    const newChainLength = (report.liability_chain_length || 0) + 1;
    
    const { error: updateError } = await supabase
      .from('payment_reports')
      .update({
        producer_id: newProducerId,
        current_liable_name: newName.trim(),
        current_liable_email: newEmail.toLowerCase().trim(),
        is_in_liability_chain: true,
        liability_chain_length: newChainLength
      })
      .eq('id', report.id);

    if (updateError) {
      console.error('[admin-redirect-liability] Error updating report:', updateError);
      throw new Error(`Failed to update report: ${updateError.message}`);
    }

    console.log('[admin-redirect-liability] Updated payment report');

    // 6. Add to liability_chain table
    const { error: chainError } = await supabase
      .from('liability_chain')
      .insert({
        report_id: report.id,
        accused_name: newName.trim(),
        accused_email: newEmail.toLowerCase().trim(),
        accused_role: 'producer',
        accuser_id: user.id
      });

    if (chainError) {
      console.error('[admin-redirect-liability] Error adding to liability_chain:', chainError);
      // Non-fatal, continue
    }

    // 7. Add to liability_history
    const { error: historyError } = await supabase
      .from('liability_history')
      .insert({
        report_id: report.id,
        action_type: 'admin_redirect',
        new_name: newName.trim(),
        new_email: newEmail.toLowerCase().trim(),
        previous_name: report.current_liable_name || originalProducer.name,
        previous_email: report.current_liable_email || originalProducer.email,
        triggered_by: user.id
      });

    if (historyError) {
      console.error('[admin-redirect-liability] Error adding to liability_history:', historyError);
      // Non-fatal, continue
    }

    // 8. Log to liability_redirects audit table
    const { error: redirectLogError } = await supabase
      .from('liability_redirects')
      .insert({
        report_id: report.id,
        original_report_id: reportId,
        from_producer_id: originalProducer.id,
        from_producer_name: originalProducer.name,
        from_producer_email: originalProducer.email,
        to_producer_id: newProducerId,
        to_producer_name: newName.trim(),
        to_producer_email: newEmail.toLowerCase().trim(),
        performed_by: user.id,
        reason: reason || null
      });

    if (redirectLogError) {
      console.error('[admin-redirect-liability] Error logging redirect:', redirectLogError);
      // Non-fatal, continue
    }

    // 9. Recalculate PSCS for both producers
    console.log('[admin-redirect-liability] Recalculating PSCS scores');
    
    await supabase.rpc('calculate_pscs_score', {
      producer_uuid: originalProducer.id
    });
    
    await supabase.rpc('calculate_pscs_score', {
      producer_uuid: newProducerId
    });

    // 10. Check if original producer has any remaining reports
    const { data: remainingReports, error: remainingError } = await supabase
      .from('payment_reports')
      .select('id')
      .eq('producer_id', originalProducer.id);

    let originalProducerStatus = 'still_active';
    const remainingCount = remainingReports?.length || 0;

    if (remainingCount === 0) {
      // Convert to placeholder - they'll fall off the leaderboard
      const { error: placeholderError } = await supabase
        .from('producers')
        .update({
          is_placeholder: true,
          total_amount_owed: 0,
          total_crew_owed: 0,
          total_vendors_owed: 0,
          total_jobs_owed: 0,
          total_cities_owed: 0,
          oldest_debt_date: null,
          oldest_debt_days: 0
        })
        .eq('id', originalProducer.id);

      if (!placeholderError) {
        originalProducerStatus = 'converted_to_placeholder';
        console.log('[admin-redirect-liability] Converted original producer to placeholder');
      }
    }

    // 11. Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      event_type: 'liability_redirect',
      payload: {
        report_id: reportId,
        report_uuid: report.id,
        from_producer_id: originalProducer.id,
        from_producer_name: originalProducer.name,
        to_producer_id: newProducerId,
        to_producer_name: newName,
        new_producer_created: newProducerCreated,
        original_producer_status: originalProducerStatus,
        remaining_reports: remainingCount
      }
    });

    console.log('[admin-redirect-liability] Redirect completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Liability redirected from "${originalProducer.name}" to "${newName}"`,
        details: {
          reportId,
          fromProducer: {
            id: originalProducer.id,
            name: originalProducer.name,
            status: originalProducerStatus,
            remainingReports: remainingCount
          },
          toProducer: {
            id: newProducerId,
            name: newName,
            created: newProducerCreated
          },
          chainLength: newChainLength
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[admin-redirect-liability] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
