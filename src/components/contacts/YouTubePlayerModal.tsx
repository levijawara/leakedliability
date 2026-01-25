```tsx
import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Youtube, Eye, Calendar, Copy, Check } from "lucide-react";
import { formatFullViewCount } from "@/lib/youtubeHelpers";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

// Copy Credits Dropdown Component
function CopyCreditsDropdown({ credits }: { credits: CreditEntry[] }) {
  const [copied, setCopied] = useState(false);

  const copyCredits = async (options: { abbreviated: boolean }) => {
    const text = credits
      .map((c) => {
        const role = c.role
          ? options.abbreviated
            ? abbreviateRole(c.role)
            : c.role
          : null;
        return role ? `${role}: ${c.name}` : c.name;
      })
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Credits copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy credits");
    }
  };

  if (!credits || credits.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 gap-1">
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          <span className="text-xs">Copy</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        <DropdownMenuLabel className="text-xs">Copy Credits</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => copyCredits({ abbreviated: true })}>
          Abbreviated Roles
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyCredits({ abbreviated: false })}>
          Full Role Names
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
      <DialogContent className="h-[90vh] max-w-6xl w-[95vw] overflow-hidden p-0 gap-0">
        <div className="flex h-full flex-col">
          {/* Top bar - fixed height, never scrolls */}
          <div className="shrink-0 border-b p-4 lg:p-5">
            <h2 className="font-semibold text-lg leading-tight line-clamp-2">
              {video.title || "Untitled Video"}
            </h2>
            {video.channel_title && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {video.channel_title}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-sm mt-2">
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
                    {formatDistanceToNow(new Date(video.published_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Main row - flex, fills remaining height */}
          <div className="flex flex-1 min-h-0">
            {/* Player - left side */}
            <div className="flex-1 min-w-0 bg-black flex items-center justify-center p-3">
              <div className="w-full h-full rounded-xl overflow-hidden">
                <AspectRatio ratio={16 / 9} className="h-full">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={video.title || "Video player"}
                  />
                </AspectRatio>
              </div>
            </div>

            {/* Credits - right side, scrolls internally */}
            <div className="w-[360px] shrink-0 border-l flex flex-col min-h-0">
              {/* Credits header - pinned */}
              <div className="shrink-0 px-4 py-3 border-b flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Project Credits
                </h3>
                <CopyCreditsDropdown credits={video.credits} />
              </div>

              {/* Credits list - scrollable */}
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full w-full">
                  {video.credits && video.credits.length > 0 ? (
                    <div className="space-y-1 font-mono text-sm p-4">
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
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      No credits available
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>

          {/* Bottom strip - fixed height, never scrolls */}
          {otherVideos.length > 0 && (
            <div className="shrink-0 border-t bg-muted/30 p-3 h-[140px]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-destructive" />
                  More from {contactName}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {otherVideos.length} other project
                  {otherVideos.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Horizontal carousel - scrolls sideways only */}
              <div
                className="flex gap-2 overflow-x-auto overflow-y-hidden pb-2"
                style={{ scrollbarWidth: "thin" }}
              >
                {otherVideos.map((v) => {
                  const originalIndex = allVideos.findIndex((av) => av.id === v.id);
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
```
