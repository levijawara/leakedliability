import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface YouTubeVideoStats {
  id: string;
  statistics: {
    viewCount: string;
    likeCount?: string;
    commentCount?: string;
  };
}

interface YouTubeApiResponse {
  items?: YouTubeVideoStats[];
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Extract YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 */
function extractVideoId(url: string): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    
    // youtube.com/watch?v=VIDEO_ID
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return videoId;
      
      // youtube.com/embed/VIDEO_ID or youtube.com/v/VIDEO_ID
      const pathMatch = parsed.pathname.match(/\/(embed|v)\/([^/?]+)/);
      if (pathMatch) return pathMatch[2];
    }
    
    // youtu.be/VIDEO_ID
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1).split("?")[0];
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch video statistics from YouTube Data API v3
 * Supports batching up to 50 video IDs per request
 */
async function fetchVideoStats(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, number>> {
  const results = new Map<string, number>();
  
  // API allows up to 50 IDs per request
  const batchSize = 50;
  
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    const idsParam = batch.join(",");
    
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${idsParam}&key=${apiKey}`;
    
    console.log(`[sync-youtube-views] Fetching stats for ${batch.length} videos`);
    
    const response = await fetch(url);
    const data: YouTubeApiResponse = await response.json();
    
    if (data.error) {
      console.error(`[sync-youtube-views] YouTube API error: ${data.error.message}`);
      continue;
    }
    
    if (data.items) {
      for (const item of data.items) {
        const viewCount = parseInt(item.statistics.viewCount, 10);
        if (!isNaN(viewCount)) {
          results.set(item.id, viewCount);
        }
      }
    }
  }
  
  return results;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");
    if (!youtubeApiKey) {
      console.error("[sync-youtube-views] Missing YOUTUBE_API_KEY");
      return new Response(
        JSON.stringify({ error: "YouTube API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Parse request body first to check for cron trigger
    const body = await req.json().catch(() => ({}));
    const { callSheetIds, syncAll = false, cronTrigger = false } = body as {
      callSheetIds?: string[];
      syncAll?: boolean;
      cronTrigger?: boolean;
    };

    let userId: string | null = null;

    // Allow unauthenticated cron-triggered syncs
    if (cronTrigger && syncAll) {
      console.log("[sync-youtube-views] Cron-triggered sync (no auth required)");
      userId = "cron-service";
    } else {
      // Validate auth for manual triggers
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Auth client to verify user
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await authClient.auth.getUser(token);
      if (claimsError || !claimsData?.user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = claimsData.user.id;

      // Check admin role for manual triggers
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: isAdmin } = await adminClient.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create admin client for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[sync-youtube-views] start { userId: ${userId}, syncAll: ${syncAll}, callSheetIds: ${callSheetIds?.length || 0} }`);

    // Fetch call sheets with YouTube URLs
    let query = adminClient
      .from("global_call_sheets")
      .select("id, youtube_url")
      .not("youtube_url", "is", null);

    if (!syncAll && callSheetIds?.length) {
      query = query.in("id", callSheetIds);
    }

    const { data: sheets, error: sheetsError } = await query;

    if (sheetsError) {
      console.error("[sync-youtube-views] Error fetching sheets:", sheetsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch call sheets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sheets?.length) {
      return new Response(
        JSON.stringify({ message: "No call sheets with YouTube URLs found", synced: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build video ID to sheet ID mapping
    const videoToSheet = new Map<string, string[]>();
    for (const sheet of sheets) {
      const videoId = extractVideoId(sheet.youtube_url);
      if (videoId) {
        const existing = videoToSheet.get(videoId) || [];
        existing.push(sheet.id);
        videoToSheet.set(videoId, existing);
      }
    }

    const videoIds = Array.from(videoToSheet.keys());
    console.log(`[sync-youtube-views] Found ${videoIds.length} unique video IDs from ${sheets.length} sheets`);

    if (videoIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No valid YouTube video IDs found", synced: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch view counts from YouTube
    const viewCounts = await fetchVideoStats(videoIds, youtubeApiKey);

    // Update call sheets with view counts
    let updatedCount = 0;
    const now = new Date().toISOString();

    for (const [videoId, sheetIds] of videoToSheet) {
      const viewCount = viewCounts.get(videoId);
      if (viewCount !== undefined) {
        for (const sheetId of sheetIds) {
          const { error: updateError } = await adminClient
            .from("global_call_sheets")
            .update({
              youtube_view_count: viewCount,
              youtube_last_synced: now,
            })
            .eq("id", sheetId);

          if (updateError) {
            console.error(`[sync-youtube-views] Failed to update sheet ${sheetId}:`, updateError);
          } else {
            updatedCount++;
          }
        }
      }
    }

    console.log(`[sync-youtube-views] Updated ${updatedCount} call sheets`);

    // Log audit event
    await adminClient.from("audit_logs").insert({
      user_id: userId,
      event_type: "youtube_views_synced",
      payload: {
        sheets_processed: sheets.length,
        videos_fetched: videoIds.length,
        sheets_updated: updatedCount,
      },
    });

    return new Response(
      JSON.stringify({
        message: "YouTube views synced successfully",
        synced: updatedCount,
        videosProcessed: videoIds.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[sync-youtube-views] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
