import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { rateLimitByIp } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Public endpoint - no JWT required
export const config = { verify_jwt: false };

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PRODUCER-ESCROW] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit: 10 requests per IP per minute
  const limited = rateLimitByIp(req, 10, 60000, corsHeaders);
  if (limited) return limited;

  try {
    logStep("Function started");

    const body = await req.json();
    const { 
      producerName, 
      companyName, 
      producerEmail, 
      crewName, 
      crewEmail, 
      projectName, 
      reportId, 
      amount, 
      note 
    } = body;

    // Validate required fields
    if (!producerName || !producerEmail || !crewName || !crewEmail || !projectName || !amount) {
      throw new Error("Missing required fields");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    logStep("Looking up or creating producer", { email: producerEmail });

    // Look up or create producer
    const { data: existingProducer } = await supabase
      .from("producers")
      .select("id")
      .eq("email", producerEmail)
      .single();

    let producerId: string;

    if (existingProducer) {
      producerId = existingProducer.id;
      logStep("Producer found", { id: producerId });
    } else {
      const { data: newProducer, error: createError } = await supabase
        .from("producers")
        .insert({
          name: producerName,
          email: producerEmail,
          company: companyName || null,
          verification_status: "unverified",
          auto_created: true,
        })
        .select("id")
        .single();

      if (createError) throw createError;
      producerId = newProducer.id;
      logStep("Producer created", { id: producerId });
    }

    // Generate unique payment code (12-char alphanumeric)
    const generateCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 12; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let paymentCode = generateCode();
    let attempts = 0;
    
    // Ensure unique code
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from("escrow_payments")
        .select("id")
        .eq("payment_code", paymentCode)
        .single();

      if (!existing) break;
      paymentCode = generateCode();
      attempts++;
    }

    logStep("Generated payment code", { code: paymentCode });

    // Find payment report if reportId provided
    let paymentReportId = null;
    if (reportId) {
      const { data: report } = await supabase
        .from("payment_reports")
        .select("id")
        .eq("report_id", reportId)
        .single();
      
      if (report) {
        paymentReportId = report.id;
        logStep("Linked to payment report", { report_id: reportId });
      }
    }

    // Create escrow payment record
    const { data: escrow, error: escrowError } = await supabase
      .from("escrow_payments")
      .insert({
        producer_id: producerId,
        crew_member_id: producerId, // Placeholder - will be updated when crew confirms
        payment_report_id: paymentReportId,
        amount_due: amount,
        status: "pending",
        payment_code: paymentCode,
        metadata: {
          producerName,
          companyName,
          crewName,
          crewEmail,
          projectName,
          reportId,
          note,
        },
      })
      .select("id")
      .single();

    if (escrowError) throw escrowError;

    logStep("Escrow payment created", { id: escrow.id });

    return new Response(
      JSON.stringify({ paymentCode }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
