import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UploadBinProps {
  onFileSelect: (file: File) => void;
  onUploadComplete?: (filePath: string) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  accept?: Record<string, string[]>;
  maxSize?: number;
  className?: string;
}

export function UploadBin({
  onFileSelect,
  onUploadComplete,
  isUploading = false,
  uploadProgress = 0,
  accept = {
    "application/pdf": [".pdf"],
    "image/*": [".png", ".jpg", ".jpeg"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    "application/vnd.ms-excel": [".xls"],
    "text/csv": [".csv"],
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  className,
}: UploadBinProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          setError(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          setError("Invalid file type. Please upload a PDF, image, or spreadsheet.");
        } else {
          setError("File rejected. Please try another file.");
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled: isUploading,
  });

  const clearSelection = () => {
    setSelectedFile(null);
    setError(null);
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
          isUploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />

        {selectedFile && !isUploading ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                clearSelection();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-foreground font-medium">
              {isDragActive ? "Drop your call sheet here" : "Drag & drop a call sheet"}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse (PDF, images, spreadsheets up to 10MB)
            </p>
          </div>
        )}

        {isUploading && (
          <div className="mt-4 space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
