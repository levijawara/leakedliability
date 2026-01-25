/**
 * Format large numbers in a human-readable way (e.g., 1.2M, 45K)
 */
export function formatViewCount(count: number | null | undefined): string {
  if (count === null || count === undefined) return "";
  
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toLocaleString();
}

/**
 * Extract video ID from YouTube URL
 */
export function extractYouTubeVideoId(url: string): string | null {
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
 * Generate YouTube thumbnail URL from video ID
 */
export function getYouTubeThumbnail(videoId: string, quality: "default" | "mq" | "hq" | "maxres" = "mq"): string {
  const qualityMap = {
    default: "default",
    mq: "mqdefault",
    hq: "hqdefault",
    maxres: "maxresdefault",
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}
