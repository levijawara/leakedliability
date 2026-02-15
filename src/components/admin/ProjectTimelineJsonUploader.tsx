import { useRef, useState } from "react";
import { FileJson, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parse } from "date-fns";

/** Canonical call sheet JSON shape - see docs/CALL_SHEET_JSON_FORMAT.md */
interface CallSheetJson {
  source_file?: string;
  production_info: {
    production_name: string;
    date: string;
    company_name?: string;
  };
  crew_size?: number;
  crew: Array<{
    name: string;
    role: string;
    department: string;
    phone: string;
    email: string;
  }>;
}

function parseJobDate(dateStr: string): string | null {
  if (!dateStr?.trim()) return null;
  const formats = [
    "MMMM d, yyyy",  // June 10, 2025
    "MMM d, yyyy",   // Jun 10, 2025
    "M/d/yy",        // 6/10/25
    "M/d/yyyy",      // 6/10/2025
    "MM/dd/yy",
    "MM/dd/yyyy",
  ];
  for (const fmt of formats) {
    try {
      const d = parse(dateStr.trim(), fmt, new Date());
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } catch {
      continue;
    }
  }
  return null;
}

interface ProjectTimelineJsonUploaderProps {
  variant?: "default" | "compact";
  onSuccess?: () => void;
}

export function ProjectTimelineJsonUploader({ variant = "default", onSuccess }: ProjectTimelineJsonUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    e.target.value = "";

    const jsonFiles = files.filter((f) => f.name.toLowerCase().endsWith(".json"));
    if (jsonFiles.length !== files.length) {
      toast({
        title: "Invalid file(s)",
        description: "Only .json files are accepted.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    let added = 0;
    let lastCrewSize = 0;
    let lastName = "";
    try {
      for (const file of jsonFiles) {
        const text = await file.text();
        const json: CallSheetJson = JSON.parse(text);

        if (!json.production_info?.production_name) {
          toast({
            title: "Invalid JSON",
            description: `${file.name}: Missing production_info.production_name`,
            variant: "destructive",
          });
          continue;
        }

        // Crew size: only set when we have crew identity data. No crew list = leave blank (null).
        const hasCrewList = Array.isArray(json.crew) && json.crew.length > 0;
        const crewSize = hasCrewList
          ? (json.crew_size ?? json.crew.length)
          : null;
        const jobDate = json.production_info?.date
          ? parseJobDate(json.production_info.date)
          : null;

        const { error } = await supabase.from("production_instances").insert({
          production_name: json.production_info.production_name,
          company_name: json.production_info.company_name ?? null,
          primary_contacts: Array.isArray(json.crew) && json.crew.length > 0 ? json.crew.slice(0, 5).map((c) => ({ name: c.name, role: c.role })) : [],
          shoot_start_date: jobDate,
          extracted_date: jobDate,
          crew_size: crewSize,
          verification_status: "unverified",
        });

        if (error) throw error;
        added++;
        lastName = json.production_info.production_name;
        lastCrewSize = crewSize;
      }

      if (added > 0) {
        toast({
          title: "Added to Project Timeline",
          description: added === 1
            ? (lastCrewSize != null ? `${lastName} (crew: ${lastCrewSize})` : lastName)
            : `${added} productions added`,
        });
        onSuccess?.();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process JSON";
      toast({
        title: "Upload failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const trigger = () => inputRef.current?.click();

  if (variant === "compact") {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          multiple
          className="hidden"
          onChange={handleFile}
          disabled={uploading}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={trigger}
          disabled={uploading}
          className="gap-2"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
          .JSON
        </Button>
      </>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        multiple
        className="hidden"
        onChange={handleFile}
        disabled={uploading}
      />
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={trigger}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileJson className="h-5 w-5" />}
        Upload .JSON to Project Timeline
      </Button>
    </>
  );
}
