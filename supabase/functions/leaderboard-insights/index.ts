import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export const config = { verify_jwt: true };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[leaderboard-insights] Generating insights for admin:', user.id);

    const { data: producers, error: producersError } = await supabase.from('producers').select('*');
    const { data: reports, error: reportsError } = await supabase.from('payment_reports').select('*');
    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, user_id, legal_first_name, legal_last_name, email, account_type, business_name');

    console.log('[leaderboard-insights] Producers:', producers?.length, 'Error:', producersError);
    console.log('[leaderboard-insights] Reports:', reports?.length, 'Error:', reportsError);
    console.log('[leaderboard-insights] Profiles:', profiles?.length, 'Error:', profilesError);

    if (reportsError) {
      console.error('[leaderboard-insights] Reports query error:', reportsError);
    }
    if (producersError) {
      console.error('[leaderboard-insights] Producers query error:', producersError);
    }
    if (profilesError) {
      console.error('[leaderboard-insights] Profiles query error:', profilesError);
    }

    // Split profiles by account type
    const crewProfiles = profiles?.filter(p => p.account_type === 'crew') || [];
    const vendorProfiles = profiles?.filter(p => p.account_type === 'vendor') || [];
    const producerProfiles = profiles?.filter(p => p.account_type === 'producer') || [];
    const companyProfiles = profiles?.filter(p => p.account_type === 'production_company') || [];

    // Calculate user statistics
    const crewCount = crewProfiles.length;
    const vendorCount = vendorProfiles.length;
    const producerCount = producerProfiles.length;
    const companyCount = companyProfiles.length;
    const totalUsers = crewCount + vendorCount + producerCount + companyCount;

    // Get crew role data from submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('user_id, role_department')
      .eq('submission_type', 'crew_report')
      .not('role_department', 'is', null);

    if (submissionsError) {
      console.error('[leaderboard-insights] Submissions query error:', submissionsError);
    }

    // Build map of user_id -> most common role
    const roleMap = new Map<string, string>();

    if (submissions && submissions.length > 0) {
      const userRoleCounts = new Map<string, Map<string, number>>();
      
      for (const sub of submissions) {
        if (!sub.user_id || !sub.role_department) continue;
        
        if (!userRoleCounts.has(sub.user_id)) {
          userRoleCounts.set(sub.user_id, new Map());
        }
        
        const roleCounts = userRoleCounts.get(sub.user_id)!;
        roleCounts.set(sub.role_department, (roleCounts.get(sub.role_department) || 0) + 1);
      }
      
      for (const [userId, roleCounts] of userRoleCounts.entries()) {
        let mostCommonRole = '';
        let maxCount = 0;
        
        for (const [role, count] of roleCounts.entries()) {
          if (count > maxCount) {
            mostCommonRole = role;
            maxCount = count;
          }
        }
        
        if (mostCommonRole) {
          roleMap.set(userId, mostCommonRole);
        }
      }
    }

    // Format user lists with names and emails
    const crewMembersWithRole = crewProfiles.map(c => ({
      id: c.id,
      user_id: c.user_id,
      full_name: `${c.legal_first_name} ${c.legal_last_name}`,
      email: c.email || 'No email',
      most_common_role: roleMap.get(c.user_id) || null
    }));

    const vendorsFormatted = vendorProfiles.map(v => ({
      id: v.id,
      full_name: `${v.legal_first_name} ${v.legal_last_name}`,
      email: v.email || 'No email',
      business_name: v.business_name
    }));

    const producersFormatted = producerProfiles.map(p => ({
      id: p.id,
      full_name: `${p.legal_first_name} ${p.legal_last_name}`,
      email: p.email || 'No email',
      business_name: p.business_name
    }));

    const companiesFormatted = companyProfiles.map(c => ({
      id: c.id,
      full_name: `${c.legal_first_name} ${c.legal_last_name}`,
      email: c.email || 'No email',
      business_name: c.business_name
    }));

    const totalProducers = producers?.length || 0;
    const totalReports = reports?.length || 0;
    const verifiedReports = reports?.filter(r => r.verified).length || 0;
    const pendingReports = reports?.filter(r => r.status === 'pending').length || 0;
    const paidReports = reports?.filter(r => r.status === 'paid').length || 0;
    
    // Total debt EVER reported (all reports regardless of status)
    const totalDebtEver = reports?.reduce((sum, r) => sum + (r.amount_owed || 0), 0) || 0;
    
    // Total OPEN/CURRENT debt (unpaid reports only)
    const totalOpenDebt = reports?.reduce((sum, r) => 
      r.status !== 'paid' ? sum + (r.amount_owed || 0) : sum, 0) || 0;
    
    // Count distinct producers who have reports
    const distinctProducersWithReports = reports 
      ? new Set(reports.filter(r => r.producer_id).map(r => r.producer_id)).size 
      : 0;
    
    // Calculate average using TOTAL DEBT EVER (not open debt)
    const averageDebt = distinctProducersWithReports > 0 
      ? totalDebtEver / distinctProducersWithReports 
      : 0;

    console.log('[leaderboard-insights] Calculated totals:');
    console.log('  - Total Debt Ever:', totalDebtEver);
    console.log('  - Total Open Debt:', totalOpenDebt);
    console.log('  - Distinct Producers with Reports:', distinctProducersWithReports);
    console.log('  - Average Debt:', averageDebt);
    console.log('  - Total Reports:', totalReports);
    console.log('  - Verified Reports:', verifiedReports);

    //--------------------------------------------------------------
    // PRODUCER ACCOUNT SEGMENTATION LOGIC
    // This block cleanly separates non-registered vs registered
    // producers based on explicit rules:
    //
    // Non-Registered Producers =
    //   - producers created automatically from reports
    //   - stored in `producers` table
    //   - but whose email does NOT belong to any `profile` with
    //     account_type = 'producer'
    //
    // Registered Producers =
    //   - actual logged-in humans
    //   - profiles table, account_type = 'producer'
    //   - whether linked or not, they go into the "registered" carousel
    //
    // We then attempt to connect registered profiles to their producer
    // records using:
    //   1. explicit link table (authoritative)
    //   2. email match (fallback)
    //--------------------------------------------------------------

    // 1. Fetch ALL producers that exist in leaderboard
    const { data: allProducers, error: allProducersError } = await supabase
      .from('producers')
      .select(`
        id,
        name,
        email,
        pscs_score,
        payment_reports(amount_owed, status, producer_email)
      `);

    if (allProducersError) console.error('Producer fetch error:', allProducersError);

    // 2. Fetch ALL registered producer profiles (already fetched above as producerProfiles)
    // Using existing producerProfiles variable

    // 3. Fetch explicit account links (ground truth binding)
    const { data: links, error: linksError } = await supabase
      .from('producer_account_links')
      .select('user_id, producer_id');

    if (linksError) console.error('Producer links error:', linksError);

    const linkMap = new Map(links?.map(l => [l.user_id, l.producer_id]) || []);

    // Helper to compute total + open debt
    function computeDebtStats(p: any) {
      const debts = p.payment_reports || [];
      const totalDebtEver = debts.reduce((sum: number, d: any) => sum + (d.amount_owed || 0), 0);
      const openDebt = debts
        .filter((d: any) => d.status !== 'paid')
        .reduce((sum: number, d: any) => sum + (d.amount_owed || 0), 0);
      return { totalDebtEver, openDebt };
    }

    // 4. Build REGISTERED producer carousel
    //--------------------------------------------------------------
    // RULES:
    // - Every profile with account_type='producer' belongs here
    // - Try to find a producer record via link table first
    // - If no link, try email match against producers table
    // - If still no match, producer has no associated debt yet
    //--------------------------------------------------------------
    const registeredProducerAccounts = producerProfiles?.map(profile => {
      const fullName = `${profile.legal_first_name} ${profile.legal_last_name}`;
      const email = profile.email || 'No email';

      let producerRecord = null;

      // Explicit link first
      const linkedId = linkMap.get(profile.user_id);
      if (linkedId) {
        producerRecord = allProducers?.find(p => p.id === linkedId) || null;
      }

      // Email fallback match
      if (!producerRecord && email !== 'No email') {
        producerRecord =
          allProducers?.find(p => p.email?.toLowerCase() === email.toLowerCase()) ||
          null;
      }

      // No match → no debt yet
      if (!producerRecord) {
        return {
          name: fullName,
          email,
          pscs: null,
          totalDebtEver: 0,
          openDebt: 0,
          linked: false
        };
      }

      // Matched producer → compute stats
      const { totalDebtEver, openDebt } = computeDebtStats(producerRecord);

      return {
        name: fullName,
        email,
        pscs: producerRecord.pscs_score,
        totalDebtEver,
        openDebt,
        linked: !!linkedId
      };
    }) || [];

    // 5. Build NON-REGISTERED producer carousel
    //--------------------------------------------------------------
    // RULES:
    //
    // - Only include producers from the producers table
    // - whose email does NOT appear in any producer profile
    //   (this prevents duplicates)
    //
    // - These are system-created producers from reports
    //   who have never signed up.
    //
    //--------------------------------------------------------------
    const registeredEmails = new Set(
      producerProfiles?.map(p => p.email?.toLowerCase()) || []
    );

    const nonRegisteredProducerAccounts =
      allProducers
        ?.filter(p => {
          // First check producers.email
          let email = p.email?.toLowerCase();
          
          // If null, extract from first payment report
          if (!email && p.payment_reports && p.payment_reports.length > 0) {
            const reportWithEmail = p.payment_reports.find((r: any) => r.producer_email);
            email = reportWithEmail?.producer_email?.toLowerCase();
          }
          
          // Include if:
          // - Producer has no email (system-created, null in both places) OR
          // - Producer has email that's not in registered profiles
          return !email || !registeredEmails.has(email);
        })
        .map(p => {
          const { totalDebtEver, openDebt } = computeDebtStats(p);
          
          // Display email priority: producers.email > first report email > 'Unknown'
          let displayEmail = p.email;
          if (!displayEmail && p.payment_reports && p.payment_reports.length > 0) {
            const reportWithEmail = p.payment_reports.find((r: any) => r.producer_email);
            displayEmail = reportWithEmail?.producer_email || 'Unknown';
          }
          if (!displayEmail) displayEmail = 'Unknown';
          
          return {
            name: p.name,
            email: displayEmail,
            pscs: p.pscs_score,
            totalDebtEver,
            openDebt,
            linked: false
          };
        }) || [];

    console.log('[leaderboard-insights] Registered producer accounts:', registeredProducerAccounts.length);
    console.log('[leaderboard-insights] Non-registered producer accounts:', nonRegisteredProducerAccounts.length);

    const insights = {
      totalUsers,
      crewCount,
      vendorCount,
      producerCount,
      companyCount,
      totalProducers,
      totalReports,
      verifiedReports,
      pendingReports,
      paidReports,
      distinctProducersWithReports,
      totalDebtEver: Math.round(totalDebtEver * 100) / 100,
      totalOpenDebt: Math.round(totalOpenDebt * 100) / 100,
      averageDebt: Math.round(averageDebt * 100) / 100,
      crewMembers: crewMembersWithRole,
      vendors: vendorsFormatted,
      producers: producersFormatted,
      productionCompanies: companiesFormatted,
      registeredProducerAccounts,
      nonRegisteredProducerAccounts,
    };

    return new Response(
      JSON.stringify({ success: true, data: insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[leaderboard-insights] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
