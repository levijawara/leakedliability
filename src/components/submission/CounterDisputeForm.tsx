import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUploadZone } from "./FileUploadZone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CounterDisputeFormProps {
  userInfo: { firstName: string; lastName: string; email: string; role: string };
  onBack: () => void;
  onSuccess: () => void;
}

export function CounterDisputeForm({ userInfo, onBack, onSuccess }: CounterDisputeFormProps) {
  const [loading, setLoading] = useState(false);
  const [originalReportRef, setOriginalReportRef] = useState("");
  const [explanation, setExplanation] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const uploadFiles = async (files: File[], userId: string) => {
    const uploadedUrls: string[] = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('submission-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      
      uploadedUrls.push(fileName);
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to submit a counter-dispute",
          variant: "destructive"
        });
        return;
      }

      const documentUrls = await uploadFiles(evidenceFiles, user.id);

      const { error } = await supabase.from('submissions').insert({
        user_id: user.id,
        submission_type: 'counter_dispute',
        full_name: `${userInfo.firstName} ${userInfo.lastName}`,
        email: userInfo.email,
        role_department: userInfo.role,
        form_data: {
          original_report_ref: originalReportRef,
          explanation: explanation
        },
        document_urls: documentUrls
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your counter-dispute has been submitted for review"
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isValid = originalReportRef && explanation && evidenceFiles.length > 0;

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold mb-4">Counter-Dispute ‼️</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Challenge a producer's dispute of your original report with evidence.
      </p>

      <div className="space-y-6">
        <div>
          <Label htmlFor="reportRef">Original Report Reference *</Label>
          <Input
            id="reportRef"
            placeholder="Report ID or reference number"
            value={originalReportRef}
            onChange={(e) => setOriginalReportRef(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            The reference number of your original crew member report
          </p>
        </div>

        <div>
          <Label htmlFor="explanation">Your Response *</Label>
          <Textarea
            id="explanation"
            placeholder="Explain why the producer's dispute is incorrect..."
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={6}
          />
        </div>

        <FileUploadZone
          label="Counter Evidence *"
          description="Documents that support your original claim and refute the producer's dispute"
          files={evidenceFiles}
          onFilesChange={setEvidenceFiles}
          maxFiles={10}
        />
      </div>

      <div className="flex gap-3 mt-8">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Counter-Dispute
        </Button>
      </div>
    </Card>
  );
}
