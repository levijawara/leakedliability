import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[BACKFILL] Starting backfill process');

    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client for auth check
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (roleError || !isAdmin) {
      console.error('[BACKFILL] Role check failed:', roleError);
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for backfill operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get all admin-created payment reports
    const { data: adminReports, error: reportsError } = await supabaseAdmin
      .from('payment_reports')
      .select('id, reporter_id, reporter_type, project_name, producer_id, amount_owed, city, report_id, created_at')
      .eq('created_by_admin', true);

    if (reportsError) {
      console.error('[BACKFILL] Error fetching admin reports:', reportsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch reports' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const found = adminReports?.length || 0;
    console.log(`[BACKFILL] Found ${found} admin-created reports`);

    if (found === 0) {
      return new Response(JSON.stringify({ found: 0, already_present: 0, inserted: 0, skipped: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get existing submissions for these report_ids
    const reportIds = adminReports.map(r => r.report_id).filter(Boolean);
    const { data: existingSubmissions } = await supabaseAdmin
      .from('submissions')
      .select('report_id')
      .in('report_id', reportIds);

    const existingReportIds = new Set(existingSubmissions?.map(s => s.report_id) || []);
    console.log(`[BACKFILL] Found ${existingReportIds.size} existing submissions`);

    // 3. Filter to reports that need backfilling
    const toBackfill = adminReports.filter(r => !r.report_id || !existingReportIds.has(r.report_id));
    console.log(`[BACKFILL] Need to backfill ${toBackfill.length} reports`);

    if (toBackfill.length === 0) {
      return new Response(JSON.stringify({ 
        found, 
        already_present: found, 
        inserted: 0, 
        skipped: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Fetch profiles and producers for the reports
    const reporterIds = [...new Set(toBackfill.map(r => r.reporter_id))];
    const producerIds = [...new Set(toBackfill.map(r => r.producer_id))];

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, legal_first_name, legal_last_name, email')
      .in('user_id', reporterIds);

    const { data: producers } = await supabaseAdmin
      .from('producers')
      .select('id, name')
      .in('id', producerIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    const producerMap = new Map(producers?.map(p => [p.id, p]) || []);

    // 5. Build submission records
    const submissionsToInsert = toBackfill.map(report => {
      const profile = profileMap.get(report.reporter_id);
      const producer = producerMap.get(report.producer_id);

      return {
        user_id: report.reporter_id,
        submission_type: report.reporter_type === 'vendor' ? 'vendor_report' : 'crew_report',
        full_name: profile 
          ? `${profile.legal_first_name} ${profile.legal_last_name}`
          : 'Unknown',
        email: profile?.email || null,
        form_data: {
          projectName: report.project_name,
          producerName: producer?.name || '',
          amountOwed: report.amount_owed,
          city: report.city || '',
          report_id: report.report_id || null,
        },
        status: 'verified',
        verified: true,
        admin_notes: 'Backfilled from admin-created payment report',
        report_id: report.report_id || null,
        created_at: report.created_at,
        updated_at: new Date().toISOString(),
      };
    });

    // 6. Insert in batches
    const BATCH_SIZE = 100;
    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < submissionsToInsert.length; i += BATCH_SIZE) {
      const batch = submissionsToInsert.slice(i, i + BATCH_SIZE);
      console.log(`[BACKFILL] Inserting batch ${Math.floor(i / BATCH_SIZE) + 1}, size: ${batch.length}`);

      const { error: insertError } = await supabaseAdmin
        .from('submissions')
        .insert(batch);

      if (insertError) {
        console.error('[BACKFILL] Batch insert error:', insertError);
        skipped += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    console.log(`[BACKFILL] Complete - inserted: ${inserted}, skipped: ${skipped}`);

    // 7. Log to audit_logs
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      event_type: 'backfill_missing_submissions',
      payload: {
        found,
        already_present: existingReportIds.size,
        inserted,
        skipped,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(JSON.stringify({ 
      found, 
      already_present: existingReportIds.size, 
      to_insert: toBackfill.length,
      inserted, 
      skipped 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[BACKFILL] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

export const config = { verify_jwt: true };
