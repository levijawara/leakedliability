import { useState } from "react";
import { Plus, X, Youtube, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { extractYouTubeVideoId, formatViewCount } from "@/lib/youtubeHelpers";

interface ProjectVideo {
  id: string;
  video_id: string;
  title: string | null;
  view_count: number | null;
  thumbnail_url: string | null;
}

interface ProjectVideoLinkerProps {
  projectId: string;
  videos: ProjectVideo[];
  onVideosChange: (videos: ProjectVideo[]) => void;
}

export function ProjectVideoLinker({
  projectId,
  videos,
  onVideosChange,
}: ProjectVideoLinkerProps) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAddVideo = async () => {
    if (!urlInput.trim()) return;

    const videoId = extractYouTubeVideoId(urlInput.trim());
    if (!videoId) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL.",
        variant: "destructive",
      });
      return;
    }

    // Check if already linked
    if (videos.some((v) => v.video_id === videoId)) {
      toast({
        title: "Already linked",
        description: "This video is already linked to this project.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Check if video exists in youtube_videos
      let { data: existingVideo } = await supabase
        .from("youtube_videos")
        .select("*")
        .eq("video_id", videoId)
        .maybeSingle();

      // 2. If not, create a placeholder (sync will fill details)
      if (!existingVideo) {
        const { data: newVideo, error: insertError } = await supabase
          .from("youtube_videos")
          .insert({
            video_id: videoId,
            title: `YouTube Video (${videoId})`,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        existingVideo = newVideo;
      }

      // 3. Link to project
      const { error: linkError } = await supabase
        .from("project_videos")
        .insert({
          project_id: projectId,
          video_id: existingVideo.id,
          youtube_url: urlInput.trim(),
        });

      if (linkError) throw linkError;

      // 4. Update local state
      onVideosChange([...videos, existingVideo as ProjectVideo]);

      toast({
        title: "Video linked",
        description: existingVideo.title || "Video added to project.",
      });

      setUrlInput("");
      setIsAdding(false);
    } catch (error: any) {
      console.error("[ProjectVideoLinker] Error:", error);
      toast({
        title: "Failed to add video",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    try {
      // Find the youtube_videos record ID
      const videoRecord = videos.find((v) => v.video_id === videoId);
      if (!videoRecord) return;

      const { error } = await supabase
        .from("project_videos")
        .delete()
        .eq("project_id", projectId)
        .eq("video_id", videoRecord.id);

      if (error) throw error;

      onVideosChange(videos.filter((v) => v.video_id !== videoId));

      toast({
        title: "Video removed",
        description: "Video unlinked from project.",
      });
    } catch (error: any) {
      console.error("[ProjectVideoLinker] Remove error:", error);
      toast({
        title: "Failed to remove video",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Video chips */}
      <div className="flex flex-wrap gap-2">
        {videos.map((video) => (
          <Badge
            key={video.id}
            variant="secondary"
            className="flex items-center gap-2 py-1.5 px-3 text-sm"
          >
            <Youtube className="h-3.5 w-3.5 text-destructive" />
            <span className="max-w-[180px] truncate">
              {video.title || video.video_id}
            </span>
            {video.view_count !== null && (
              <span className="text-xs text-muted-foreground">
                {formatViewCount(video.view_count)}
              </span>
            )}
            <a
              href={`https://youtube.com/watch?v=${video.video_id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hover:text-primary"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={() => handleRemoveVideo(video.video_id)}
              className="hover:text-destructive ml-1"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        {/* Add button or input */}
        {isAdding ? (
          <div className="flex items-center gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste YouTube URL..."
              className="h-8 w-64"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddVideo();
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setUrlInput("");
                }
              }}
            />
            <Button
              size="sm"
              variant="default"
              onClick={handleAddVideo}
              disabled={isProcessing || !urlInput.trim()}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAdding(false);
                setUrlInput("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAdding(true)}
            className="h-7"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Video
          </Button>
        )}
      </div>
    </div>
  );
}
