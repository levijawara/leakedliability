import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Youtube, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { usePortalMode, usePortalBase } from "@/contexts/PortalContext";
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
  const isPortal = usePortalMode();
  const portalBase = usePortalBase();

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
        
        // Step 1: Fetch linked call sheets
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
        
        // Step 2: Find which call sheets are in projects (NEW)
        const { data: userCallSheets } = await supabase
          .from("user_call_sheets")
          .select(`
            id,
            global_call_sheet_id,
            project_call_sheets (
              project_id
            )
          `)
          .in("global_call_sheet_id", callSheetIds);
        
        // Build set of unique project IDs and map global_sheet_id -> project_id
        const projectIds = new Set<string>();
        const sheetToProjectMap = new Map<string, string>();
        
        userCallSheets?.forEach(ucs => {
          const projectCallSheets = ucs.project_call_sheets as Array<{ project_id: string }> | null;
          if (projectCallSheets && projectCallSheets.length > 0) {
            const projectId = projectCallSheets[0].project_id;
            projectIds.add(projectId);
            sheetToProjectMap.set(ucs.global_call_sheet_id, projectId);
          }
        });
        
        // Step 3: Get project videos (NEW)
        let projectVideosMap = new Map<string, Array<{ video_id: string; youtube_video: any }>>();
        const projectCallSheetIds = new Set<string>();
        
        if (projectIds.size > 0) {
          const { data: projectVideosData } = await supabase
            .from("project_videos")
            .select(`
              project_id,
              video_id,
              youtube_videos!inner (*)
            `)
            .in("project_id", Array.from(projectIds));
          
          // Group videos by project_id
          projectVideosData?.forEach(pv => {
            const existing = projectVideosMap.get(pv.project_id) || [];
            existing.push({
              video_id: pv.video_id,
              youtube_video: pv.youtube_videos,
            });
            projectVideosMap.set(pv.project_id, existing);
          });
          
          // Get all call sheet IDs that belong to these projects (for credits)
          const { data: projectCallSheetsData } = await supabase
            .from("project_call_sheets")
            .select(`
              project_id,
              user_call_sheets!inner (
                global_call_sheet_id
              )
            `)
            .in("project_id", Array.from(projectIds));
          
          projectCallSheetsData?.forEach(pcs => {
            const ucs = pcs.user_call_sheets as { global_call_sheet_id: string } | null;
            if (ucs) {
              projectCallSheetIds.add(ucs.global_call_sheet_id);
            }
          });
        }
        
        // Step 4: Get legacy sheet-level videos
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
          .not("youtube_video_id", "is", null);
        
        if (sheetsError) throw sheetsError;
        
        // Step 5: Fetch credits - from all call sheets in projects + direct sheets
        const allSheetIdsForCredits = new Set([...callSheetIds, ...projectCallSheetIds]);
        
        const { data: contactLinks } = await supabase
          .from("contact_call_sheets")
          .select(`
            call_sheet_id,
            crew_contacts!inner (
              id,
              name,
              ig_handle,
              roles
            )
          `)
          .in("call_sheet_id", Array.from(allSheetIdsForCredits));

        // Build a map: call_sheet_id -> array of contacts with IG handles
        const sheetContactsMap = new Map<string, Array<{
          name: string;
          ig_handle: string | null;
          role: string | null;
        }>>();

        contactLinks?.forEach(link => {
          const contact = (link as any).crew_contacts;
          if (!contact) return;
          
          const existing = sheetContactsMap.get(link.call_sheet_id) || [];
          existing.push({
            name: contact.name,
            ig_handle: contact.ig_handle || null,
            role: contact.roles?.[0] || null,
          });
          sheetContactsMap.set(link.call_sheet_id, existing);
        });

        // Build credits for project videos (from ALL sheets in that project)
        const projectCreditsMap = new Map<string, CreditEntry[]>();
        
        if (projectIds.size > 0) {
          // Get all project_call_sheets to know which sheets belong to which project
          const { data: allProjectCallSheets } = await supabase
            .from("project_call_sheets")
            .select(`
              project_id,
              user_call_sheets!inner (
                global_call_sheet_id
              )
            `)
            .in("project_id", Array.from(projectIds));
          
          // Group sheet IDs by project
          const projectToSheetsMap = new Map<string, string[]>();
          allProjectCallSheets?.forEach(pcs => {
            const ucs = pcs.user_call_sheets as { global_call_sheet_id: string } | null;
            if (ucs) {
              const existing = projectToSheetsMap.get(pcs.project_id) || [];
              existing.push(ucs.global_call_sheet_id);
              projectToSheetsMap.set(pcs.project_id, existing);
            }
          });
          
          // Aggregate credits for each project from all its sheets
          projectToSheetsMap.forEach((sheetIds, projectId) => {
            const creditsMap = new Map<string, CreditEntry>(); // Dedupe by name
            sheetIds.forEach(sheetId => {
              const contacts = sheetContactsMap.get(sheetId) || [];
              contacts.forEach(c => {
                if (!creditsMap.has(c.name)) {
                  creditsMap.set(c.name, {
                    name: c.name,
                    role: c.role,
                    ig_handle: c.ig_handle,
                  });
                }
              });
            });
            projectCreditsMap.set(projectId, Array.from(creditsMap.values()));
          });
        }

        // Build credits map for sheet-level videos
        const sheetVideoCreditsMap = new Map<string, { credits: CreditEntry[]; title: string | null }>();
        
        sheetsData?.forEach(sheet => {
          if (!sheet.youtube_video_id) return;
          
          const linkedContacts = sheetContactsMap.get(sheet.id) || [];
          const credits: CreditEntry[] = linkedContacts.map(c => ({
            name: c.name,
            role: c.role,
            ig_handle: c.ig_handle,
          }));
          
          sheetVideoCreditsMap.set(sheet.youtube_video_id, {
            credits,
            title: sheet.project_title,
          });
        });
        
        // Collect all unique videos from BOTH sources
        const uniqueVideos = new Map<string, VideoWithCredits>();
        
        // Add project-level videos (prioritized)
        projectVideosMap.forEach((videos, projectId) => {
          const projectCredits = projectCreditsMap.get(projectId) || [];
          
          videos.forEach(({ youtube_video }) => {
            if (!youtube_video) return;
            const videoId = youtube_video.video_id;
            
            if (!uniqueVideos.has(videoId)) {
              uniqueVideos.set(videoId, {
                ...youtube_video,
                credits: projectCredits,
                projectTitle: null, // Could fetch project name if needed
              });
            }
          });
        });
        
        // Add sheet-level videos (only if not already added from projects)
        if (sheetsData && sheetsData.length > 0) {
          const sheetVideoIds = sheetsData
            .map(s => s.youtube_video_id)
            .filter((id): id is string => !!id);
          
          if (sheetVideoIds.length > 0) {
            const { data: sheetVideosData } = await supabase
              .from("youtube_videos")
              .select("*")
              .in("id", sheetVideoIds);
            
            sheetVideosData?.forEach(video => {
              if (!uniqueVideos.has(video.video_id)) {
                const creditsData = sheetVideoCreditsMap.get(video.id);
                uniqueVideos.set(video.video_id, {
                  ...video,
                  credits: creditsData?.credits || [],
                  projectTitle: creditsData?.title || null,
                });
              }
            });
          }
        }
        
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
      {!isPortal && <Navigation />}
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`${portalBase}/crew-contacts`)}
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
                    onClick={() => navigate(`${portalBase}/call-sheets`)}
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
