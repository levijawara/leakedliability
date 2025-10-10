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
import { producerSubmissionSchema } from "@/lib/validation";

interface ProducerSubmissionFormProps {
  userInfo: { firstName: string; lastName: string; email: string };
  submissionType: string;
  participantType: "producer" | "production_company";
  onBack: () => void;
  onSuccess: () => void;
}

export function ProducerSubmissionForm({ userInfo, submissionType, participantType, onBack, onSuccess }: ProducerSubmissionFormProps) {
  const [loading, setLoading] = useState(false);
  const [crewMemberName, setCrewMemberName] = useState("");
  const [explanation, setExplanation] = useState("");
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const titles = {
    payment_documentation: "Payment Documentation 🧾",
    report_explanation: "Report Explanation ☮️",
    report_dispute: "Report Dispute ⁉️"
  };

  const descriptions = {
    payment_documentation: "Submit payment receipts, confirmations, bank statements, etc.",
    report_explanation: "Acknowledge the debt and explain the delay or reason for non-payment",
    report_dispute: "Challenge a crew member's report with counter-evidence"
  };

  const uploadFiles = async (files: File[], userId: string) => {
    const uploadedUrls: string[] = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      // Use random UUID for filename to prevent enumeration attacks
      const randomId = crypto.randomUUID();
      const fileName = `${randomId}.${fileExt}`;
      
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
      // Validate input
      const validationResult = producerSubmissionSchema.safeParse({
        crewMemberName,
        explanation,
      });

      if (!validationResult.success) {
        toast({
          title: "Validation Error",
          description: validationResult.error.errors[0].message,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to submit",
          variant: "destructive"
        });
        return;
      }

      const documentUrls = await uploadFiles(documentFiles, user.id);

      const { error } = await supabase.from('submissions').insert({
        user_id: user.id,
        submission_type: submissionType,
        full_name: participantType === "producer" 
          ? `${userInfo.firstName} ${userInfo.lastName}`
          : userInfo.firstName,
        email: userInfo.email,
        form_data: {
          crew_member_name: crewMemberName,
          explanation: explanation,
          participant_type: participantType
        },
        document_urls: documentUrls
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your submission has been received and will be reviewed"
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

  const isValid = crewMemberName && documentFiles.length > 0;

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold mb-4">{titles[submissionType as keyof typeof titles]}</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {descriptions[submissionType as keyof typeof descriptions]}
      </p>

      <div className="space-y-6">
        <div>
          <Label htmlFor="crewName">Crew Member Name *</Label>
          <Input
            id="crewName"
            placeholder="Name of the crew member"
            value={crewMemberName}
            onChange={(e) => setCrewMemberName(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="explanation">
            {submissionType === "payment_documentation" ? "Additional Notes" : "Explanation *"}
          </Label>
          <Textarea
            id="explanation"
            placeholder={
              submissionType === "payment_documentation" 
                ? "Any additional context about the payment..."
                : submissionType === "report_explanation"
                ? "Explain the delay or reason for non-payment..."
                : "Explain why the crew member's report is incorrect..."
            }
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={6}
          />
        </div>

        <FileUploadZone
          label={submissionType === "payment_documentation" ? "Payment Proof *" : "Supporting Documents *"}
          description={
            submissionType === "payment_documentation"
              ? "Payment receipts, bank statements, confirmation emails, etc."
              : "Any documents that support your explanation or dispute"
          }
          files={documentFiles}
          onFilesChange={setDocumentFiles}
          maxFiles={10}
        />
      </div>

      <div className="flex gap-3 mt-8">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit
        </Button>
      </div>
    </Card>
  );
}
