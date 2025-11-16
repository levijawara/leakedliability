import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PayEscrow() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [escrowData, setEscrowData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Check for success session ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const sid = urlParams.get("session_id");
    if (sid) {
      setSessionId(sid);
      setLoading(false);
      return;
    }

    loadEscrowPayment();
  }, [code]);

  const loadEscrowPayment = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("escrow_payments")
        .select(`
          *,
          payment_report:payment_reports(project_name, report_id),
          producer:producers(name, company)
        `)
        .eq("payment_code", code)
        .single();

      if (fetchError) throw new Error("Invalid or expired payment link");
      if (!data) throw new Error("Payment not found");
      if (data.status === "paid") {
        setSessionId("already_paid");
        setLoading(false);
        return;
      }

      setEscrowData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-escrow-checkout", {
        body: { payment_code: code },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("Failed to create checkout session");

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      toast({
        title: "Payment Error",
        description: err.message || "Failed to initiate payment",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  // Success State
  if (sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
        <Card className="w-full max-w-md border-green-200 dark:border-green-800">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Payment Successful</CardTitle>
            <CardDescription>
              {sessionId === "already_paid" 
                ? "This payment has already been processed."
                : "Your payment has been received and processed successfully."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm">
                The outstanding payment has been marked as <strong>PAID</strong> in the Leaked Liability™ system.
                No further action is required.
              </p>
            </div>
            <Button 
              onClick={() => navigate("/")} 
              className="w-full"
              variant="outline"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950">
        <Card className="w-full max-w-md border-red-200 dark:border-red-800">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Payment Link Invalid</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full" variant="outline">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Payment Form State
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
      <Card className="w-full max-w-md border-blue-200 dark:border-blue-800 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Secure Payment Portal</CardTitle>
          <CardDescription>
            Leaked Liability™ Anonymous Escrow Service
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Payment Details */}
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Project</span>
              <span className="font-medium">{escrowData.payment_report?.project_name || "Undisclosed"}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Amount Due</span>
              <span className="text-2xl font-bold text-primary">
                ${escrowData.amount_due.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Payment Type</span>
              <Badge variant="outline">One-Time</Badge>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Privacy Protected
            </h4>
            <p className="text-xs leading-relaxed">
              This payment is being processed through Leaked Liability™ escrow. 
              No crew member or vendor identity will be disclosed. 
              All payment information is handled securely by Stripe.
            </p>
          </div>

          {/* Reason Statement */}
          <div className="p-4 bg-muted rounded-lg border">
            <p className="text-sm">
              <strong>Reason:</strong> Outstanding payment related to a verified delayed-payment report 
              submitted to Leaked Liability™.
            </p>
          </div>

          {/* Pay Button */}
          <Button 
            onClick={handlePayment} 
            disabled={processing}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-5 w-5" />
                Pay ${escrowData.amount_due.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </>
            )}
          </Button>

          {/* Footer Text */}
          <p className="text-xs text-center text-muted-foreground">
            Powered by Stripe • Secured by Leaked Liability™
          </p>
        </CardContent>
      </Card>
    </div>
  );
}