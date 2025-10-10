import { useCallback, useState } from "react";
import { Upload, X, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FileUploadZoneProps {
  label: string;
  description?: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  accept?: string;
}

export function FileUploadZone({ 
  label, 
  description, 
  files, 
  onFilesChange,
  maxFiles = 10,
  accept = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles = [...files, ...droppedFiles].slice(0, maxFiles);
    onFilesChange(newFiles);
  }, [files, maxFiles, onFilesChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles = [...files, ...selectedFiles].slice(0, maxFiles);
      onFilesChange(newFiles);
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">
          Drag & drop files here, or click to select
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Maximum {maxFiles} files, up to 50MB each
        </p>
        <input
          type="file"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          id={`file-upload-${label}`}
        />
        <label htmlFor={`file-upload-${label}`}>
          <Button type="button" variant="outline" size="sm" asChild>
            <span className="cursor-pointer">Choose Files</span>
          </Button>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="text-sm font-medium">{files.length} file(s) selected:</p>
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <FileIcon className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
