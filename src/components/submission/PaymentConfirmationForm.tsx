import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploadZone } from "./FileUploadZone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { paymentConfirmationSchema } from "@/lib/validation";
import { uploadFiles } from "@/lib/storage";

interface PaymentConfirmationFormProps {
  userInfo: { firstName: string; lastName: string; email: string; role: string };
  onBack: () => void;
  onSuccess: () => void;
}

export function PaymentConfirmationForm({ userInfo, onBack, onSuccess }: PaymentConfirmationFormProps) {
  const [loading, setLoading] = useState(false);
  const [producerName, setProducerName] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const { toast } = useToast();


  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Validate input
      const validationResult = paymentConfirmationSchema.safeParse({
        producerName,
        amountPaid: parseFloat(amountPaid),
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
          description: "You must be logged in to submit a confirmation",
          variant: "destructive"
        });
        return;
      }

      const documentUrls = await uploadFiles(proofFiles);

      const { error } = await supabase.from('submissions').insert({
        user_id: user.id,
        submission_type: 'payment_confirmation',
        full_name: `${userInfo.firstName} ${userInfo.lastName}`,
        email: userInfo.email,
        role_department: userInfo.role,
        form_data: {
          producer_name: producerName,
          amount_paid: amountPaid
        },
        document_urls: documentUrls
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your payment confirmation has been submitted"
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

  const isValid = producerName && amountPaid && proofFiles.length > 0;

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold mb-4">Payment Confirmation ✅</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Confirm when you've been paid. Delays may damage your credibility.
      </p>

      <div className="space-y-6">
        <div>
          <Label htmlFor="producerName">Producer/Production Company Name *</Label>
          <Input
            id="producerName"
            placeholder="Name of who paid you"
            value={producerName}
            onChange={(e) => setProducerName(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="amount">Amount Paid (USD) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
          />
        </div>

        <FileUploadZone
          label="Payment Proof *"
          description="Bank statements, payment confirmations, receipts, etc."
          files={proofFiles}
          onFilesChange={setProofFiles}
          maxFiles={5}
        />
      </div>

      <div className="flex gap-3 mt-8">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Confirmation
        </Button>
      </div>
    </Card>
  );
}
