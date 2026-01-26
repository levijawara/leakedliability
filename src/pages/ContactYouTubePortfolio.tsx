import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Youtube, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatFullViewCount } from "@/lib/youtubeHelpers";
import { formatDistanceToNow } from "date-fns";
import { YouTubePlayerModal, VideoWithCredits } from "@/components/contacts/YouTubePlayerModal";

interface ContactData {
  id: string;
  name: string;
}

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string | null;
  thumbnail_url: string | null;
  channel_title: string | null;
  published_at: string | null;
  duration_seconds: number | null;
  view_count: number | null;
  last_synced_at: string | null;
}

interface CreditEntry {
  role: string | null;
  name: string;
  ig_handle: string | null;
}

/**
 * Format duration in seconds to human-readable (4:23 or 1:02:15)
 */
function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format relative time (e.g., "2 years ago" -> "2y")
 */
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const distance = formatDistanceToNow(date, { addSuffix: false });
    // Shorten for display
    return distance
      .replace(" years", "y")
      .replace(" year", "y")
      .replace(" months", "mo")
      .replace(" month", "mo")
      .replace(" weeks", "w")
      .replace(" week", "w")
      .replace(" days", "d")
      .replace(" day", "d")
      .replace(" hours", "h")
      .replace(" hour", "h")
      .replace("about ", "")
      .replace("over ", "");
  } catch {
    return "";
  }
}

