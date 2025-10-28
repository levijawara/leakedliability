import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploadZone } from "./FileUploadZone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import { paymentConfirmationSchema } from "@/lib/validation";
import { uploadFiles } from "@/lib/storage";
import { mapDatabaseError } from "@/lib/errors";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaymentConfirmationFormProps {
  userInfo: { firstName: string; lastName: string; email: string; role: string };
  onBack: () => void;
  onSuccess: () => void;
}

export function PaymentConfirmationForm({ userInfo, onBack, onSuccess }: PaymentConfirmationFormProps) {
  const [loading, setLoading] = useState(false);
  const [paymentReports, setPaymentReports] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPaymentReports();
  }, []);

  const loadPaymentReports = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('payment_reports')
      .select('id, producer_id, amount_owed, project_name, producers(name)')
      .eq('reporter_id', user.id)
      .neq('status', 'paid')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPaymentReports(data);
    }
  };


  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to submit a confirmation",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (!selectedReportId) {
        toast({
          title: "Error",
          description: "Please select a payment report to confirm",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Re-verify ownership before submission
      const { data: verifyReport, error: verifyError } = await supabase
        .from('payment_reports')
        .select('id, reporter_id, producer_id, amount_owed')
        .eq('id', selectedReportId)
        .eq('reporter_id', user.id)
        .maybeSingle();

      if (verifyError || !verifyReport) {
        toast({
          title: "Error",
          description: "Could not verify ownership of this report",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (verifyReport.reporter_id !== user.id) {
        toast({
          title: "Error",
          description: "You can only confirm payment for reports you submitted",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const selectedReport = verifyReport;

      const documentUrls = await uploadFiles(proofFiles);

      // Validate selectedReportId before INSERT
      if (!selectedReportId || selectedReportId === "null" || selectedReportId === "undefined") {
        console.error('[PaymentConfirm] Invalid report ID:', selectedReportId);
        toast({
          title: "Error",
          description: "Invalid report ID. Please refresh the page and select again.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Log diagnostic info before INSERT
      console.log('[PaymentConfirm] selectedReportId:', selectedReportId);
      console.log('[PaymentConfirm] selectedReport:', selectedReport);

      // Build a clean, type-safe payload for the insert
      const payload = {
        payment_report_id: selectedReport?.id ?? null, // Use DB UUID, not UI state
        producer_id: selectedReport?.producer_id ?? null,
        confirmer_id: user?.id ?? null,
        amount_paid:
          typeof selectedReport?.amount_owed === "number"
            ? selectedReport.amount_owed
            : parseFloat(selectedReport?.amount_owed || "0"),
        confirmation_type: "producer_documentation" as const, // Must match DB ENUM
        payment_proof_url:
          documentUrls?.length && typeof documentUrls[0] === "string"
            ? documentUrls[0]
            : null,
        notes: `Self-service confirmation submitted on ${new Date().toISOString()}`,
      };

      // Log outgoing payload for debugging
      console.log("[PaymentConfirm] Payload:", payload);

      // Guard clause: ensure critical UUIDs are present
      if (!payload.payment_report_id || !payload.confirmer_id) {
        console.error("[PaymentConfirm] Invalid IDs in payload:", payload);
        toast({
          title: "Error",
          description:
            "Missing or invalid report ID. Please refresh the page and try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Insert payment confirmation record - triggers auto-verification via database trigger
      const { data: confirmData, error: insertError } = await supabase
        .from("payment_confirmations")
        .insert(payload)
        .select("id")
        .single();

      console.log('[PaymentConfirm] insert result:', { confirmData, insertError });

      if (insertError) {
        console.error('[PaymentConfirm] insertError:', insertError);
        toast({
          title: "Error",
          description: mapDatabaseError(insertError),
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (!confirmData) {
        console.warn('[PaymentConfirm] No confirmation created');
        toast({
          title: "Error",
          description: "Your confirmation couldn't be recorded. Please try again or contact support.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Delete queued producer notification if it exists (not yet sent)
      const { error: deleteQueueError } = await supabase
        .from('queued_producer_notifications')
        .delete()
        .eq('payment_report_id', selectedReportId)
        .is('sent_at', null);

      if (deleteQueueError) {
        console.error('Could not delete queued notification:', deleteQueueError);
      }

      // Wrap success-side UI actions to prevent false error toasts
      try {
        console.log("[PaymentConfirm] Success branch reached — showing success toast and calling onSuccess");
        toast({
          title: "Confirmation Submitted",
          description: "Your payment confirmation has been recorded and will update the leaderboard.",
        });
        onSuccess?.();
        setProofFiles([]);
        setSelectedReportId("");
      } catch (uiError) {
        console.error("[PaymentConfirm] UI or callback error:", uiError);
      }
    } catch (error: any) {
      console.error("[PaymentConfirm] Fatal error:", error);
      toast({
        title: "Error",
        description: mapDatabaseError(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedReport = paymentReports.find(r => r.id === selectedReportId);
  const isValid = selectedReportId; // Files are optional

  return (
    <>
      <Card className="p-8">
        <h2 className="text-2xl font-bold mb-4">Payment Confirmation ✅</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Confirm when you've been paid. Delays may damage your credibility and freelance relationships.
        </p>

        <div className="space-y-6">
          <div>
            <Label htmlFor="reportSelect">Select Your Report to Confirm *</Label>
            <Select value={selectedReportId} onValueChange={setSelectedReportId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose the report you're confirming payment for" />
              </SelectTrigger>
              <SelectContent>
                {paymentReports.map((report) => (
                  <SelectItem key={report.id} value={report.id}>
                    {report.producers?.name} - {report.project_name} (${report.amount_owed})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedReport && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm"><strong>Producer:</strong> {selectedReport.producers?.name}</p>
              <p className="text-sm"><strong>Project:</strong> {selectedReport.project_name}</p>
              <p className="text-sm"><strong>Amount:</strong> ${selectedReport.amount_owed}</p>
            </div>
          )}

          <FileUploadZone
            label="Payment Proof (Optional)"
            description="Bank statements, payment confirmations, receipts, etc. Not required, but helpful for disputes."
            files={proofFiles}
            onFilesChange={setProofFiles}
            maxFiles={5}
          />
        </div>

        <div className="flex gap-3 mt-8">
          <Button variant="outline" onClick={onBack} disabled={loading}>
            Back
          </Button>
          <Button onClick={() => setShowWarning(true)} disabled={!isValid || loading}>
            Confirm Payment
          </Button>
        </div>
      </Card>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Are You Absolutely Sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-left">
              <p className="font-semibold text-foreground">
                ⚠️ WARNING: This action CANNOT be undone.
              </p>
              <p>
                Once you confirm this payment, you will <strong>NOT</strong> be able to:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Re-report this invoice</li>
                <li>Counter-dispute this invoice</li>
                <li>Create another confirmation for this invoice</li>
              </ul>
              <p className="text-foreground font-medium">
                Your report is literally worth as much as the invoice attached to it. <strong>USE IT WISELY.</strong>
              </p>
              <p className="text-sm text-muted-foreground italic">
                Abusing this system may result in account suspension, as inconsistent Payment Confirmations could be seen as defamatory.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
