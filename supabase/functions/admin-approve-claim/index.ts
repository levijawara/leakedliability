import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-APPROVE-CLAIM] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const adminId = userData.user.id;

    // Check admin role
    const { data: isAdmin } = await supabaseClient.rpc("has_role", {
      _user_id: adminId,
      _role: "admin"
    });

    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }
    logStep("Admin verified", { adminId });

    // Parse request body
    const { producer_id, approved, rejection_reason } = await req.json();
    
    if (!producer_id) {
      throw new Error("producer_id is required");
    }
    if (typeof approved !== "boolean") {
      throw new Error("approved must be a boolean");
    }
    logStep("Request parsed", { producer_id, approved });

    // Get producer and pending claim info
    const { data: producer, error: producerError } = await supabaseClient
      .from("producers")
      .select("*")
      .eq("id", producer_id)
      .single();

    if (producerError || !producer) {
      throw new Error("Producer not found");
    }

    if (producer.stripe_verification_status !== "pending_admin") {
      throw new Error("This producer does not have a pending claim for review");
    }
    logStep("Producer found with pending claim", { name: producer.name });

    // Get the most recent claim history entry to find the user
    const { data: claimHistory, error: historyError } = await supabaseClient
      .from("identity_claim_history")
      .select("*")
      .eq("producer_id", producer_id)
      .eq("new_status", "pending_admin")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (historyError || !claimHistory) {
      throw new Error("Could not find claim history for this producer");
    }

    const claimantUserId = claimHistory.user_id;
    logStep("Found claimant", { userId: claimantUserId });

    if (approved) {
      // APPROVE: Update producer with verified status
      const { error: updateError } = await supabaseClient
        .from("producers")
        .update({
          stripe_verification_status: "verified",
          has_claimed_account: true,
          is_placeholder: false,
          claimed_by_user_id: claimantUserId,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", producer_id);

      if (updateError) {
        throw new Error("Failed to update producer: " + updateError.message);
      }

      // Log approval
      await supabaseClient.from("identity_claim_history").insert({
        producer_id: producer_id,
        user_id: claimantUserId,
        old_status: "pending_admin",
        new_status: "verified",
        admin_id: adminId,
      });

      logStep("Claim approved successfully");

      // TODO: Send approval email to user
      // await sendClaimApprovedEmail(claimantUserId, producer.name);

      return new Response(JSON.stringify({
        success: true,
        message: "Claim approved successfully",
        producer_id: producer_id,
        claimant_user_id: claimantUserId
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // REJECT: Reset producer status
      const { error: updateError } = await supabaseClient
        .from("producers")
        .update({
          stripe_verification_status: "rejected",
          stripe_verification_session_id: null,
        })
        .eq("id", producer_id);

      if (updateError) {
        throw new Error("Failed to update producer: " + updateError.message);
      }

      // Log rejection
      await supabaseClient.from("identity_claim_history").insert({
        producer_id: producer_id,
        user_id: claimantUserId,
        old_status: "pending_admin",
        new_status: "rejected",
        admin_id: adminId,
        rejection_reason: rejection_reason || "Name mismatch - claim rejected by admin",
      });

      logStep("Claim rejected", { reason: rejection_reason });

      // TODO: Send rejection email to user
      // await sendClaimRejectedEmail(claimantUserId, producer.name, rejection_reason);

      return new Response(JSON.stringify({
        success: true,
        message: "Claim rejected",
        producer_id: producer_id,
        rejection_reason: rejection_reason
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
