import { useState } from "react";
import { Youtube, ExternalLink, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface YouTubeUrlEditorProps {
  callSheetId: string;
  currentUrl: string | null;
  onUpdate: (newUrl: string | null) => void;
}

/**
 * Extract YouTube video ID to validate URL format
 */
function isValidYouTubeUrl(url: string): boolean {
  if (!url.trim()) return false;
  
  try {
    const parsed = new URL(url);
    
    if (parsed.hostname.includes("youtube.com")) {
      return !!parsed.searchParams.get("v") || /\/(embed|v)\/[^/?]+/.test(parsed.pathname);
    }
    
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.length > 1;
    }
    
    return false;
  } catch {
    return false;
  }
}

export function YouTubeUrlEditor({ callSheetId, currentUrl, onUpdate }: YouTubeUrlEditorProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(currentUrl || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmedUrl = url.trim();
    
    if (trimmedUrl && !isValidYouTubeUrl(trimmedUrl)) {
      toast({
        title: "Invalid YouTube URL",
        description: "Please enter a valid YouTube video link",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("global_call_sheets")
        .update({ youtube_url: trimmedUrl || null })
        .eq("id", callSheetId);

      if (error) throw error;

      onUpdate(trimmedUrl || null);
      setIsEditing(false);
      toast({ title: trimmedUrl ? "YouTube link saved" : "YouTube link removed" });
    } catch (error: any) {
      console.error("[YouTubeUrlEditor] Save error:", error);
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setUrl(currentUrl || "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="url"
          placeholder="https://youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-8 text-xs flex-1"
          disabled={saving}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCancel}
          disabled={saving}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2">
        {currentUrl ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Youtube className="h-4 w-4" />
                  <ExternalLink className="h-3 w-3" />
                </a>
              </TooltipTrigger>
              <TooltipContent>Open video</TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={() => setIsEditing(true)}
          >
            <Youtube className="h-3 w-3" />
            Add YouTube
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}
