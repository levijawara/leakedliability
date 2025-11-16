import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const config = { verify_jwt: true };

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-ESCROW-LINK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);

    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin'
    });

    if (!isAdmin) throw new Error("Admin access required");
    logStep("Admin verified", { userId: userData.user.id });

    // Parse request
    const { payment_report_id } = await req.json();
    if (!payment_report_id) throw new Error("payment_report_id required");

    logStep("Fetching payment report", { payment_report_id });

    // Get payment report details
    const { data: report, error: reportError } = await supabase
      .from("payment_reports")
      .select(`
        id,
        producer_id,
        reporter_id,
        amount_owed,
        project_name,
        status,
        verified,
        producer:producers(id, name, company)
      `)
      .eq("id", payment_report_id)
      .single();

    if (reportError) throw new Error(`Report fetch error: ${reportError.message}`);
    if (!report) throw new Error("Report not found");
    if (report.status === "paid") throw new Error("Report already paid");

    logStep("Report retrieved", { 
      producer_id: report.producer_id, 
      amount: report.amount_owed 
    });

    // Check if escrow payment already exists for this report
    const { data: existingEscrow } = await supabase
      .from("escrow_payments")
      .select("*")
      .eq("payment_report_id", payment_report_id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingEscrow) {
      logStep("Existing escrow payment found", { code: existingEscrow.payment_code });
      
      const origin = req.headers.get("origin") || "https://leakedliability.com";
      const paymentUrl = `${origin}/pay/${existingEscrow.payment_code}`;
      
      return new Response(JSON.stringify({ 
        payment_url: paymentUrl,
        payment_code: existingEscrow.payment_code,
        existing: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Generate unique payment code
    const { data: paymentCode, error: codeError } = await supabase
      .rpc('generate_payment_code');

    if (codeError || !paymentCode) throw new Error("Failed to generate payment code");

    logStep("Payment code generated", { code: paymentCode });

    // Create escrow payment record
    const producerName = Array.isArray(report.producer) && report.producer.length > 0 
      ? report.producer[0].name 
      : "Unknown";
    
    const { data: escrowPayment, error: escrowError } = await supabase
      .from("escrow_payments")
      .insert({
        payment_report_id: report.id,
        producer_id: report.producer_id,
        crew_member_id: report.reporter_id,
        amount_due: report.amount_owed,
        payment_code: paymentCode,
        status: "pending",
        metadata: {
          project_name: report.project_name,
          producer_name: producerName,
          created_by_admin: userData.user.id
        }
      })
      .select()
      .single();

    if (escrowError) throw new Error(`Escrow insert error: ${escrowError.message}`);

    logStep("Escrow payment created", { escrow_id: escrowPayment.id });

    const origin = req.headers.get("origin") || "https://leakedliability.com";
    const paymentUrl = `${origin}/pay/${paymentCode}`;

    return new Response(JSON.stringify({ 
      payment_url: paymentUrl,
      payment_code: paymentCode,
      amount: report.amount_owed,
      existing: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});