import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Eye, ArrowLeft, Send } from "lucide-react";
import { LiabilityNotification } from "../../../supabase/functions/send-email/_templates/liability-notification";
import { LiabilityLoopDetected } from "../../../supabase/functions/send-email/_templates/liability-loop-detected";
import { ProducerReportNotification } from "../../../supabase/functions/send-email/_templates/producer-report-notification";

interface Producer {
  id: string;
  name: string;
  email: string;
  company?: string;
  total_amount_owed?: number;
  oldest_debt_days?: number;
}

interface ManualEmailSenderProps {
  producers: Producer[];
  onEmailSent?: () => void;
}

const EMAIL_TEMPLATES = [
  { value: "liability_notification", label: "Initial Liability Notification", category: "Liability" },
  { value: "liability_loop_detected", label: "Liability Loop Detected", category: "Liability" },
  { value: "liability_accepted", label: "Liability Accepted Confirmation", category: "Liability" },
  
  { value: "producer_report_notification", label: "Producer Report Notification", category: "Payment" },
  { value: "producer_payment", label: "Producer Payment Confirmation", category: "Payment" },
  { value: "crew_report_payment_confirmed", label: "Crew Payment Confirmed", category: "Payment" },
  
  { value: "crew_report", label: "Crew Report Confirmation", category: "Reports" },
  { value: "crew_report_verified", label: "Crew Report Verified", category: "Reports" },
  { value: "crew_report_rejected", label: "Crew Report Rejected", category: "Reports" },
  { value: "vendor_report", label: "Vendor Report Confirmation", category: "Reports" },
  { value: "vendor_report_verified", label: "Vendor Report Verified", category: "Reports" },
  { value: "vendor_report_rejected", label: "Vendor Report Rejected", category: "Reports" },
  
  { value: "dispute", label: "Dispute Submission", category: "Disputes" },
  { value: "counter_dispute", label: "Counter-Dispute Submission", category: "Disputes" },
  { value: "dispute_evidence_round_started", label: "Dispute Evidence Round Started", category: "Disputes" },
  { value: "dispute_additional_info_required", label: "Additional Information Required", category: "Disputes" },
  { value: "dispute_resolved_paid", label: "Dispute Resolved - Payment Confirmation", category: "Disputes" },
  { value: "dispute_resolved_mutual", label: "Dispute Resolved - Mutual Agreement", category: "Disputes" },
  { value: "dispute_closed_unresolved", label: "Dispute Closed - Unresolved", category: "Disputes" },
  
  { value: "welcome", label: "Welcome Email", category: "Account" },
  { value: "admin_created_account", label: "Admin Created Account", category: "Account" },
  { value: "email_verification", label: "Email Verification", category: "Account" },
  { value: "password_reset", label: "Password Reset", category: "Account" },
  
  { value: "subscription_payment_failed", label: "Subscription Payment Failed", category: "Subscription" },
  { value: "subscription_canceled", label: "Subscription Canceled", category: "Subscription" },
];

// Map template value to subject line
const TEMPLATE_SUBJECTS: Record<string, string> = {
  liability_notification: "ACTION REQUIRED: Payment Liability Claim",
  liability_loop_detected: "NOTICE: Liability Loop Detected",
  liability_accepted: "Liability Accepted - Next Steps",
  producer_report_notification: "Payment Report Filed Against You",
  producer_payment: "Payment Confirmation Received",
  crew_report_payment_confirmed: "Payment Confirmed",
  crew_report: "Your Report Has Been Received",
  crew_report_verified: "Your Report Has Been Verified",
  crew_report_rejected: "Report Requires Additional Information",
  vendor_report: "Vendor Report Confirmation",
  vendor_report_verified: "Vendor Report Verified",
  vendor_report_rejected: "Vendor Report Requires Additional Information",
  dispute: "Your Dispute Has Been Submitted",
  counter_dispute: "Your Counter-Dispute Has Been Submitted",
  dispute_evidence_round_started: "Dispute Evidence Required",
  dispute_additional_info_required: "Additional Information Required",
  dispute_resolved_paid: "Dispute Resolved: Payment Confirmed",
  dispute_resolved_mutual: "Dispute Resolved: Mutual Agreement",
  dispute_closed_unresolved: "Dispute Closed: Unresolved",
  welcome: "Welcome to Leaked Liability™",
  admin_created_account: "Your Leaked Liability Account",
  email_verification: "Verify Your Email Address",
  password_reset: "Reset Your Password",
  subscription_payment_failed: "Payment Failed - Action Required",
  subscription_canceled: "Subscription Canceled - Resubscribe Anytime",
};

