import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UploadItem {
  id: string;
  file: File;
  status: "pending" | "uploading" | "processing" | "complete" | "error" | "duplicate";
  progress: number;
  error?: string;
  callSheetId?: string;
}

interface BatchUploadBinProps {
  onUploadComplete?: (callSheetIds: string[]) => void;
  maxFiles?: number;
  className?: string;
}

async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 100);
}

export function BatchUploadBin({
  onUploadComplete,
  maxFiles = 20,
  className,
}: BatchUploadBinProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const updateItem = (id: string, updates: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newItems: UploadItem[] = acceptedFiles.slice(0, maxFiles - items.length).map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "pending" as const,
        progress: 0,
      }));
      setItems((prev) => [...prev, ...newItems]);
    },
    [items.length, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
    disabled: isProcessing,
  });

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const processUpload = async (item: UploadItem, userId: string): Promise<string | null> => {
    try {
      updateItem(item.id, { status: "uploading", progress: 10 });

      // Compute content hash for duplicate detection
      const contentHash = await computeFileHash(item.file);
      updateItem(item.id, { progress: 30 });

      // Check for duplicate by hash (user-scoped)
      const { data: hashMatch } = await supabase
        .from("call_sheets")
        .select("id, file_name")
        .eq("content_hash", contentHash)
        .eq("user_id", userId)
        .maybeSingle();

      if (hashMatch) {
        updateItem(item.id, {
          status: "duplicate",
          error: `Duplicate of "${hashMatch.file_name}"`,
        });
        return null;
      }

      // Check for duplicate by filename (user-scoped)
      const { data: nameMatch } = await supabase
        .from("call_sheets")
        .select("id")
        .eq("file_name", item.file.name)
        .eq("user_id", userId)
        .maybeSingle();

      if (nameMatch) {
        updateItem(item.id, {
          status: "duplicate",
          error: "File with same name already exists",
        });
        return null;
      }

      updateItem(item.id, { progress: 50 });

      // Upload to storage (user-scoped path)
      const sanitizedName = sanitizeFileName(item.file.name);
      const filePath = `${userId}/${Date.now()}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from("call_sheets")
        .upload(filePath, item.file);

      if (uploadError) throw uploadError;

      updateItem(item.id, { progress: 70 });

      // Create call_sheets record
      const { data: insertedSheet, error: insertError } = await supabase
        .from("call_sheets")
        .insert({
          user_id: userId,
          file_name: item.file.name,
          file_path: filePath,
          content_hash: contentHash,
          status: "queued",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      updateItem(item.id, { status: "processing", progress: 85 });

      // Trigger parse queue
      const { error: parseError } = await supabase.functions.invoke("parse-queue", {
        body: { callSheetId: insertedSheet.id },
      });

      if (parseError) {
        console.warn("Parse queue error:", parseError);
        // Don't fail the upload, just log the warning
      }

      updateItem(item.id, {
        status: "complete",
        progress: 100,
        callSheetId: insertedSheet.id,
      });

      return insertedSheet.id;
    } catch (error: any) {
      console.error("Upload error:", error);
      updateItem(item.id, {
        status: "error",
        error: error.message || "Upload failed",
      });
      return null;
    }
  };

  const startUpload = async () => {
    const pendingItems = items.filter((item) => item.status === "pending");
    if (pendingItems.length === 0) return;

    setIsProcessing(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to upload call sheets");
      setIsProcessing(false);
      return;
    }

    const completedIds: string[] = [];

    // Process sequentially to avoid rate limits
    for (const item of pendingItems) {
      const callSheetId = await processUpload(item, user.id);
      if (callSheetId) {
        completedIds.push(callSheetId);
      }
    }

    setIsProcessing(false);

    if (completedIds.length > 0) {
      toast.success(`${completedIds.length} call sheet(s) uploaded successfully`);
      onUploadComplete?.(completedIds);
    }

    const errors = items.filter((item) => item.status === "error");
    if (errors.length > 0) {
      toast.error(`${errors.length} upload(s) failed`);
    }
  };

  const clearCompleted = () => {
    setItems((prev) => prev.filter((item) => item.status !== "complete" && item.status !== "duplicate"));
  };

  const getStatusIcon = (status: UploadItem["status"]) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "duplicate":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "uploading":
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const pendingCount = items.filter((item) => item.status === "pending").length;
  const completedCount = items.filter((item) => item.status === "complete").length;

  return (
    <div className={cn("space-y-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="mt-2 text-foreground font-medium">
          {isDragActive ? "Drop files here" : "Drag & drop call sheets"}
        </p>
        <p className="text-sm text-muted-foreground">
          or click to browse (up to {maxFiles} files)
        </p>
      </div>

      {items.length > 0 && (
        <>
          <ScrollArea className="h-[300px] rounded-md border">
            <div className="p-4 space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                >
                  {getStatusIcon(item.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                    {item.status === "uploading" || item.status === "processing" ? (
                      <Progress value={item.progress} className="h-1 mt-1" />
                    ) : item.error ? (
                      <p className="text-xs text-destructive">{item.error}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {(item.file.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                  {item.status === "pending" && !isProcessing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {pendingCount} pending, {completedCount} completed
            </p>
            <div className="flex gap-2">
              {completedCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearCompleted}>
                  Clear Completed
                </Button>
              )}
              {pendingCount > 0 && (
                <Button
                  size="sm"
                  onClick={startUpload}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    `Upload ${pendingCount} File${pendingCount > 1 ? "s" : ""}`
                  )}
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
