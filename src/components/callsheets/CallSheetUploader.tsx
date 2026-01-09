import { useState, useCallback, useRef } from "react";
import { Upload, FileText, Loader2, CheckCircle, XCircle, Copy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CallSheetUploaderProps {
  onUploadComplete?: () => void;
}

interface FileUploadState {
  file: File;
  status: 'pending' | 'hashing' | 'checking' | 'uploading' | 'queued' | 'duplicate' | 'error';
  message?: string;
  sheetId?: string;
}

const MAX_FILES = 50;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Compute SHA-256 hash of file bytes
async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function CallSheetUploader({ onUploadComplete }: CallSheetUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<FileUploadState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const processingRef = useRef(false);
  const { toast } = useToast();

  const updateFileStatus = (index: number, updates: Partial<FileUploadState>) => {
    setUploadQueue(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ));
  };

  const processFile = async (file: File, index: number): Promise<void> => {
    try {
      // Get authenticated user ID from live session - prevents RLS violations
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) {
        throw new Error('Authentication required to upload call sheets');
      }
      const userId = session.user.id;

      // Step 1: Hash
      updateFileStatus(index, { status: 'hashing' });
      const clientHash = await computeFileHash(file);
      console.log(`[BulkUploader] File ${index + 1}: hash computed`);

      // Step 2: Check for duplicate
      updateFileStatus(index, { status: 'checking' });
      const { data: existingData, error: checkError } = await supabase
        .rpc('lookup_global_call_sheet_by_hash', { _content_hash: clientHash });

      if (checkError) {
        throw new Error(`Hash check failed: ${checkError.message}`);
      }

      const existing = existingData as { id: string; status: string } | null;

      if (existing) {
        // Duplicate - link and mark
        await supabase
          .from('user_call_sheets')
          .upsert({
            user_id: userId,
            global_call_sheet_id: existing.id,
            user_label: file.name
          }, { onConflict: 'user_id,global_call_sheet_id' });

        updateFileStatus(index, { 
          status: 'duplicate', 
          sheetId: existing.id,
          message: existing.status === 'parsed' ? 'Already parsed' : 'Already queued'
        });
        return;
      }

      // Step 3: Upload new file
      updateFileStatus(index, { status: 'uploading' });
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const masterPath = `master/${clientHash}/${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('call_sheets')
        .upload(masterPath, file, {
          cacheControl: '3600',
          upsert: true // Safe: path includes content hash, so identical content
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Step 4: Create global record
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

      // Step 5: Create user link
      await supabase
        .from('user_call_sheets')
        .insert({
          user_id: userId,
          global_call_sheet_id: newSheet.id,
          user_label: file.name
        });

      // Step 6: Trigger parse (fire-and-forget - parsing happens in background)
      supabase.functions.invoke('parse-call-sheet', {
        body: { call_sheet_id: newSheet.id }
      }).catch(err => console.warn('[BulkUploader] Background parse trigger failed:', err));

      updateFileStatus(index, { 
        status: 'queued', 
        sheetId: newSheet.id,
        message: 'Queued for parsing'
      });

    } catch (error: any) {
      console.error(`[BulkUploader] File ${index + 1} error:`, error);
      updateFileStatus(index, { 
        status: 'error', 
        message: error.message || 'Upload failed'
      });
    }
  };

  const processBulkUpload = async (files: File[]) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    console.log(`[BulkUploader] Starting bulk upload of ${files.length} files`);

    for (let i = 0; i < files.length; i++) {
      setCurrentIndex(i);
      await processFile(files[i], i);
    }

    processingRef.current = false;
    setIsProcessing(false);

    // Summary
    const results = uploadQueue;
    const queued = results.filter(r => r.status === 'queued').length;
    const duplicates = results.filter(r => r.status === 'duplicate').length;
    const errors = results.filter(r => r.status === 'error').length;

    toast({
      title: "Bulk Upload Complete",
      description: `${queued} queued, ${duplicates} duplicates, ${errors} errors`,
    });

    onUploadComplete?.();
  };

  const handleBulkUpload = (files: File[]) => {
    // Validate and filter files
    const validFiles: File[] = [];
    const invalidFiles: { name: string; reason: string }[] = [];

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        invalidFiles.push({ name: file.name, reason: 'Not a PDF' });
      } else if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push({ name: file.name, reason: 'Exceeds 10MB' });
      } else {
        validFiles.push(file);
      }
    }

    if (invalidFiles.length > 0) {
      toast({
        title: `${invalidFiles.length} files rejected`,
        description: invalidFiles.slice(0, 3).map(f => `${f.name}: ${f.reason}`).join(', '),
        variant: "destructive"
      });
    }

    if (validFiles.length === 0) return;

    // Limit to MAX_FILES
    const filesToProcess = validFiles.slice(0, MAX_FILES);
    if (validFiles.length > MAX_FILES) {
      toast({
        title: "File limit reached",
        description: `Processing first ${MAX_FILES} files. You can upload more after.`,
      });
    }

    // Initialize queue
    const queue: FileUploadState[] = filesToProcess.map(file => ({
      file,
      status: 'pending'
    }));
    setUploadQueue(queue);
    setCurrentIndex(0);

    // Start processing
    processBulkUpload(filesToProcess);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (isProcessing) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleBulkUpload(files);
    }
  }, [isProcessing]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleBulkUpload(Array.from(e.target.files));
    }
    // Reset input so same files can be selected again
    e.target.value = '';
  };

  const resetUploader = () => {
    setUploadQueue([]);
    setCurrentIndex(0);
  };

  const getStatusIcon = (status: FileUploadState['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'hashing': 
      case 'checking':
      case 'uploading': return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'queued': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'duplicate': return <Copy className="h-4 w-4 text-blue-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusLabel = (item: FileUploadState) => {
    switch (item.status) {
      case 'pending': return 'Waiting...';
      case 'hashing': return 'Hashing...';
      case 'checking': return 'Checking...';
      case 'uploading': return 'Uploading...';
      case 'queued': return 'Queued ✓';
      case 'duplicate': return item.message || 'Duplicate';
      case 'error': return item.message || 'Error';
    }
  };

  // Show upload queue if files are being processed or completed
  if (uploadQueue.length > 0) {
    const completed = uploadQueue.filter(f => ['queued', 'duplicate', 'error'].includes(f.status)).length;
    const progress = Math.round((completed / uploadQueue.length) * 100);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">
              {isProcessing 
                ? `Processing ${currentIndex + 1} of ${uploadQueue.length}...` 
                : 'Upload Complete'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {uploadQueue.filter(f => f.status === 'queued').length} queued, {' '}
              {uploadQueue.filter(f => f.status === 'duplicate').length} duplicates, {' '}
              {uploadQueue.filter(f => f.status === 'error').length} errors
            </p>
          </div>
          {!isProcessing && (
            <Button variant="outline" size="sm" onClick={resetUploader}>
              Upload More
            </Button>
          )}
        </div>

        {isProcessing && (
          <Progress value={progress} className="h-2" />
        )}

        <ScrollArea className="h-64 rounded-md border">
          <div className="p-2 space-y-1">
            {uploadQueue.map((item, i) => (
              <div 
                key={i} 
                className={`flex items-center gap-3 p-2 rounded text-sm ${
                  i === currentIndex && isProcessing ? 'bg-primary/10' : 'bg-muted/50'
                }`}
              >
                {getStatusIcon(item.status)}
                <span className="truncate flex-1" title={item.file.name}>
                  {item.file.name}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {getStatusLabel(item)}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
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
        } ${isProcessing ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && document.getElementById('call-sheet-upload')?.click()}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium">
          Drag & drop call sheets here
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          or click to browse files
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            PDF files only, max 10MB each, up to 50 files at once
          </span>
        </div>

        <input
          type="file"
          id="call-sheet-upload"
          accept=".pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />
      </div>
    </div>
  );
}
