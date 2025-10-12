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
import { counterDisputeSchema } from "@/lib/validation";
import { uploadFiles } from "@/lib/storage";

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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedReportId, setValidatedReportId] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const validateReport = async (reportRef: string, userId: string) => {
    // Query payment_reports to find the report
    const { data: report, error: reportError } = await supabase
      .from('payment_reports')
      .select('id, reporter_id, report_id')
      .eq('report_id', reportRef)
      .maybeSingle();

    if (reportError) throw reportError;
    
    if (!report) {
      return { valid: false, error: "Report not found. Please check the Report ID." };
    }

    if (report.reporter_id !== userId) {
      return { valid: false, error: "You can only counter-dispute your own reports." };
    }

    // Check if there's an active dispute against this report
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select('id, status')
      .eq('payment_report_id', report.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (disputeError) throw disputeError;

    if (!dispute) {
      return { valid: false, error: "No active dispute found for this report." };
    }

    // Check if user already submitted a counter-dispute
    const { data: existingCounterDispute, error: counterError } = await supabase
      .from('submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('submission_type', 'counter_dispute')
      .contains('form_data', { original_report_ref: reportRef })
      .maybeSingle();

    if (counterError) throw counterError;

    if (existingCounterDispute) {
      return { valid: false, error: "You've already submitted a counter-dispute for this report." };
    }

    return { valid: true, error: null, reportId: report.id };
  };

  const handleReportRefChange = async (value: string) => {
    setOriginalReportRef(value);
    setValidationError(null);
    setValidatedReportId(null);

    if (!value.trim()) return;

    setIsValidating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const result = await validateReport(value.trim(), user.id);
      
      if (!result.valid) {
        setValidationError(result.error);
      } else {
        setValidatedReportId(result.reportId!);
      }
    } catch (error: any) {
      setValidationError("Error validating report. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Re-validate before submission
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to submit a counter-dispute",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const validationResult = await validateReport(originalReportRef.trim(), user.id);
      
      if (!validationResult.valid) {
        toast({
          title: "Validation Error",
          description: validationResult.error,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Validate text input
      const textValidation = counterDisputeSchema.safeParse({
        originalReportRef,
        explanation,
      });

      if (!textValidation.success) {
        toast({
          title: "Validation Error",
          description: textValidation.error.errors[0].message,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const documentUrls = await uploadFiles(evidenceFiles);

      const { error } = await supabase.from('submissions').insert({
        user_id: user.id,
        submission_type: 'counter_dispute',
        full_name: `${userInfo.firstName} ${userInfo.lastName}`,
        email: userInfo.email,
        role_department: userInfo.role,
        form_data: {
          original_report_ref: originalReportRef,
          payment_report_id: validationResult.reportId,
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

  const isValid = originalReportRef && 
                  validatedReportId && 
                  !validationError && 
                  explanation && 
                  evidenceFiles.length > 0;

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
            placeholder="e.g., CR-20250112-12345"
            value={originalReportRef}
            onChange={(e) => handleReportRefChange(e.target.value)}
            className={validationError ? "border-destructive" : validatedReportId ? "border-green-500" : ""}
          />
          
          {isValidating && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Validating report...
            </p>
          )}
          
          {validationError && (
            <p className="text-xs text-destructive mt-1">
              ⚠️ {validationError}
            </p>
          )}
          
          {validatedReportId && !validationError && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Report verified
            </p>
          )}
          
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
