import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CallSheetUploaderProps {
  userId: string;
}

export function CallSheetUploader({ userId }: CallSheetUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const { toast } = useToast();

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({
        title: "Invalid File Type",
        description: "Only PDF files are accepted for call sheets.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 10MB.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${userId}/${timestamp}_${sanitizedName}`;

      setUploadProgress(30);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('call_sheets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setUploadProgress(60);

      // Create call_sheets record
      const { data: callSheet, error: insertError } = await supabase
        .from('call_sheets')
        .insert({
          user_id: userId,
          file_name: file.name,
          file_path: filePath,
          status: 'queued'
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create record: ${insertError.message}`);
      }

      setUploadProgress(80);

      // Trigger immediate parsing
      const { error: parseError } = await supabase.functions.invoke('parse-call-sheet', {
        body: { call_sheet_id: callSheet.id }
      });

      if (parseError) {
        console.warn('Parse trigger failed, will be picked up by queue:', parseError);
      }

      setUploadProgress(100);
      setUploadedFile(file.name);

      toast({
        title: "Upload Successful",
        description: "Your call sheet is being processed. Check the 'My Call Sheets' tab for status.",
      });

      // Reset after delay
      setTimeout(() => {
        setUploadedFile(null);
        setUploadProgress(0);
      }, 3000);

    } catch (error: any) {
      console.error('[CallSheetUploader] Error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  }, [userId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files[0]);
    }
  };

  if (uploadedFile) {
    return (
      <div className="border-2 border-dashed border-green-500 rounded-lg p-8 text-center bg-green-500/5">
        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
        <p className="text-lg font-medium text-green-600 dark:text-green-400">
          Upload Complete!
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {uploadedFile} is now being processed
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-primary/50"
        } ${uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && document.getElementById('call-sheet-upload')?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-lg font-medium">Uploading...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Please wait while your file is being uploaded
            </p>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">
              Drag & drop your call sheet here
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse files
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                PDF files only, max 10MB
              </span>
            </div>
          </>
        )}

        <input
          type="file"
          id="call-sheet-upload"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {uploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            {uploadProgress < 30 && "Uploading file..."}
            {uploadProgress >= 30 && uploadProgress < 60 && "Saving to storage..."}
            {uploadProgress >= 60 && uploadProgress < 80 && "Creating record..."}
            {uploadProgress >= 80 && "Starting parse..."}
          </p>
        </div>
      )}
    </div>
  );
}
