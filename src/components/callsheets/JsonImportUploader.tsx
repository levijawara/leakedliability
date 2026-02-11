import { useState, useCallback, useRef } from "react";
import { Upload, FileJson, Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MAX_FILES_PER_BATCH = 50;
const BATCH_SIZE = 25; // send 25 at a time to the edge function

interface FileResult {
  name: string;
  status: "pending" | "reading" | "sending" | "done" | "error";
  message?: string;
}

export function JsonImportUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [force, setForce] = useState(false);
  const [summary, setSummary] = useState<{
    matched: number;
    updated: number;
    skipped: number;
    unmatched: string[];
    errors: string[];
  } | null>(null);
  const processingRef = useRef(false);
  const { toast } = useToast();

  const processFiles = async (fileList: File[]) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    setSummary(null);

    const results: FileResult[] = fileList.map((f) => ({
      name: f.name,
      status: "pending" as const,
    }));
    setFiles(results);

    // Read all JSON files
    const claudeJsons: unknown[] = [];
    for (let i = 0; i < fileList.length; i++) {
      results[i].status = "reading";
      setFiles([...results]);

      try {
        const text = await fileList[i].text();
        const parsed = JSON.parse(text);
        claudeJsons.push(parsed);
        results[i].status = "done";
      } catch (err: any) {
        results[i].status = "error";
        results[i].message = "Invalid JSON";
      }
      setFiles([...results]);
    }

    const validJsons = claudeJsons.filter(Boolean);
    if (validJsons.length === 0) {
      processingRef.current = false;
      setIsProcessing(false);
      toast({ title: "No valid JSON files", variant: "destructive" });
      return;
    }

    // Mark all as sending
    for (const r of results) {
      if (r.status === "done") r.status = "sending";
    }
    setFiles([...results]);

    // Send in batches
    let totalMatched = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const allUnmatched: string[] = [];
    const allErrors: string[] = [];

    for (let i = 0; i < validJsons.length; i += BATCH_SIZE) {
      const batch = validJsons.slice(i, i + BATCH_SIZE);

      try {
        const { data, error } = await supabase.functions.invoke(
          "import-parsed-contacts",
          {
            body: { files: batch, force },
          }
        );

        if (error) throw error;

        totalMatched += data.matched || 0;
        totalUpdated += data.updated || 0;
        totalSkipped += data.skipped_already_parsed || 0;
        if (data.unmatched) allUnmatched.push(...data.unmatched);
        if (data.errors) allErrors.push(...data.errors);
      } catch (err: any) {
        console.error("[JsonImportUploader] batch error:", err);
        allErrors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err.message}`);
      }
    }

    // Mark all sending as done
    for (const r of results) {
      if (r.status === "sending") r.status = "done";
    }
    setFiles([...results]);

    const summaryData = {
      matched: totalMatched,
      updated: totalUpdated,
      skipped: totalSkipped,
      unmatched: allUnmatched,
      errors: allErrors,
    };
    setSummary(summaryData);

    toast({
      title: "JSON Import Complete",
      description: `${totalUpdated} updated, ${totalSkipped} skipped, ${allUnmatched.length} unmatched`,
    });

    processingRef.current = false;
    setIsProcessing(false);
  };

  const handleFiles = (incoming: File[]) => {
    const jsonFiles = incoming.filter((f) =>
      f.name.toLowerCase().endsWith(".json")
    );

    if (jsonFiles.length === 0) {
      toast({
        title: "No JSON files found",
        description: "Only .json files are accepted here.",
        variant: "destructive",
      });
      return;
    }

    const capped = jsonFiles.slice(0, MAX_FILES_PER_BATCH);
    if (jsonFiles.length > MAX_FILES_PER_BATCH) {
      toast({
        title: "File limit",
        description: `Processing first ${MAX_FILES_PER_BATCH}. Upload more after.`,
      });
    }

    processFiles(capped);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (isProcessing) return;
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) handleFiles(droppedFiles);
    },
    [isProcessing]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
    e.target.value = "";
  };

  const reset = () => {
    setFiles([]);
    setSummary(null);
  };

  // Results view
  if (files.length > 0) {
    const completed = files.filter((f) =>
      ["done", "error"].includes(f.status)
    ).length;
    const progress = Math.round((completed / files.length) * 100);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">
              {isProcessing ? "Importing..." : "Import Complete"}
            </h3>
            {summary && (
              <p className="text-sm text-muted-foreground">
                {summary.updated} updated, {summary.skipped} skipped,{" "}
                {summary.unmatched.length} unmatched, {summary.errors.length} errors
              </p>
            )}
          </div>
          {!isProcessing && (
            <Button variant="outline" size="sm" onClick={reset}>
              Import More
            </Button>
          )}
        </div>

        {isProcessing && <Progress value={progress} className="h-2" />}

        {summary && summary.unmatched.length > 0 && (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">
                {summary.unmatched.length} Unmatched Files
              </span>
            </div>
            <ScrollArea className="max-h-32">
              <div className="text-xs text-muted-foreground space-y-0.5">
                {summary.unmatched.map((name, i) => (
                  <div key={i} className="truncate">{name}</div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <ScrollArea className="h-48 rounded-md border">
          <div className="p-2 space-y-1">
            {files.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2 rounded text-sm bg-muted/50"
              >
                {item.status === "pending" && (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                {(item.status === "reading" || item.status === "sending") && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {item.status === "done" && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {item.status === "error" && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="truncate flex-1">{item.name}</span>
                {item.message && (
                  <span className="text-xs text-muted-foreground">
                    {item.message}
                  </span>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Drop zone
  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        } ${isProcessing ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() =>
          !isProcessing &&
          document.getElementById("json-import-upload")?.click()
        }
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium">
          Drag & drop parsed JSON files here
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          or click to browse files
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <FileJson className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Claude-extracted .json files, up to {MAX_FILES_PER_BATCH} at once
          </span>
        </div>

        <input
          type="file"
          id="json-import-upload"
          accept=".json"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch id="force-overwrite" checked={force} onCheckedChange={setForce} />
        <Label htmlFor="force-overwrite" className="text-sm text-muted-foreground">
          Overwrite already-parsed sheets
        </Label>
      </div>
    </div>
  );
}
