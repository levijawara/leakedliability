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
import { producerSubmissionSchema, paymentDocumentationSchema } from "@/lib/validation";
import { uploadFiles } from "@/lib/storage";
import { sanitizeText } from "@/lib/sanitize";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ProducerSubmissionFormProps {
  userInfo: { firstName: string; lastName: string; email: string };
  submissionType: string;
  participantType: "producer" | "production_company";
  prefilledReportId?: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function ProducerSubmissionForm({ userInfo, submissionType, participantType, prefilledReportId, onBack, onSuccess }: ProducerSubmissionFormProps) {
  const [loading, setLoading] = useState(false);
  const [reportId, setReportId] = useState(prefilledReportId || "");
  const [crewMemberName, setCrewMemberName] = useState("");
  const [explanation, setExplanation] = useState("");
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [linkedProducerId, setLinkedProducerId] = useState<string | null>(null);
  const [availableReports, setAvailableReports] = useState<any[]>([]);
  const [emailVerified, setEmailVerified] = useState(true);
  const { toast } = useToast();

  const titles = {
    payment_documentation: "Payment Documentation",
    report_explanation: "Report Explanation",
    report_dispute: "Report Dispute"
  };

  const descriptions = {
    payment_documentation: "Submit payment receipts, confirmations, bank statements, etc.",
    report_explanation: "Acknowledge the debt and explain the delay or reason for non-payment",
    report_dispute: "Challenge a crew member's report with counter-evidence"
  };

  // Load producer account links and available reports
  useState(() => {
    const loadProducerData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check email verification
      if (!user.email_confirmed_at) {
        setEmailVerified(false);
      }

      // Check if user has a linked producer account
      const { data: linkData } = await supabase
        .from("producer_account_links")
        .select("producer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (linkData?.producer_id) {
        setLinkedProducerId(linkData.producer_id);
        
        // Load reports filed against this producer
        const { data: reports } = await supabase
          .from("payment_reports")
          .select("id, report_id, project_name, amount_owed, reporter_id")
          .eq("producer_id", linkData.producer_id)
          .neq("status", "paid")
          .order("created_at", { ascending: false });
        
        if (reports) {
          setAvailableReports(reports);
        }
      }
    };

    loadProducerData();
  });


  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Validate Report ID first
      if (!reportId.trim()) {
        toast({
          title: "Validation Error",
          description: "Report ID is required",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Look up the payment report to link to
      const { data: paymentReport, error: lookupError } = await supabase
        .from('payment_reports')
        .select('id, producer_id, producer_email')
        .eq('report_id', reportId.trim())
        .maybeSingle();

      if (lookupError) {
        toast({
          title: "Error",
          description: "Failed to verify Report ID",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (!paymentReport) {
        toast({
          title: "Invalid Report ID",
          description: "The Report ID you entered does not exist. Please check and try again.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // If user has a linked producer account, verify this report is filed against them
      if (linkedProducerId && paymentReport.producer_id !== linkedProducerId) {
        toast({
          title: "Invalid Report ID",
          description: "This report was not filed against your linked producer account.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Validate input - choose schema based on submission type
      const schema = submissionType === "payment_documentation" 
        ? paymentDocumentationSchema 
        : producerSubmissionSchema;

      const validationResult = schema.safeParse({
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

      // Check email verification
      if (!user.email_confirmed_at) {
        toast({
          title: "Email Not Verified",
          description: "Please verify your email before submitting",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const documentUrls = await uploadFiles(documentFiles);

      const { error } = await supabase.from('submissions').insert({
        user_id: user.id,
        submission_type: submissionType,
        full_name: participantType === "producer" 
          ? `${userInfo.firstName} ${userInfo.lastName}`
          : userInfo.firstName,
        email: userInfo.email,
        form_data: {
          report_id: reportId.trim(),
          payment_report_id: paymentReport.id,
          crew_member_name: crewMemberName,
          explanation: sanitizeText(explanation),
          participant_type: participantType
        },
        document_urls: documentUrls
      });

      if (error) throw error;

      // Send admin notification
      try {
        const submissionTypeLabel = submissionType === 'payment_documentation' 
          ? 'Payment Documentation' 
          : submissionType === 'report_explanation' 
            ? 'Report Explanation' 
            : 'Report Dispute';
        
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'admin_notification',
            to: 'leakedliability@gmail.com',
            data: {
              eventType: 'submission',
              submissionType: `Producer ${submissionTypeLabel}`,
              userName: participantType === "producer" 
                ? `${userInfo.firstName} ${userInfo.lastName}`
                : userInfo.firstName,
              userEmail: userInfo.email,
              details: `Report ID: ${reportId} | Crew: ${crewMemberName}`,
              adminDashboardUrl: 'https://leakedliability.com/admin',
            },
          },
        });
      } catch (notifyError) {
        console.debug('Admin notification failed:', notifyError);
      }

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

  const isValid = reportId.trim() && 
                  crewMemberName && 
                  documentFiles.length > 0 &&
                  (submissionType === "payment_documentation" || explanation.trim().length >= 10);

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold mb-4">{titles[submissionType as keyof typeof titles]}</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {descriptions[submissionType as keyof typeof descriptions]}
      </p>

      {!emailVerified && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your email is not verified. Please verify your email before submitting.
            <a href="/verify-email" className="underline ml-1">Go to verification page</a>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <div>
          <Label htmlFor="reportId">Report ID *</Label>
          <Input
            id="reportId"
            placeholder="CR-YYYYMMDD-XXXXX"
            value={reportId}
            onChange={(e) => setReportId(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Enter the Report ID from your notification email
          </p>
        </div>

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
        <Button onClick={handleSubmit} disabled={!isValid || loading || !emailVerified}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit
        </Button>
      </div>
    </Card>
  );
}