interface PreviewData {
  reportId: string;
  amountOwed: number;
  projectName: string;
  invoiceDate: string;
  daysOverdue: number;
  accusedName: string;
  claimUrl: string;
  expirationDate: string;
  paymentUrl?: string;
  paymentCode?: string;
  oldestDebtDays?: number;
}

export function ManualEmailSender({ producers, onEmailSent }: ManualEmailSenderProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedProducerId, setSelectedProducerId] = useState<string>("");
  const [manualEmail, setManualEmail] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const selectedProducer = producers.find(p => p.id === selectedProducerId);

  const handlePreview = async () => {
    if (!selectedTemplate || !selectedProducerId) {
      toast({
        title: "Missing Selection",
        description: "Please select both an email template and a producer.",
        variant: "destructive",
      });
      return;
    }

    const producer = producers.find(p => p.id === selectedProducerId);
    if (!producer) return;

    const finalEmail = manualEmail.trim() || producer.email;
    if (!finalEmail) {
      toast({
        title: "No Email Address",
        description: "Please enter an email address or select a producer with an email on file.",
        variant: "destructive",
      });
      return;
    }

    setLoadingPreview(true);

    try {
      // Fetch the latest payment report for this producer
      const { data: latestReport } = await supabase!
        .from('payment_reports')
        .select('id, project_name, invoice_date, amount_owed, days_overdue')
        .eq('producer_id', selectedProducerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch escrow payment if exists
      const { data: escrowPayment } = await supabase!
        .from('escrow_payments')
        .select('payment_code')
        .eq('producer_id', selectedProducerId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const reportId = latestReport?.id?.slice(0, 8)?.toUpperCase() || 'N/A';
      const amountOwed = producer.total_amount_owed || latestReport?.amount_owed || 0;
      const daysOverdue = producer.oldest_debt_days || latestReport?.days_overdue || 0;
      const projectName = latestReport?.project_name || 'Unknown Project';
      const invoiceDate = latestReport?.invoice_date || new Date().toISOString().split('T')[0];

      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      const paymentCode = escrowPayment?.payment_code;

      setPreviewData({
        reportId: `CR-${reportId}`,
        amountOwed,
        projectName,
        invoiceDate,
        daysOverdue,
        accusedName: producer.name,
        claimUrl: `https://leakedliability.com/liability/claim/${latestReport?.id || 'unknown'}`,
        expirationDate: expirationDate.toISOString().split('T')[0],
        paymentUrl: paymentCode ? `https://leakedliability.com/escrow/pay/${paymentCode}` : undefined,
        paymentCode: paymentCode || undefined,
        oldestDebtDays: daysOverdue,
      });

      setShowPreview(true);
    } catch (error: any) {
      console.error("Error fetching preview data:", error);
      toast({
        title: "Preview Error",
        description: "Could not load preview data. You can still send without preview.",
        variant: "destructive",
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedTemplate || !selectedProducerId) return;

    const producer = producers.find(p => p.id === selectedProducerId);
    if (!producer) return;

    const finalEmail = manualEmail.trim() || producer.email;
    if (!finalEmail) return;

    setSending(true);

    try {
      const { data: { user } } = await supabase!.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase!.functions.invoke('send-manual-producer-email', {
        body: {
          template: selectedTemplate,
          producer_id: selectedProducerId,
          admin_id: user.id,
          manual_email: manualEmail.trim() || undefined,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Email Sent Successfully",
          description: `Email sent to ${producer.name} (${finalEmail})`,
        });

        setSelectedTemplate("");
        setSelectedProducerId("");
        setManualEmail("");
        setShowPreview(false);
        setPreviewData(null);

        onEmailSent?.();
      } else {
        throw new Error(data?.error || "Failed to send email");
      }
    } catch (error: any) {
      console.error("Error sending manual email:", error);
      toast({
        title: "Failed to Send Email",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const renderPreviewTemplate = () => {
    if (!previewData) return null;

    switch (selectedTemplate) {
      case "liability_notification":
        return <LiabilityNotification {...previewData} />;
      case "liability_loop_detected":
        return (
          <LiabilityLoopDetected
            reportId={previewData.reportId}
            originalName={previewData.accusedName}
            amountOwed={previewData.amountOwed}
            projectName={previewData.projectName}
          />
        );
      case "producer_report_notification":
        return (
          <ProducerReportNotification
            reportId={previewData.reportId}
            amountOwed={previewData.amountOwed}
            daysOverdue={previewData.daysOverdue}
            oldestDebtDays={previewData.daysOverdue}
            projectName={previewData.projectName}
            responseUrl={`https://leakedliability.com/auth`}
          />
        );
      default:
        return (
          <div className="p-6 bg-muted/30 rounded-md text-sm text-muted-foreground">
            <p className="font-medium mb-2">Preview not available for this template.</p>
            <p>Template: <strong>{EMAIL_TEMPLATES.find(t => t.value === selectedTemplate)?.label}</strong></p>
            <p>Recipient: <strong>{selectedProducer?.name}</strong></p>
            <p className="mt-2 text-xs">The email will be sent using server-side data. Click "Confirm & Send" to proceed.</p>
          </div>
        );
    }
  };

  // Preview mode
  if (showPreview && previewData) {
    const finalEmail = manualEmail.trim() || selectedProducer?.email || '';
    const subject = TEMPLATE_SUBJECTS[selectedTemplate] || 'Leaked Liability Notification';

    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Email Preview
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Edit
            </Button>
          </div>

          {/* Email headers */}
          <div className="p-3 bg-muted/50 rounded-md text-sm space-y-1">
            <div><strong>From:</strong> noreply@leakedliability.com</div>
            <div><strong>To:</strong> {selectedProducer?.name} &lt;{finalEmail}&gt;</div>
            <div><strong>Subject:</strong> {subject}</div>
          </div>

          {/* Rendered email template */}
          <div className="border rounded-md overflow-auto max-h-[600px] bg-white">
            {renderPreviewTemplate()}
          </div>

          {/* Confirm / Cancel */}
          <div className="flex gap-3">
            <Button
              onClick={handleSendEmail}
              disabled={sending}
              className="flex-1"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Confirm & Send
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(false)} disabled={sending}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Form mode (original UI preserved exactly)
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Manual Email Sender
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Send any system email template to any producer manually
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Select Email Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {["Liability", "Payment", "Reports", "Disputes", "Account", "Subscription"].map(category => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {category}
                    </div>
                    {EMAIL_TEMPLATES.filter(t => t.category === category).map(template => (
                      <SelectItem key={template.value} value={template.value}>
                        {template.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Producer Selection */}
          <div className="space-y-2">
            <Label>Select Producer</Label>
            <Select value={selectedProducerId} onValueChange={setSelectedProducerId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a producer..." />
              </SelectTrigger>
              <SelectContent>
                {producers.map(producer => (
                  <SelectItem key={producer.id} value={producer.id}>
                    {producer.name} {producer.company && `(${producer.company})`}
                    {producer.email && ` — ${producer.email}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Info Preview & Manual Email */}
        {selectedProducer && (
          <div className="p-3 bg-muted/50 rounded-md space-y-3">
            <div>
              <div className="text-sm font-medium mb-1">Email will be sent to:</div>
              <div className="text-sm text-muted-foreground">
                {selectedProducer.name} — {selectedProducer.email || "No email on file"}
              </div>
              {selectedProducer.company && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  Company: {selectedProducer.company}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="manual-email" className="text-sm">
                Or manually enter an email address:
              </Label>
              <input
                id="manual-email"
                type="email"
                placeholder="producer@example.com"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {manualEmail && (
                <div className="text-xs text-muted-foreground">
                  ✓ Will use: {manualEmail}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview Button */}
        <Button 
          onClick={handlePreview} 
          disabled={!selectedTemplate || !selectedProducerId || loadingPreview}
          className="w-full"
        >
          {loadingPreview ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading Preview...
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Preview Email
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
