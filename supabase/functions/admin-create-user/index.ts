import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  legal_first_name: string;
  legal_last_name: string;
  account_type: 'crew' | 'vendor';
  producer_id: string;
  amount_owed: number;
  project_name: string;
  invoice_date: string;
  city?: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[admin-create-user] Starting request');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('[admin-create-user] Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log('[admin-create-user] Checking admin role for user:', user.id);

    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('[admin-create-user] Role check failed:', roleError);
      throw new Error('Admin access required');
    }

    const requestData: CreateUserRequest = await req.json();
    console.log('[admin-create-user] Request data:', { email: requestData.email, account_type: requestData.account_type });

    // Validate required fields
    if (!requestData.email || !requestData.legal_first_name || !requestData.legal_last_name) {
      throw new Error('Missing required fields');
    }

    // Generate temporary password
    const tempPassword = `Crew${Math.floor(Math.random() * 1000000)}!`;
    console.log('[admin-create-user] Generated temp password');

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email')
      .eq('email', requestData.email)
      .single();

    let newUserId: string;

    if (existingUsers) {
      console.log('[admin-create-user] User already exists:', existingUsers.user_id);
      newUserId = existingUsers.user_id;
    } else {
      // Create user with Supabase Admin API
      console.log('[admin-create-user] Creating new user');
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: requestData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          legal_first_name: requestData.legal_first_name,
          legal_last_name: requestData.legal_last_name,
          account_type: requestData.account_type,
          created_by_admin: true
        }
      });

      if (createError) {
        console.error('[admin-create-user] User creation error:', createError);
        throw createError;
      }

      newUserId = newUser.user.id;
      console.log('[admin-create-user] User created:', newUserId);

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: newUserId,
          account_type: requestData.account_type,
          legal_first_name: requestData.legal_first_name,
          legal_last_name: requestData.legal_last_name,
          email: requestData.email,
          created_by_admin: true,
          created_by_admin_id: user.id
        });

      if (profileError) {
        console.error('[admin-create-user] Profile creation error:', profileError);
        throw profileError;
      }

      console.log('[admin-create-user] Profile created');
    }

    // Create payment report
    const invoiceDate = new Date(requestData.invoice_date);
    const daysOverdue = Math.floor(
      (Date.now() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log('[admin-create-user] Creating payment report');

    const { data: report, error: reportError } = await supabaseAdmin
      .from('payment_reports')
      .insert({
        reporter_id: newUserId,
        reporter_type: requestData.account_type,
        producer_id: requestData.producer_id,
        amount_owed: requestData.amount_owed,
        project_name: requestData.project_name,
        invoice_date: requestData.invoice_date,
        days_overdue: daysOverdue,
        city: requestData.city || null,
        status: 'pending',
        verified: true,
        created_by_admin: true,
        admin_creator_id: user.id
      })
      .select()
      .single();

    if (reportError) {
      console.error('[admin-create-user] Report creation error:', reportError);
      throw reportError;
    }

    console.log('[admin-create-user] Report created:', report.id);

    // Log to audit_logs
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        event_type: 'admin_create_user_and_report',
        payload: {
          created_user_id: newUserId,
          report_id: report.id,
          email: requestData.email,
          account_type: requestData.account_type,
          producer_id: requestData.producer_id,
          amount_owed: requestData.amount_owed
        }
      });

    console.log('[admin-create-user] Audit log created');

    // Send welcome email with credentials (only if new user)
    if (!existingUsers) {
      console.log('[admin-create-user] Sending welcome email');
      try {
        await supabaseAdmin.functions.invoke('send-email', {
          body: {
            type: 'admin_created_account',
            to: requestData.email,
            data: {
              name: `${requestData.legal_first_name} ${requestData.legal_last_name}`,
              email: requestData.email,
              tempPassword,
              accountType: requestData.account_type,
              reportId: report.report_id || report.id
            }
          }
        });
        console.log('[admin-create-user] Email sent successfully');
      } catch (emailError) {
        console.error('[admin-create-user] Email send failed:', emailError);
        // Don't fail the entire operation if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        report_id: report.id,
        report_number: report.report_id,
        temp_password: existingUsers ? null : tempPassword,
        user_existed: !!existingUsers
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[admin-create-user] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

export const config = { verify_jwt: true };
