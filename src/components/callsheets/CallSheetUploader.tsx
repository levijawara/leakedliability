import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CallSheetUploaderProps {
  userId: string;
  onUploadComplete?: () => void;
}

// Compute SHA-256 hash of file bytes
async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function CallSheetUploader({ userId, onUploadComplete }: CallSheetUploaderProps) {
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
      // Step 1: Compute hash client-side
      console.log('[CallSheetUploader] Computing file hash...');
      const clientHash = await computeFileHash(file);
      console.log(`[CallSheetUploader] Client hash computed: ${clientHash.slice(0, 12)}...`);

      setUploadProgress(20);

      // Step 2: Check if artifact exists globally
      const { data: existing, error: checkError } = await supabase
        .from('global_call_sheets')
        .select('id, status')
        .eq('content_hash', clientHash)
        .maybeSingle();

      if (checkError) {
        console.error('[CallSheetUploader] Hash check error:', checkError);
        throw new Error(`Hash check failed: ${checkError.message}`);
      }

      setUploadProgress(30);

      if (existing) {
        // Duplicate detected - artifact already exists
        console.log(`[CallSheetUploader] Duplicate detected, artifact exists: ${existing.id}`);

        // Create user link (upsert to handle re-uploads)
        const { error: linkError } = await supabase
          .from('user_call_sheets')
          .upsert({
            user_id: userId,
            global_call_sheet_id: existing.id,
            user_label: file.name
          }, { onConflict: 'user_id,global_call_sheet_id' });

        if (linkError) {
          console.error('[CallSheetUploader] Link creation error:', linkError);
          throw new Error(`Failed to link call sheet: ${linkError.message}`);
        }

        setUploadProgress(100);
        setUploadedFile(file.name);

        toast({
          title: "Already parsed!",
          description: "This call sheet was previously uploaded. Ready to review your contacts.",
        });

        onUploadComplete?.();

        // Reset after delay
        setTimeout(() => {
          setUploadedFile(null);
          setUploadProgress(0);
        }, 3000);

        return;
      }

      // Step 3: New artifact - upload to master bucket path
      console.log('[CallSheetUploader] New artifact - uploading to master path...');
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const masterPath = `master/${clientHash}/${sanitizedName}`;

      setUploadProgress(40);

      const { error: uploadError } = await supabase.storage
        .from('call_sheets')
        .upload(masterPath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setUploadProgress(60);

      // Step 4: Create global artifact record
      console.log('[CallSheetUploader] Creating global artifact record...');
      const { data: newSheet, error: insertError } = await supabase
        .from('global_call_sheets')
        .insert({
          content_hash: clientHash,
          master_file_path: masterPath,
          original_file_name: file.name,
          first_uploaded_by: userId,
          status: 'queued'
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create record: ${insertError.message}`);
      }

      setUploadProgress(75);

      // Step 5: Create user link
      console.log('[CallSheetUploader] Creating user link...');
      const { error: linkError } = await supabase
        .from('user_call_sheets')
        .insert({
          user_id: userId,
          global_call_sheet_id: newSheet.id,
          user_label: file.name
        });

      if (linkError) {
        console.error('[CallSheetUploader] Link creation error:', linkError);
        // Don't throw - the artifact was created successfully
      }

      setUploadProgress(85);

      // Step 6: Trigger parsing
      console.log('[CallSheetUploader] Triggering parse...');
      const { error: parseError } = await supabase.functions.invoke('parse-call-sheet', {
        body: { call_sheet_id: newSheet.id }
      });

      if (parseError) {
        console.warn('[CallSheetUploader] Parse trigger failed, will be picked up by queue:', parseError);
      }

      setUploadProgress(100);
      setUploadedFile(file.name);

      console.log(`[CallSheetUploader] New artifact created: ${newSheet.id}, queued for parsing`);

      toast({
        title: "Upload Successful",
        description: "Your call sheet is being processed. Check the 'My Call Sheets' tab for status.",
      });

      onUploadComplete?.();

      // Reset after delay
      setTimeout(() => {
        setUploadedFile(null);
        setUploadProgress(0);
      }, 3000);

    } catch (error: any) {
      console.error('[CallSheetUploader] Error:', error);
      
      // Handle rate limit error specifically
      if (error.message?.includes('RATE_LIMIT_EXCEEDED')) {
        toast({
          title: "Upload Limit Reached",
          description: "You can upload up to 20 call sheets per hour. Please try again later.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Upload Failed",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive"
        });
      }
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
            {uploadProgress < 20 && "Computing file hash..."}
            {uploadProgress >= 20 && uploadProgress < 30 && "Checking for duplicates..."}
            {uploadProgress >= 30 && uploadProgress < 60 && "Uploading to storage..."}
            {uploadProgress >= 60 && uploadProgress < 75 && "Creating record..."}
            {uploadProgress >= 75 && uploadProgress < 85 && "Linking to your account..."}
            {uploadProgress >= 85 && "Starting parse..."}
          </p>
        </div>
      )}
    </div>
  );
}
