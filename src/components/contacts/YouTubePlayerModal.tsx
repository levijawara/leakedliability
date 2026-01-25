import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Youtube, Eye, Calendar } from "lucide-react";
import { formatFullViewCount } from "@/lib/youtubeHelpers";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface CreditEntry {
  role: string | null;
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

export interface VideoWithCredits extends YouTubeVideo {
  credits: CreditEntry[];
  projectTitle: string | null;
}

interface YouTubePlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: VideoWithCredits | null;
  allVideos: VideoWithCredits[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  contactName: string;
}

// Role abbreviations for cleaner display
const ROLE_ABBREVIATIONS: Record<string, string> = {
  "Director of Photography": "DP",
  "1st Assistant Camera": "1st AC",
  "2nd Assistant Camera": "2nd AC",
  "1st Assistant Director": "1st AD",
  "2nd Assistant Director": "2nd AD",
  "Production Designer": "PD",
  "Art Director": "AD",
  "Costume Designer": "CD",
  "Hair & Makeup": "H&MU",
  "Sound Mixer": "Sound",
  "Boom Operator": "Boom",
  "Production Coordinator": "PC",
  "Production Manager": "PM",
  "Line Producer": "LP",
  "Executive Producer": "EP",
  "Key Grip": "KG",
  "Best Boy Grip": "BBG",
  "Best Boy Electric": "BBE",
  "Digital Imaging Technician": "DIT",
};

function abbreviateRole(role: string): string {
  return ROLE_ABBREVIATIONS[role] || role;
}

export function YouTubePlayerModal({
  open,
  onOpenChange,
  video,
  allVideos,
  currentIndex,
  onNavigate,
  contactName,
}: YouTubePlayerModalProps) {
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      } else if (e.key === "ArrowRight" && currentIndex < allVideos.length - 1) {
        onNavigate(currentIndex + 1);
      }
    };

    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, currentIndex, allVideos.length, onNavigate]);

  if (!video) return null;

  const embedUrl = `https://www.youtube.com/embed/${video.video_id}?rel=0&modestbranding=1&playsinline=1`;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allVideos.length - 1;

  // Get other videos for bottom strip (exclude current)
  const otherVideos = allVideos.filter((_, i) => i !== currentIndex);

  // Check if a name matches the contact (case-insensitive, partial match)
  const isContactMatch = (name: string) => {
    const contactLower = contactName.toLowerCase().trim();
    const nameLower = name.toLowerCase().trim();
    return nameLower.includes(contactLower) || contactLower.includes(nameLower);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] p-0 gap-0 overflow-hidden max-h-[90vh]">
        <div className="flex flex-col">
          {/* TOP: Video + Metadata/Credits */}
          <div className="flex flex-col lg:flex-row">
            {/* Video Player - Left Side */}
            <div className="flex-1 bg-black">
              <AspectRatio ratio={16 / 9}>
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={video.title || "Video player"}
                />
              </AspectRatio>
            </div>

            {/* Metadata + Credits Panel - Right Side */}
            <div className="w-full lg:w-80 p-4 lg:p-5 space-y-3 bg-background border-l flex flex-col max-h-[40vh] lg:max-h-none">
              {/* Title */}
              <div>
                <h2 className="font-semibold text-lg leading-tight line-clamp-2">
                  {video.title || "Untitled Video"}
                </h2>
                {video.channel_title && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {video.channel_title}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-3 text-sm pb-2 border-b">
                {video.view_count !== null && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span className="font-mono font-medium text-foreground">
                      {formatFullViewCount(video.view_count)}
                    </span>
                    <span>views</span>
                  </div>
                )}
                {video.published_at && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDistanceToNow(new Date(video.published_at), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>

              {/* PROJECT CREDITS */}
              {video.credits && video.credits.length > 0 && (
                <div className="flex-1 min-h-0 space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    Project Credits
                  </h3>
                  <ScrollArea className="h-32 lg:h-48">
                    <div className="space-y-1 font-mono text-sm pr-3">
                      {video.credits.map((credit, i) => {
                        const isMe = isContactMatch(credit.name);
                        return (
                          <div
                            key={i}
                            className={cn(
                              "flex gap-2 py-0.5 px-1 -mx-1 rounded",
                              isMe && "text-primary font-bold bg-primary/10"
                            )}
                          >
                            {credit.role && (
                              <span className="text-muted-foreground shrink-0">
                                {abbreviateRole(credit.role)}:
                              </span>
                            )}
                            <span className="truncate">{credit.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate(currentIndex - 1)}
                  disabled={!hasPrev}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <span className="text-xs text-muted-foreground">
                  {currentIndex + 1} of {allVideos.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate(currentIndex + 1)}
                  disabled={!hasNext}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* External link */}
              <a
                href={`https://www.youtube.com/watch?v=${video.video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Open on YouTube →
              </a>
            </div>
          </div>

          {/* BOTTOM: Horizontal "More From" Strip - Gallery Style */}
          {otherVideos.length > 0 && (
            <div className="border-t bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-destructive" />
                  More from {contactName}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {otherVideos.length} other project{otherVideos.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Horizontal scrolling container */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {otherVideos.map((v) => {
                  const originalIndex = allVideos.findIndex(av => av.id === v.id);
                  return (
                    <button
                      key={v.id}
                      onClick={() => onNavigate(originalIndex)}
                      className="flex-shrink-0 w-28 rounded overflow-hidden hover:ring-2 ring-primary transition-all group"
                    >
                      <AspectRatio ratio={16 / 9}>
                        {v.thumbnail_url ? (
                          <img
                            src={v.thumbnail_url}
                            alt={v.title || "Thumbnail"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Youtube className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </AspectRatio>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}