export default function ContactYouTubePortfolio() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  
  const [contact, setContact] = useState<ContactData | null>(null);
  const [videos, setVideos] = useState<VideoWithCredits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoWithCredits | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  useEffect(() => {
    if (!contactId) return;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch contact info
        const { data: contactData, error: contactError } = await supabase
          .from("crew_contacts")
          .select("id, name")
          .eq("id", contactId)
          .maybeSingle();
        
        if (contactError) throw contactError;
        if (!contactData) {
          setError("Contact not found");
          setLoading(false);
          return;
        }
        
        setContact(contactData);
        
        // Fetch linked call sheets with YouTube video data
        const { data: links, error: linksError } = await supabase
          .from("contact_call_sheets")
          .select("call_sheet_id")
          .eq("contact_id", contactId);
        
        if (linksError) throw linksError;
        
        if (!links || links.length === 0) {
          setVideos([]);
          setLoading(false);
          return;
        }
        
        const callSheetIds = links.map(l => l.call_sheet_id);
        
        // Get call sheets with their linked videos AND parsed_contacts for credits
        const { data: sheetsData, error: sheetsError } = await supabase
          .from("global_call_sheets")
          .select(`
            id,
            project_title,
            youtube_url,
            youtube_view_count,
            youtube_video_id,
            parsed_contacts
          `)
          .in("id", callSheetIds)
          .not("youtube_url", "is", null);
        
        if (sheetsError) throw sheetsError;
        
        // Build a map from youtube_video_id to credits
        const videoCreditsMap = new Map<string, { credits: CreditEntry[]; title: string | null }>();
        
        sheetsData?.forEach(sheet => {
          if (!sheet.youtube_video_id) return;
          
          // Parse credits from parsed_contacts JSONB
          const credits: CreditEntry[] = [];
          if (Array.isArray(sheet.parsed_contacts)) {
            sheet.parsed_contacts.forEach((c: any) => {
              if (c?.name) {
                credits.push({
                  name: c.name,
                  role: c.roles?.[0] || c.role || null,
                  ig_handle: c.ig_handle || null,
                });
              }
            });
          }
          
          videoCreditsMap.set(sheet.youtube_video_id, {
            credits,
            title: sheet.project_title,
          });
        });
        
        // Get unique video IDs and fetch video metadata
        const videoIds = [...new Set(
          (sheetsData || [])
            .map(s => s.youtube_video_id)
            .filter((id): id is string => !!id)
        )];
        
        if (videoIds.length === 0) {
          setVideos([]);
          setLoading(false);
          return;
        }
        
        const { data: videosData, error: videosError } = await supabase
          .from("youtube_videos")
          .select("*")
          .in("id", videoIds);
        
        if (videosError) throw videosError;
        
        // Dedupe by video_id, attach credits, and sort by view_count
        const uniqueVideos = new Map<string, VideoWithCredits>();
        (videosData || []).forEach(video => {
          if (!uniqueVideos.has(video.video_id)) {
            const creditsData = videoCreditsMap.get(video.id);
            uniqueVideos.set(video.video_id, {
              ...video,
              credits: creditsData?.credits || [],
              projectTitle: creditsData?.title || null,
            });
          }
        });
        
        const sortedVideos = Array.from(uniqueVideos.values())
          .sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        
        setVideos(sortedVideos);
      } catch (err) {
        console.error("[ContactYouTubePortfolio] Error:", err);
        setError("Failed to load portfolio data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [contactId]);

  const totalViews = videos.reduce((sum, video) => sum + (video.view_count || 0), 0);
  const oldestSync = videos.length > 0
    ? videos.reduce((oldest, v) => {
        if (!v.last_synced_at) return oldest;
        if (!oldest) return v.last_synced_at;
        return new Date(v.last_synced_at) < new Date(oldest) ? v.last_synced_at : oldest;
      }, null as string | null)
    : null;

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/crew-contacts")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>
          
          {loading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading portfolio...</span>
            </div>
          ) : error ? (
            <div className="text-destructive">{error}</div>
          ) : contact ? (
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{contact.name}</h1>
              <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
                <Youtube className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-mono font-semibold text-foreground">
                  {formatFullViewCount(totalViews)}
                </span>
                <span>total views across {videos.length} project{videos.length !== 1 ? "s" : ""}</span>
                {oldestSync && (
                  <span className="text-xs">
                    • Last synced {formatDistanceToNow(new Date(oldestSync), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>
        
        {/* Content */}
        {!loading && !error && (
          <>
            {videos.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Youtube className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No YouTube Projects Yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    This contact doesn't have any call sheets with synced YouTube videos.
                    Add YouTube URLs to call sheets and run a sync to see their portfolio.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate("/call-sheets")}
                  >
                    Go to Call Sheets
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {videos.map((video, index) => (
                    <button
                      key={video.id}
                      onClick={() => {
                        setSelectedVideo(video);
                        setSelectedIndex(index);
                      }}
                      className="group block rounded-lg overflow-hidden border bg-card hover:bg-accent/50 transition-colors text-left w-full"
                    >
                      {/* Thumbnail with duration badge */}
                      <div className="relative">
                        <AspectRatio ratio={16 / 9}>
                          {video.thumbnail_url ? (
                            <img
                              src={video.thumbnail_url}
                              alt={video.title || "Video thumbnail"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Youtube className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </AspectRatio>
                        {video.duration_seconds && video.duration_seconds > 0 && (
                          <Badge
                            variant="secondary"
                            className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-mono px-1.5 py-0.5"
                          >
                            {formatDuration(video.duration_seconds)}
                          </Badge>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="white" />
                        </div>
                      </div>
                      
                      {/* Video info */}
                      <div className="p-3 space-y-1">
                        <h3 className="font-medium text-sm line-clamp-2 leading-tight">
                          {video.title || "Untitled Video"}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="font-mono font-medium text-foreground">
                            {formatFullViewCount(video.view_count)}
                          </span>
                          <span>views</span>
                          {video.published_at && (
                            <>
                              <span className="mx-1">•</span>
                              <span>{formatRelativeTime(video.published_at)} ago</span>
                            </>
                          )}
                        </div>
                        {video.channel_title && (
                          <p className="text-xs text-muted-foreground truncate">
                            {video.channel_title}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Player Modal */}
                <YouTubePlayerModal
                  open={!!selectedVideo}
                  onOpenChange={(open) => {
                    if (!open) {
                      setSelectedVideo(null);
                      setSelectedIndex(-1);
                    }
                  }}
                  video={selectedVideo}
                  allVideos={videos}
                  currentIndex={selectedIndex}
                  onNavigate={(index) => {
                    setSelectedVideo(videos[index]);
                    setSelectedIndex(index);
                  }}
                  contactName={contact?.name || ""}
                />
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
