import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { FileUploadZone } from "@/components/submission/FileUploadZone";

export default function FAFOGenerator() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [holdThatLFile, setHoldThatLFile] = useState<File[]>([]);
  const [proofFile, setProofFile] = useState<File[]>([]);

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
      
      // Upload #HoldThatL image
      const holdThatLExt = holdThatLFile[0].name.split('.').pop();
      const holdThatLPath = `${entryId}/hold-that-l.${holdThatLExt}`;
      
      const { error: holdThatLError } = await supabase.storage
        .from('fafo-results')
        .upload(holdThatLPath, holdThatLFile[0]);
      
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
                  {uploading ? "Uploading..." : "TALK TO 'EM! 💯"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
}
