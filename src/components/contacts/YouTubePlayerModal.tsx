import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Youtube, Eye, Calendar } from "lucide-react";
import { formatFullViewCount } from "@/lib/youtubeHelpers";
import { formatDistanceToNow } from "date-fns";

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

interface YouTubePlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: YouTubeVideo | null;
  allVideos: YouTubeVideo[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  contactName: string;
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

  // Get other videos for "More from" section (exclude current)
  const otherVideos = allVideos.filter((_, i) => i !== currentIndex).slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] p-0 gap-0 overflow-hidden">
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

          {/* Metadata Panel - Right Side */}
          <div className="w-full lg:w-80 p-4 lg:p-6 space-y-4 bg-background border-l max-h-[50vh] lg:max-h-[80vh] overflow-y-auto">
            {/* Title */}
            <div>
              <h2 className="font-semibold text-lg leading-tight line-clamp-3">
                {video.title || "Untitled Video"}
              </h2>
              {video.channel_title && (
                <p className="text-sm text-muted-foreground mt-1">
                  {video.channel_title}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 text-sm">
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

            {/* More from this contact */}
            {otherVideos.length > 0 && (
              <div className="pt-2 border-t">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-destructive" />
                  More from {contactName}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {otherVideos.map((v, i) => {
                    const originalIndex = allVideos.findIndex(av => av.id === v.id);
                    return (
                      <button
                        key={v.id}
                        onClick={() => onNavigate(originalIndex)}
                        className="relative rounded overflow-hidden hover:ring-2 ring-primary transition-all"
                      >
                        <AspectRatio ratio={16 / 9}>
                          {v.thumbnail_url ? (
                            <img
                              src={v.thumbnail_url}
                              alt={v.title || "Thumbnail"}
                              className="w-full h-full object-cover"
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

            {/* External link (small, secondary) */}
            <div className="pt-2 border-t">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
