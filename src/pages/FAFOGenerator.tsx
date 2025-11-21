import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { FileUploadZone } from "@/components/submission/FileUploadZone";
import { blurIdentitySection } from "@/lib/imageProcessing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

export default function FAFOGenerator() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [holdThatLFile, setHoldThatLFile] = useState<File[]>([]);
  const [proofFile, setProofFile] = useState<File[]>([]);
  const [showBlurPreview, setShowBlurPreview] = useState(false);
  const [blurHeight, setBlurHeight] = useState(0.30);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast({
          title: "Access Denied",
          description: "Admin access required",
          variant: "destructive",
        });
        navigate('/results');
        return;
      }
      
      const { data } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'admin'
      });
      
      if (!data) {
        toast({
          title: "Access Denied",
          description: "Admin access required",
          variant: "destructive",
        });
        navigate('/results');
        return;
      }
      
      setIsAdmin(true);
      setIsLoading(false);
    };
    
    checkAdmin();
  }, [navigate]);

  // Auto-generate preview when #HoldThatL image is uploaded
  useEffect(() => {
    if (holdThatLFile.length > 0) {
      generateBlurPreview(holdThatLFile[0], blurHeight);
    }
  }, [holdThatLFile]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const generateBlurPreview = async (file: File, height: number) => {
    setIsGeneratingPreview(true);
    try {
      const processedBlob = await blurIdentitySection(file, height);
      const url = URL.createObjectURL(processedBlob);
      setPreviewUrl(url);
      setShowBlurPreview(true);
    } catch (error) {
      console.error('Preview generation error:', error);
      toast({
        title: "Preview Failed",
        description: "Could not generate blur preview",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleBlurHeightChange = (newHeight: number) => {
    setBlurHeight(newHeight);
    if (holdThatLFile.length > 0) {
      generateBlurPreview(holdThatLFile[0], newHeight);
    }
  };

  const handleSubmit = async () => {
    if (holdThatLFile.length === 0 || proofFile.length === 0) {
      toast({
        title: "Missing Files",
        description: "Both images are required",
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    
    const entryId = crypto.randomUUID();
    const uploadedPaths: string[] = [];
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Upload #HoldThatL image (blur identity section first)
      const holdThatLExt = holdThatLFile[0].name.split('.').pop();
      const holdThatLPath = `${entryId}/hold-that-l.${holdThatLExt}`;
      
      // Apply blur with custom height to anonymize identity section
      const processedBlob = await blurIdentitySection(holdThatLFile[0], blurHeight);
      
      const { error: holdThatLError } = await supabase.storage
        .from('fafo-results')
        .upload(holdThatLPath, processedBlob);
      
      if (holdThatLError) throw holdThatLError;
      uploadedPaths.push(holdThatLPath);
      
      // Upload proof image
      const proofExt = proofFile[0].name.split('.').pop();
      const proofPath = `${entryId}/proof.${proofExt}`;
      
      const { error: proofError } = await supabase.storage
        .from('fafo-results')
        .upload(proofPath, proofFile[0]);
      
      if (proofError) throw proofError;
      uploadedPaths.push(proofPath);
      
      // Insert database record
      const { error: dbError } = await supabase
        .from('fafo_entries')
        .insert({
          id: entryId,
          hold_that_l_image_path: holdThatLPath,
          proof_image_path: proofPath,
          created_by_admin_id: user.id
        });
      
      if (dbError) throw dbError;
      
      // Success!
      toast({
        title: "FAFO Entry Created! 💯",
        description: "The entry is now live on the Results page",
      });
      
      navigate('/results');
      
    } catch (error) {
      console.error('Upload error:', error);
      
      // Cleanup on failure: remove uploaded files
      if (uploadedPaths.length > 0) {
        try {
          await supabase.storage
            .from('fafo-results')
            .remove(uploadedPaths);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      }
      
      toast({
        title: "Upload Failed",
        description: "Failed to create FAFO entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-20 max-w-4xl">
          <h1 className="text-5xl font-black text-center mb-4">
            Fuck Around & Find Out Generator
          </h1>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Upload proof that producers paid up after getting exposed.
          </p>

          <Card className="p-8">
            <div className="space-y-8">
              {/* #HoldThatL Image Upload */}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  1. #HoldThatL Generator Image
                </h3>
                <FileUploadZone
                  label="Upload the black #HoldThatL callout image"
                  files={holdThatLFile}
                  onFilesChange={setHoldThatLFile}
                  maxFiles={1}
                  accept="image/*"
                />
              </div>

              {/* Proof Image Upload */}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  2. Payment Proof Screenshot
                </h3>
                <FileUploadZone
                  label="Upload screenshot confirming payment was made"
                  files={proofFile}
                  onFilesChange={setProofFile}
                  maxFiles={1}
                  accept="image/*"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={uploading || holdThatLFile.length === 0 || proofFile.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-12 py-6 text-xl rounded-lg shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {uploading ? "Processing & Uploading..." : "TALK TO 'EM! 💯"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Blur Preview Dialog */}
      <Dialog open={showBlurPreview} onOpenChange={setShowBlurPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview Blur Effect</DialogTitle>
            <DialogDescription>
              Adjust the slider to control how much of the top portion is blurred.
              Names and personal info should be completely unreadable.
            </DialogDescription>
          </DialogHeader>

          {/* Preview Image */}
          <div className="relative">
            {isGeneratingPreview ? (
              <div className="aspect-square bg-muted animate-pulse rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Generating preview...</p>
              </div>
            ) : (
              <img 
                src={previewUrl} 
                alt="Blurred preview" 
                className="w-full rounded-lg border"
              />
            )}
            
            {/* Visual indicator line showing blur boundary */}
            {!isGeneratingPreview && (
              <div 
                className="absolute left-0 right-0 border-t-2 border-red-500 border-dashed"
                style={{ top: `${blurHeight * 100}%` }}
              >
                <span className="absolute right-2 -top-6 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  Blur ends here ({Math.round(blurHeight * 100)}%)
                </span>
              </div>
            )}
          </div>

          {/* Blur Height Slider */}
          <div className="space-y-4">
            <label className="text-sm font-medium">
              Blur Height: {Math.round(blurHeight * 100)}%
            </label>
            <Slider
              value={[blurHeight * 100]}
              onValueChange={(value) => handleBlurHeightChange(value[0] / 100)}
              min={10}
              max={60}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 25-35% for standard #HoldThatL images
            </p>
          </div>

          {/* Action Buttons */}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowBlurPreview(false);
                setHoldThatLFile([]);
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl("");
              }}
            >
              Cancel & Re-upload
            </Button>
            <Button
              onClick={() => {
                setShowBlurPreview(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Looks Good – Proceed ✓
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
}
