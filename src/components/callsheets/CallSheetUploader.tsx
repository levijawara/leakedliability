import { useState, useCallback } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProjectDetailsModal } from "./ProjectDetailsModal";

interface CallSheetUploaderProps {
  onUploadComplete?: () => void;
}

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ id: string; status: string; fileName: string } | null>(null);
  const [pendingProjectDetails, setPendingProjectDetails] = useState<{ globalCallSheetId: string } | null>(null);
  const { toast } = useToast();

  const processFile = async (file: File): Promise<void> => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({ title: "Invalid file", description: "Only PDF files are accepted.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { session }, error: sessionError } = await supabase!.auth.getSession();
      if (sessionError || !session?.user?.id) {
        throw new Error('Authentication required to upload call sheets');
      }
      const userId = session.user.id;

      // Hash
      const clientHash = await computeFileHash(file);

      // Check for duplicate
      const { data: existingData, error: checkError } = await supabase!
        .rpc('lookup_global_call_sheet_by_hash', { _content_hash: clientHash });

      if (checkError) throw new Error(`Hash check failed: ${checkError.message}`);

      const existing = existingData as { id: string; status: string } | null;

      if (existing) {
        setDuplicateInfo({ id: existing.id, status: existing.status, fileName: file.name });
        setIsProcessing(false);
        return;
      }

      // Upload new file
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const masterPath = `master/${clientHash}/${sanitizedName}`;

      const { error: uploadError } = await supabase!.storage
        .from('call_sheets')
        .upload(masterPath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // Create global record
      const { data: newSheet, error: insertError } = await supabase!
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

      if (insertError) throw new Error(`Failed to create record: ${insertError.message}`);

      // Create user link
      await supabase!
        .from('user_call_sheets')
        .insert({
          user_id: userId,
          global_call_sheet_id: newSheet.id,
          user_label: file.name
        });

      // Trigger parse (fire-and-forget)
      supabase!.functions.invoke('parse-call-sheet', {
        body: { call_sheet_id: newSheet.id }
      }).catch(err => console.warn('[Uploader] Background parse trigger failed:', err));

      toast({ title: "Upload complete", description: "Call sheet queued for parsing." });
      onUploadComplete?.();
      setPendingProjectDetails({ globalCallSheetId: newSheet.id });
    } catch (error: any) {
      console.error('[Uploader] Error:', error);
      toast({ title: "Upload failed", description: error.message || 'Something went wrong.', variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [isProcessing]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const confirmDuplicate = async () => {
    if (!duplicateInfo) return;
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session?.user?.id) return;
      await supabase!
        .from('user_call_sheets')
        .upsert({
          user_id: session.user.id,
          global_call_sheet_id: duplicateInfo.id,
          user_label: duplicateInfo.fileName
        }, { onConflict: 'user_id,global_call_sheet_id' });
      toast({ title: "Added", description: "Call sheet added to your list." });
      onUploadComplete?.();
      setDuplicateInfo(null);
      setPendingProjectDetails({ globalCallSheetId: duplicateInfo.id });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDuplicateInfo(null);
    }
  };

  const handleProjectDetailsSubmit = async (projectType: string | null, projectSubject: string | null) => {
    if (!pendingProjectDetails) return;
    const { data: { session } } = await supabase!.auth.getSession();
    if (!session?.user?.id) return;

    const { error } = await supabase!
      .from('user_call_sheets')
      .update({
        project_type: projectType,
        project_subject: projectSubject,
      })
      .eq('user_id', session.user.id)
      .eq('global_call_sheet_id', pendingProjectDetails.globalCallSheetId);

    if (error) {
      toast({ title: "Could not save details", description: error.message, variant: "destructive" });
      throw error;
    }
    setPendingProjectDetails(null);
  };

  return (
    <div className="space-y-4">
      <ProjectDetailsModal
        open={!!pendingProjectDetails}
        onOpenChange={(open) => { if (!open) setPendingProjectDetails(null); }}
        onSubmit={handleProjectDetailsSubmit}
      />
      <AlertDialog open={!!duplicateInfo} onOpenChange={(open) => { if (!open) setDuplicateInfo(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This call sheet already exists</AlertDialogTitle>
            <AlertDialogDescription>
              A call sheet with identical content has already been uploaded (possibly under a different filename). Would you like to add it to your list anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDuplicate}>Add to My Sheets</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        } ${isProcessing ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && document.getElementById('call-sheet-upload')?.click()}
      >
        {isProcessing ? (
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
        ) : (
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        )}
        <p className="text-lg font-medium">
          {isProcessing ? 'Uploading...' : 'Drag & drop a call sheet here'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {isProcessing ? 'Please wait' : 'or click to browse'}
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            PDF files only, max 10MB
          </span>
        </div>

        <input
          type="file"
          id="call-sheet-upload"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />
      </div>
    </div>
  );
}
