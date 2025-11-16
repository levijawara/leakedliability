import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NO JWT REQUIRED - public endpoint for producers
export const config = { verify_jwt: false };

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-ESCROW-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { payment_code } = await req.json();
    if (!payment_code) throw new Error("payment_code required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get escrow payment details
    const { data: escrow, error: escrowError } = await supabase
      .from("escrow_payments")
      .select(`
        *,
        payment_report:payment_reports(project_name, report_id),
        producer:producers(name, company)
      `)
      .eq("payment_code", payment_code)
      .eq("status", "pending")
      .single();

    if (escrowError || !escrow) throw new Error("Invalid or expired payment code");

    logStep("Escrow payment found", { 
      escrow_id: escrow.id, 
      amount: escrow.amount_due 
    });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2022-11-15",
    });

    // Create Stripe Checkout Session
    const origin = req.headers.get("origin") || "https://leakedliability.com";
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Outstanding Payment Settlement",
              description: `Project: ${escrow.payment_report?.project_name || "Undisclosed"}`,
            },
            unit_amount: Math.round(escrow.amount_due * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/pay/${payment_code}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pay/${payment_code}`,
      metadata: {
        escrow_payment_id: escrow.id,
        payment_report_id: escrow.payment_report_id,
        payment_code: payment_code,
        type: "escrow_payment",
      },
    });

    logStep("Stripe session created", { session_id: session.id });

    // Update escrow with session ID
    await supabase
      .from("escrow_payments")
      .update({ stripe_session_id: session.id })
      .eq("id", escrow.id);

    return new Response(JSON.stringify({ url: session.url }), {
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