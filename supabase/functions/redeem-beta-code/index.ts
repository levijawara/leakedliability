import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get the JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's JWT to get their ID
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("[redeem-beta-code] User auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[redeem-beta-code] User ${user.id} attempting to redeem code`);

    // Parse request body
    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(
        JSON.stringify({ error: "Code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const submittedCode = code.trim().toUpperCase();
    console.log(`[redeem-beta-code] Submitted code: ${submittedCode}`);

    // Use service role for all DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already has beta access
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("beta_access")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("[redeem-beta-code] Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to check access status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile?.beta_access) {
      console.log(`[redeem-beta-code] User ${user.id} already has beta access`);
      return new Response(
        JSON.stringify({ error: "You already have beta access" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already redeemed ANY code
    const { data: existingRedemption, error: redemptionError } = await supabase
      .from("beta_access_redemptions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (redemptionError) {
      console.error("[redeem-beta-code] Redemption check error:", redemptionError);
      return new Response(
        JSON.stringify({ error: "Failed to check redemption status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingRedemption) {
      console.log(`[redeem-beta-code] User ${user.id} already redeemed a code`);
      return new Response(
        JSON.stringify({ error: "You have already redeemed a beta code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the active code
    const { data: activeCode, error: codeError } = await supabase
      .from("beta_access_codes")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (codeError) {
      console.error("[redeem-beta-code] Active code fetch error:", codeError);
      return new Response(
        JSON.stringify({ error: "Failed to verify code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!activeCode) {
      console.log("[redeem-beta-code] No active beta code found");
      return new Response(
        JSON.stringify({ error: "No active beta program at this time" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if submitted code matches (case-insensitive)
    if (activeCode.code.toUpperCase() !== submittedCode) {
      console.log(`[redeem-beta-code] Code mismatch: expected ${activeCode.code}, got ${submittedCode}`);
      return new Response(
        JSON.stringify({ error: "Invalid code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if code still has uses left
    if (activeCode.current_uses >= activeCode.max_uses) {
      console.log(`[redeem-beta-code] Code ${activeCode.id} is exhausted`);
      return new Response(
        JSON.stringify({ error: "This code has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[redeem-beta-code] Code valid. Current uses: ${activeCode.current_uses}/${activeCode.max_uses}`);

    // All checks passed - redeem the code
    // 1. Insert redemption record
    const { error: insertError } = await supabase
      .from("beta_access_redemptions")
      .insert({
        user_id: user.id,
        code_id: activeCode.id,
      });

    if (insertError) {
      console.error("[redeem-beta-code] Redemption insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to redeem code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Update profile to grant beta access
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({ beta_access: true })
      .eq("user_id", user.id);

    if (updateProfileError) {
      console.error("[redeem-beta-code] Profile update error:", updateProfileError);
      // Don't return error - redemption was recorded
    }

    // 3. Increment current_uses on the code
    const newUses = activeCode.current_uses + 1;
    const updateData: any = { current_uses: newUses };

    // If this was the last use, expire the code
    if (newUses >= activeCode.max_uses) {
      updateData.is_active = false;
      updateData.expired_at = new Date().toISOString();
      console.log(`[redeem-beta-code] Code ${activeCode.id} is now exhausted and expired`);
    }

    const { error: updateCodeError } = await supabase
      .from("beta_access_codes")
      .update(updateData)
      .eq("id", activeCode.id);

    if (updateCodeError) {
      console.error("[redeem-beta-code] Code update error:", updateCodeError);
      // Don't return error - redemption was successful
    }

    console.log(`[redeem-beta-code] Successfully redeemed for user ${user.id}. Uses: ${newUses}/${activeCode.max_uses}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Beta access granted!" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[redeem-beta-code] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
