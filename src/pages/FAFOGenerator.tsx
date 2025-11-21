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
import { Rnd } from "react-rnd";

export default function FAFOGenerator() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [holdThatLFile, setHoldThatLFile] = useState<File[]>([]);
  const [proofFile, setProofFile] = useState<File[]>([]);
  const [showBlurPreview, setShowBlurPreview] = useState(false);
  const [blurBox, setBlurBox] = useState({ x: 0, y: 0, width: 400, height: 200 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [originalImageUrl, setOriginalImageUrl] = useState("");

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

  // Load original image when #HoldThatL file is uploaded
  useEffect(() => {
    if (holdThatLFile.length > 0) {
      loadOriginalImage(holdThatLFile[0]);
    }
  }, [holdThatLFile]);

  // Update blur box when display size is captured
  useEffect(() => {
    if (displaySize.width > 0 && imageSize.width > 0) {
      setBlurBox({
        x: 0,
        y: 0,
        width: displaySize.width,
        height: Math.floor(displaySize.height * 0.3)
      });
    }
  }, [displaySize.width, displaySize.height, imageSize.width, imageSize.height]);

  const loadOriginalImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setOriginalImageUrl(url);

      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        // Blur box will be initialized after display size is captured
        setShowBlurPreview(true);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
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
      
      // Scale blur box coordinates from display size to original image size
      const scaleX = imageSize.width / displaySize.width;
      const scaleY = imageSize.height / displaySize.height;
      
      const scaledRegion = {
        x: Math.round(blurBox.x * scaleX),
        y: Math.round(blurBox.y * scaleY),
        width: Math.round(blurBox.width * scaleX),
        height: Math.round(blurBox.height * scaleY)
      };
      
      console.log('[FAFO] Display blur box:', blurBox);
      console.log('[FAFO] Scaled to original:', scaledRegion);
      console.log('[FAFO] Scale factors:', { scaleX, scaleY });
      console.log('[FAFO] Image dimensions:', { original: imageSize, display: displaySize });
      
      // Apply blur with scaled coordinates
      const processedBlob = await blurIdentitySection(holdThatLFile[0], scaledRegion);
      
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
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Adjust Blur Region</DialogTitle>
            <DialogDescription>
              Drag and resize the red box to cover names/personal info.
            </DialogDescription>
          </DialogHeader>

          <div className="relative inline-block max-w-full mx-auto overflow-hidden rounded-lg border">
            <img 
              ref={(el) => {
                if (el && el.offsetWidth > 0) {
                  setDisplaySize({
                    width: el.offsetWidth,
                    height: el.offsetHeight
                  });
                }
              }}
              src={originalImageUrl} 
              alt="Original"
              className="max-w-full block"
              style={{ maxHeight: '70vh' }}
            />
            
            <Rnd
              size={{ width: blurBox.width, height: blurBox.height }}
              position={{ x: blurBox.x, y: blurBox.y }}
              bounds="parent"
              onDragStop={(e, d) => setBlurBox(prev => ({ ...prev, x: d.x, y: d.y }))}
              onResizeStop={(e, direction, ref, delta, position) => {
                setBlurBox({
                  width: parseInt(ref.style.width),
                  height: parseInt(ref.style.height),
                  ...position
                });
              }}
              className="border-2 border-red-500 border-dashed cursor-move"
              style={{
                backdropFilter: "blur(14px)",
                backgroundColor: "rgba(0,0,0,0.2)"
              }}
              enableResizing={{
                top: true, right: true, bottom: true, left: true,
                topRight: true, bottomRight: true, bottomLeft: true, topLeft: true
              }}
              resizeHandleStyles={{
                topRight: { width: 20, height: 20, right: -10, top: -10, cursor: 'ne-resize', backgroundColor: 'rgba(239, 68, 68, 0.8)', borderRadius: '50%' },
                bottomRight: { width: 20, height: 20, right: -10, bottom: -10, cursor: 'se-resize', backgroundColor: 'rgba(239, 68, 68, 0.8)', borderRadius: '50%' },
                bottomLeft: { width: 20, height: 20, left: -10, bottom: -10, cursor: 'sw-resize', backgroundColor: 'rgba(239, 68, 68, 0.8)', borderRadius: '50%' },
                topLeft: { width: 20, height: 20, left: -10, top: -10, cursor: 'nw-resize', backgroundColor: 'rgba(239, 68, 68, 0.8)', borderRadius: '50%' }
              }}
            >
              <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded pointer-events-none">
                {blurBox.width}×{blurBox.height}px
              </div>
            </Rnd>
          </div>

          <div className="text-sm text-muted-foreground space-y-1 bg-muted/50 p-3 rounded">
            <p>• <strong>Drag</strong> the box to reposition</p>
            <p>• <strong>Drag corners/edges</strong> to resize</p>
            <p>• Box cannot move outside image boundaries</p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowBlurPreview(false);
              setHoldThatLFile([]);
              setOriginalImageUrl("");
            }}>
              Cancel & Re-upload
            </Button>
            <Button variant="secondary" onClick={() => {
              setBlurBox({
                x: 0, y: 0,
                width: displaySize.width,
                height: Math.floor(displaySize.height * 0.3)
              });
            }}>
              Reset to Default
            </Button>
            <Button onClick={() => setShowBlurPreview(false)} className="bg-emerald-600 hover:bg-emerald-700">
              Looks Good – Proceed ✓
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
}
