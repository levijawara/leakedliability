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
    console.log("[admin-clear-storage] Admin clear storage request received");

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ========== ADMIN AUTHENTICATION REQUIRED ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[admin-clear-storage] No authorization header");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[admin-clear-storage] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role using has_role RPC
    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      console.error("[admin-clear-storage] Admin check failed. User:", user.id, "isAdmin:", isAdmin);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[admin-clear-storage] Admin verified:", user.id);

    // ========== DANGER ZONE: CLEAR ALL DATA ==========
    const { confirm } = await req.json().catch(() => ({}));
    
    if (confirm !== "DELETE_ALL_DATA") {
      return new Response(
        JSON.stringify({ 
          error: "Confirmation required",
          message: "Send { confirm: 'DELETE_ALL_DATA' } to proceed" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let filesDeleted = 0;

    // 1. List and delete all files from call_sheets bucket
    console.log("[admin-clear-storage] Listing files in call_sheets bucket...");
    const { data: files, error: listError } = await supabase.storage
      .from("call_sheets")
      .list("", { limit: 1000 });

    if (!listError && files && files.length > 0) {
      // Get all files including nested folders
      const allPaths: string[] = [];
      
      for (const item of files) {
        if (item.id) {
          // It's a file
          allPaths.push(item.name);
        } else {
          // It's a folder, list contents
          const { data: folderFiles } = await supabase.storage
            .from("call_sheets")
            .list(item.name, { limit: 1000 });
          
          if (folderFiles) {
            for (const file of folderFiles) {
              if (file.id) {
                allPaths.push(`${item.name}/${file.name}`);
              }
            }
          }
        }
      }

      if (allPaths.length > 0) {
        const { error: deleteFilesError } = await supabase.storage
          .from("call_sheets")
          .remove(allPaths);

        if (deleteFilesError) {
          console.error("[admin-clear-storage] File deletion error:", deleteFilesError);
        } else {
          filesDeleted = allPaths.length;
          console.log("[admin-clear-storage] Deleted", filesDeleted, "files");
        }
      }
    }

    // 2. Delete all crew_contacts
    console.log("[admin-clear-storage] Deleting all crew_contacts...");
    const { error: deleteContactsError } = await supabase
      .from("crew_contacts")
      .delete()
      .gte("created_at", "1970-01-01"); // Match all records

    if (deleteContactsError) {
      console.error("[admin-clear-storage] Contacts deletion error:", deleteContactsError);
    } else {
      console.log("[admin-clear-storage] Deleted crew_contacts");
    }

    // 3. Delete all call_sheets
    console.log("[admin-clear-storage] Deleting all call_sheets...");
    const { error: deleteSheetsError } = await supabase
      .from("call_sheets")
      .delete()
      .gte("uploaded_at", "1970-01-01"); // Match all records

    if (deleteSheetsError) {
      console.error("[admin-clear-storage] Sheets deletion error:", deleteSheetsError);
    } else {
      console.log("[admin-clear-storage] Deleted call_sheets");
    }

    // Log the admin action
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      event_type: "admin_clear_storage",
      payload: {
        files_deleted: filesDeleted,
        timestamp: new Date().toISOString(),
      },
    });

    console.log("[admin-clear-storage] Clear operation completed");

    return new Response(
      JSON.stringify({
        success: true,
        message: "All call sheet data cleared",
        deleted: {
          files: filesDeleted,
          contacts: "all",
          sheets: "all",
        },
        admin_id: user.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[admin-clear-storage] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to clear storage";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
