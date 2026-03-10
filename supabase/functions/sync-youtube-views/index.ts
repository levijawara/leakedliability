import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternalSecret } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
      standard?: { url: string };
      maxres?: { url: string };
    };
  };
  statistics: {
    viewCount: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails: {
    duration: string;
  };
}

interface YouTubeApiResponse {
  items?: YouTubeVideoItem[];
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractVideoId(url: string): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return videoId;
      
      const pathMatch = parsed.pathname.match(/\/(embed|v)\/([^/?]+)/);
      if (pathMatch) return pathMatch[2];
    }
    
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1).split("?")[0];
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse ISO 8601 duration (PT4M13S) to seconds
 */
function parseDuration(iso8601: string): number {
  if (!iso8601) return 0;
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetch full video metadata from YouTube Data API v3
 */
async function fetchVideoMetadata(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, YouTubeVideoItem>> {
  const results = new Map<string, YouTubeVideoItem>();
  const batchSize = 50;
  
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    const idsParam = batch.join(",");
    
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${idsParam}&key=${apiKey}`;
    
    console.log(`[sync-youtube-views] Fetching metadata for ${batch.length} videos`);
    
    const response = await fetch(url);
    const data: YouTubeApiResponse = await response.json();
    
    if (data.error) {
      console.error(`[sync-youtube-views] YouTube API error: ${data.error.message}`);
      continue;
    }
    
    if (data.items) {
      for (const item of data.items) {
        results.set(item.id, item);
      }
    }
  }
  
  return results;
}

Deno.serve(async (req) => {
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
    
    const body = await req.json().catch(() => ({}));
    const { callSheetIds, syncAll = false, cronTrigger = false, staleOnly = true } = body as {
      callSheetIds?: string[];
      syncAll?: boolean;
      cronTrigger?: boolean;
      staleOnly?: boolean;
    };

    let userId: string | null = null;

    // Auth: internal secret (cron) or JWT (admin)
    const internalSecret = req.headers.get("x-internal-secret");
    if (internalSecret && internalSecret === Deno.env.get("INTERNAL_SECRET")) {
      console.log("[sync-youtube-views] Internal secret validated (cron)");
      userId = "cron-service";
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[sync-youtube-views] start { userId: ${userId}, syncAll: ${syncAll}, staleOnly: ${staleOnly}, callSheetIds: ${callSheetIds?.length || 0} }`);

    // Track which records need updating after sync
    interface SyncTarget {
      globalSheetIds: string[];
      youtubeVideoRecordIds: string[]; // youtube_videos.id records to update (from project_videos)
    }

    const videoTargets = new Map<string, SyncTarget>();

    // SOURCE 1: Fetch call sheets with YouTube URLs
    let sheetsQuery = adminClient
      .from("global_call_sheets")
      .select("id, youtube_url, youtube_video_id")
      .not("youtube_url", "is", null);

    if (!syncAll && callSheetIds?.length) {
      sheetsQuery = sheetsQuery.in("id", callSheetIds);
    }

    const { data: sheets, error: sheetsError } = await sheetsQuery;

    if (sheetsError) {
      console.error("[sync-youtube-views] Error fetching sheets:", sheetsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch call sheets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SOURCE 2: Fetch project videos with YouTube URLs
    const { data: projectVideos, error: projectVideosError } = await adminClient
      .from("project_videos")
      .select("id, youtube_url, video_id")
      .not("youtube_url", "is", null);

    if (projectVideosError) {
      console.error("[sync-youtube-views] Error fetching project videos:", projectVideosError);
      // Non-fatal - continue with call sheets only
    }

    // Build unified video ID mapping from call sheets
    for (const sheet of sheets || []) {
      const videoId = extractVideoId(sheet.youtube_url);
      if (videoId) {
        const target = videoTargets.get(videoId) || { globalSheetIds: [], youtubeVideoRecordIds: [] };
        target.globalSheetIds.push(sheet.id);
        videoTargets.set(videoId, target);
      }
    }

    // Add project video sources to the mapping
    for (const pv of projectVideos || []) {
      const videoId = extractVideoId(pv.youtube_url);
      if (videoId && pv.video_id) {
        const target = videoTargets.get(videoId) || { globalSheetIds: [], youtubeVideoRecordIds: [] };
        // video_id in project_videos references youtube_videos.id
        if (!target.youtubeVideoRecordIds.includes(pv.video_id)) {
          target.youtubeVideoRecordIds.push(pv.video_id);
        }
        videoTargets.set(videoId, target);
      }
    }

    console.log(`[sync-youtube-views] Found ${sheets?.length || 0} call sheets, ${projectVideos?.length || 0} project videos`);

    if (videoTargets.size === 0) {
      return new Response(
        JSON.stringify({ message: "No videos with YouTube URLs found", synced: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build video ID to sheet ID mapping for legacy compatibility
    const videoToSheets = new Map<string, string[]>();
    for (const [videoId, target] of videoTargets) {
      videoToSheets.set(videoId, target.globalSheetIds);
    }

    let videoIdsToSync = Array.from(videoTargets.keys());
    console.log(`[sync-youtube-views] Found ${videoIdsToSync.length} unique video IDs from ${sheets.length} sheets`);

    // Apply stale filter if enabled
    if (staleOnly && videoIdsToSync.length > 0) {
      const staleThreshold = new Date();
      staleThreshold.setDate(staleThreshold.getDate() - 7);

      const { data: freshVideos } = await adminClient
        .from("youtube_videos")
        .select("video_id")
        .in("video_id", videoIdsToSync)
        .gte("last_synced_at", staleThreshold.toISOString());

      const freshVideoIds = new Set(freshVideos?.map(v => v.video_id) || []);
      const originalCount = videoIdsToSync.length;
      videoIdsToSync = videoIdsToSync.filter(id => !freshVideoIds.has(id));
      console.log(`[sync-youtube-views] Stale filter: ${originalCount} -> ${videoIdsToSync.length} videos to sync`);
    }

    if (videoIdsToSync.length === 0) {
      return new Response(
        JSON.stringify({ message: "All videos are up to date", synced: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch full metadata from YouTube
    const videoMetadata = await fetchVideoMetadata(videoIdsToSync, youtubeApiKey);

    // Upsert videos and update call sheets
    let upsertedCount = 0;
    let linkedCount = 0;
    const now = new Date().toISOString();

    for (const [videoId, item] of videoMetadata) {
      const thumbnailUrl = 
        item.snippet.thumbnails.maxres?.url ||
        item.snippet.thumbnails.standard?.url ||
        item.snippet.thumbnails.high?.url ||
        item.snippet.thumbnails.medium?.url ||
        item.snippet.thumbnails.default?.url;

      // Check if video already exists (can't use upsert with partial unique index)
      const { data: existingVideo } = await adminClient
        .from("youtube_videos")
        .select("id")
        .eq("video_id", videoId)
        .maybeSingle();

      let videoRecordId: string;

      if (existingVideo) {
        // Update existing record
        const { error: updateError } = await adminClient
          .from("youtube_videos")
          .update({
            title: item.snippet.title,
            thumbnail_url: thumbnailUrl,
            channel_title: item.snippet.channelTitle,
            channel_id: item.snippet.channelId,
            published_at: item.snippet.publishedAt,
            duration_seconds: parseDuration(item.contentDetails.duration),
            view_count: parseInt(item.statistics.viewCount || "0", 10),
            like_count: parseInt(item.statistics.likeCount || "0", 10),
            comment_count: parseInt(item.statistics.commentCount || "0", 10),
            last_synced_at: now,
          })
          .eq("id", existingVideo.id);

        if (updateError) {
          console.error(`[sync-youtube-views] Failed to update video ${videoId}:`, updateError);
          continue;
        }
        videoRecordId = existingVideo.id;
      } else {
        // Insert new record
        const { data: newVideo, error: insertError } = await adminClient
          .from("youtube_videos")
          .insert({
            video_id: videoId,
            title: item.snippet.title,
            thumbnail_url: thumbnailUrl,
            channel_title: item.snippet.channelTitle,
            channel_id: item.snippet.channelId,
            published_at: item.snippet.publishedAt,
            duration_seconds: parseDuration(item.contentDetails.duration),
            view_count: parseInt(item.statistics.viewCount || "0", 10),
            like_count: parseInt(item.statistics.likeCount || "0", 10),
            comment_count: parseInt(item.statistics.commentCount || "0", 10),
            last_synced_at: now,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error(`[sync-youtube-views] Failed to insert video ${videoId}:`, insertError);
          continue;
        }
        videoRecordId = newVideo.id;
      }

      upsertedCount++;

      // Link call sheets to this video
      const sheetIds = videoToSheets.get(videoId) || [];
      for (const sheetId of sheetIds) {
        const viewCount = parseInt(item.statistics.viewCount || "0", 10);
        
        const { error: updateError } = await adminClient
          .from("global_call_sheets")
          .update({
            youtube_video_id: videoRecordId,
            youtube_view_count: viewCount,
            youtube_last_synced: now,
          })
          .eq("id", sheetId);

        if (updateError) {
          console.error(`[sync-youtube-views] Failed to link sheet ${sheetId}:`, updateError);
        } else {
          linkedCount++;
        }
      }
    }

    console.log(`[sync-youtube-views] Upserted ${upsertedCount} videos, linked ${linkedCount} call sheets`);

    // Log audit event
    await adminClient.from("audit_logs").insert({
      user_id: userId === "cron-service" ? null : userId,
      event_type: "youtube_views_synced",
      payload: {
        sheets_processed: sheets.length,
        videos_fetched: videoIdsToSync.length,
        videos_upserted: upsertedCount,
        sheets_linked: linkedCount,
        stale_only: staleOnly,
      },
    });

    return new Response(
      JSON.stringify({
        message: "YouTube metadata synced successfully",
        videosUpserted: upsertedCount,
        sheetsLinked: linkedCount,
        videosProcessed: videoIdsToSync.length,
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
