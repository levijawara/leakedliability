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
import { Loader2, Mail } from "lucide-react";

interface Producer {
  id: string;
  name: string;
  email: string;
  company?: string;
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

export function ManualEmailSender({ producers, onEmailSent }: ManualEmailSenderProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedProducerId, setSelectedProducerId] = useState<string>("");
  const [sending, setSending] = useState(false);

  const handleSendEmail = async () => {
    if (!selectedTemplate || !selectedProducerId) {
      toast({
        title: "Missing Selection",
        description: "Please select both an email template and a producer.",
        variant: "destructive",
      });
      return;
    }

    const producer = producers.find(p => p.id === selectedProducerId);
    if (!producer || !producer.email) {
      toast({
        title: "No Email Address",
        description: "This producer does not have an email address on file.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke('send-manual-producer-email', {
        body: {
          template: selectedTemplate,
          producer_id: selectedProducerId,
          admin_id: user.id,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Email Sent Successfully",
          description: `Email sent to ${producer.name} (${producer.email})`,
        });

        // Reset form
        setSelectedTemplate("");
        setSelectedProducerId("");

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

  const selectedProducer = producers.find(p => p.id === selectedProducerId);

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

        {/* Selected Info Preview */}
        {selectedProducer && (
          <div className="p-3 bg-muted/50 rounded-md text-sm">
            <div className="font-medium">Email will be sent to:</div>
            <div className="text-muted-foreground mt-1">
              {selectedProducer.name} — {selectedProducer.email || "No email on file"}
            </div>
          </div>
        )}

        {/* Send Button */}
        <Button 
          onClick={handleSendEmail} 
          disabled={!selectedTemplate || !selectedProducerId || sending}
          className="w-full"
        >
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Email...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
