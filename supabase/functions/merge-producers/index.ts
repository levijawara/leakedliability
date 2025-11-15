import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const config = { verify_jwt: true };

interface MergeRequest {
  primary_producer_id: string;
  duplicate_producer_ids: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[merge-producers] Starting merge operation');

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
      console.error('[merge-producers] Admin check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { primary_producer_id, duplicate_producer_ids } = await req.json() as MergeRequest;

    console.log('[merge-producers] Merging:', {
      primary: primary_producer_id,
      duplicates: duplicate_producer_ids
    });

    // Validate inputs
    if (!primary_producer_id || !duplicate_producer_ids || duplicate_producer_ids.length === 0) {
      throw new Error('Invalid merge request - missing producer IDs');
    }

    // Prevent merging producer with itself
    if (duplicate_producer_ids.includes(primary_producer_id)) {
      throw new Error('Cannot merge a producer with itself');
    }

    const results = {
      payment_reports: 0,
      producer_account_links: 0,
      producer_self_reports: 0,
      producer_subscriptions: 0,
      past_debts: 0,
      search_logs: 0,
      payment_confirmations: 0,
      errors: [] as string[]
    };

    // Process each duplicate producer
    for (const duplicate_id of duplicate_producer_ids) {
      console.log(`[merge-producers] Processing duplicate: ${duplicate_id}`);

      // 1. Update payment_reports
      const { error: reportsError, count: reportsCount } = await supabase
        .from('payment_reports')
        .update({ producer_id: primary_producer_id })
        .eq('producer_id', duplicate_id)
        .select();

      if (reportsError) {
        console.error('[merge-producers] Error updating payment_reports:', reportsError);
        results.errors.push(`Payment reports error: ${reportsError.message}`);
      } else {
        results.payment_reports += reportsCount || 0;
      }

      // 2. Handle producer_account_links (merge, avoiding duplicates)
      const { data: existingLinks, error: linksQueryError } = await supabase
        .from('producer_account_links')
        .select('user_id, association_type, id')
        .eq('producer_id', duplicate_id);

      if (linksQueryError) {
        console.error('[merge-producers] Error querying links:', linksQueryError);
        results.errors.push(`Links query error: ${linksQueryError.message}`);
      } else if (existingLinks) {
        for (const link of existingLinks) {
          // Check if link already exists for primary producer
          const { data: existing, error: checkError } = await supabase
            .from('producer_account_links')
            .select('id')
            .eq('producer_id', primary_producer_id)
            .eq('user_id', link.user_id)
            .maybeSingle();

          if (checkError) {
            console.error('[merge-producers] Error checking existing link:', checkError);
            continue;
          }

          if (!existing) {
            // No conflict, update to primary
            const { error: updateError } = await supabase
              .from('producer_account_links')
              .update({ producer_id: primary_producer_id })
              .eq('id', link.id);

            if (!updateError) {
              results.producer_account_links++;
            }
          } else {
            // Conflict exists, delete duplicate link
            await supabase
              .from('producer_account_links')
              .delete()
              .eq('id', link.id);

            results.producer_account_links++; // Count as merged (kept existing)
          }
        }
      }

      // 3. Update producer_self_reports
      const { error: selfReportsError, count: selfReportsCount } = await supabase
        .from('producer_self_reports')
        .update({ producer_id: primary_producer_id })
        .eq('producer_id', duplicate_id)
        .select();

      if (selfReportsError) {
        console.error('[merge-producers] Error updating self reports:', selfReportsError);
        results.errors.push(`Self reports error: ${selfReportsError.message}`);
      } else {
        results.producer_self_reports += selfReportsCount || 0;
      }

      // 4. Update producer_subscriptions (with warning if exists)
      const { data: subscriptions, error: subsQueryError } = await supabase
        .from('producer_subscriptions')
        .select('id')
        .eq('producer_id', duplicate_id);

      if (subsQueryError) {
        console.error('[merge-producers] Error querying subscriptions:', subsQueryError);
        results.errors.push(`Subscriptions query error: ${subsQueryError.message}`);
      } else if (subscriptions && subscriptions.length > 0) {
        results.errors.push(`Producer ${duplicate_id} has ${subscriptions.length} active subscription(s) - transferred but may need manual review`);
        
        const { error: subsUpdateError, count: subsCount } = await supabase
          .from('producer_subscriptions')
          .update({ producer_id: primary_producer_id })
          .eq('producer_id', duplicate_id)
          .select();

        if (!subsUpdateError) {
          results.producer_subscriptions += subsCount || 0;
        }
      }

      // 5. Update past_debts
      const { error: pastDebtsError, count: pastDebtsCount } = await supabase
        .from('past_debts')
        .update({ producer_id: primary_producer_id })
        .eq('producer_id', duplicate_id)
        .select();

      if (pastDebtsError) {
        console.error('[merge-producers] Error updating past debts:', pastDebtsError);
        results.errors.push(`Past debts error: ${pastDebtsError.message}`);
      } else {
        results.past_debts += pastDebtsCount || 0;
      }

      // 6. Update search_logs
      const { error: searchLogsError, count: searchLogsCount } = await supabase
        .from('search_logs')
        .update({ matched_producer_id: primary_producer_id })
        .eq('matched_producer_id', duplicate_id)
        .select();

      if (searchLogsError) {
        console.error('[merge-producers] Error updating search logs:', searchLogsError);
        results.errors.push(`Search logs error: ${searchLogsError.message}`);
      } else {
        results.search_logs += searchLogsCount || 0;
      }

      // 7. Update payment_confirmations
      const { error: confirmationsError, count: confirmationsCount } = await supabase
        .from('payment_confirmations')
        .update({ producer_id: primary_producer_id })
        .eq('producer_id', duplicate_id)
        .select();

      if (confirmationsError) {
        console.error('[merge-producers] Error updating confirmations:', confirmationsError);
        results.errors.push(`Confirmations error: ${confirmationsError.message}`);
      } else {
        results.payment_confirmations += confirmationsCount || 0;
      }

      // 8. Delete the duplicate producer record
      const { error: deleteError } = await supabase
        .from('producers')
        .delete()
        .eq('id', duplicate_id);

      if (deleteError) {
        console.error('[merge-producers] Error deleting duplicate producer:', deleteError);
        results.errors.push(`Failed to delete producer ${duplicate_id}: ${deleteError.message}`);
      } else {
        console.log(`[merge-producers] Deleted duplicate producer: ${duplicate_id}`);
      }
    }

    // 9. Recalculate PSCS for primary producer
    console.log('[merge-producers] Recalculating PSCS score');
    const { error: pscsError } = await supabase.rpc('calculate_pscs_score', {
      producer_uuid: primary_producer_id
    });

    if (pscsError) {
      console.error('[merge-producers] Error calculating PSCS:', pscsError);
      results.errors.push(`PSCS calculation error: ${pscsError.message}`);
    }

    // 10. Trigger full stats update
    console.log('[merge-producers] Updating producer stats');
    const { error: statsError } = await supabase
      .from('payment_reports')
      .select('id')
      .eq('producer_id', primary_producer_id)
      .limit(1)
      .maybeSingle();

    if (statsError) {
      console.error('[merge-producers] Error triggering stats update:', statsError);
      results.errors.push(`Stats update error: ${statsError.message}`);
    }

    // 11. Log the merge action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      event_type: 'merge_producers',
      payload: {
        primary_producer_id,
        duplicate_producer_ids,
        results
      }
    });

    console.log('[merge-producers] Merge completed successfully:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[merge-producers] Error:', error);
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
