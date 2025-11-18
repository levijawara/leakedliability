import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TokenData {
  id: string;
  token: string;
  report_id: string;
  accused_email: string;
  expires_at: string;
  used_at: string | null;
  payment_reports?: {
    report_id: string;
    project_name: string;
    amount_owed: number;
    days_overdue: number;
    producers?: {
      name: string;
    };
  };
}

export default function LiabilityClaim() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"accept" | "dispute" | "redirect" | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Dispute form
  const [disputeReason, setDisputeReason] = useState("");
  
  // Redirect form
  const [redirectName, setRedirectName] = useState("");
  const [redirectEmail, setRedirectEmail] = useState("");
  const [redirectRole, setRedirectRole] = useState("");
  const [redirectAffirmation, setRedirectAffirmation] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No token provided");
      setLoading(false);
      return;
    }

    const fetchTokenData = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("liability_claim_tokens")
          .select(`
            *,
            payment_reports (
              report_id,
              project_name,
              amount_owed,
              days_overdue,
              producers (
                name
              )
            )
          `)
          .eq("token", token)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .single();

        if (fetchError || !data) {
          setError("Invalid or expired claim link");
        } else {
          setTokenData(data as TokenData);
        }
      } catch (err) {
        setError("Failed to load claim details");
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [token]);

  const handleSubmit = async () => {
    if (!token || !action) return;

    setProcessing(true);

    try {
      let payload: any = {
        token,
        action,
      };

      if (action === "dispute") {
        if (!disputeReason.trim()) {
          toast({
            title: "Dispute reason required",
            description: "Please provide a reason for your dispute",
            variant: "destructive",
          });
          setProcessing(false);
          return;
        }
        payload.dispute_reason = disputeReason;
      }

      if (action === "redirect") {
        if (!redirectName.trim() || !redirectEmail.trim() || !redirectRole.trim() || !redirectAffirmation) {
          toast({
            title: "Complete all fields",
            description: "Please fill in all fields and confirm your affirmation",
            variant: "destructive",
          });
          setProcessing(false);
          return;
        }
        payload.redirect_to = {
          name: redirectName,
          email: redirectEmail,
          role: redirectRole,
          affirmation: redirectAffirmation,
        };
      }

      const { data, error: submitError } = await supabase.functions.invoke(
        "process-liability-claim",
        { body: payload }
      );

      if (submitError) throw submitError;

      if (data?.success) {
        if (data.action === "loop_detected") {
          toast({
            title: "Loop Detected",
            description: `Liability has been reverted to ${data.reverted_to}`,
          });
        } else {
          toast({
            title: "Response recorded",
            description: `Your ${action} response has been successfully recorded`,
          });
        }
        
        setTimeout(() => navigate("/"), 3000);
      } else {
        throw new Error("Unexpected response");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to process your response",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-2xl">
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Loading claim details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              Invalid Claim Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate("/")} className="mt-4">
              Return to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const report = tokenData.payment_reports;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>You've Been Named in a Payment Dispute</CardTitle>
            <CardDescription>
              Please review the details below and choose how to respond
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Report #{report?.report_id}</strong> - {report?.project_name}
                <br />
                Producer/Company: {report?.producers?.name}
                <br />
                Amount Owed: <span className="text-green-500 font-semibold">${report?.amount_owed.toLocaleString()}</span>
                <br />
                Days Overdue: <span className="text-destructive font-semibold">{report?.days_overdue}</span>
              </AlertDescription>
            </Alert>

            <p className="text-sm text-muted-foreground">
              You are receiving this because someone has indicated that <strong>you</strong> are responsible 
              for this unpaid invoice. Please choose one of the following options:
            </p>
          </CardContent>
        </Card>

        {!action && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setAction("accept")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Accept
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  I accept responsibility and will arrange payment
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setAction("dispute")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <XCircle className="h-5 w-5 text-destructive" />
                  Dispute
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  I dispute this claim and want to provide my side
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setAction("redirect")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ArrowRight className="h-5 w-5 text-yellow-500" />
                  Redirect
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Someone else is responsible for this payment
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {action === "accept" && (
          <Card>
            <CardHeader>
              <CardTitle>Accept Responsibility</CardTitle>
              <CardDescription>
                By clicking confirm, you acknowledge responsibility for this payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  This report will remain on the Leaked Liability™ Leaderboard until payment is confirmed. 
                  You can arrange payment directly or use our Anonymous Escrow system.
                </AlertDescription>
              </Alert>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setAction(null)} disabled={processing}>
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={processing}>
                  {processing ? "Processing..." : "Confirm & Accept"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {action === "dispute" && (
          <Card>
            <CardHeader>
              <CardTitle>Dispute This Claim</CardTitle>
              <CardDescription>
                Provide details about why you believe this claim is incorrect
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="dispute-reason">Dispute Reason</Label>
                <Textarea
                  id="dispute-reason"
                  placeholder="Explain why you are disputing this claim..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="min-h-32"
                />
              </div>
              <Alert>
                <AlertDescription>
                  Your dispute will be reviewed by Leaked Liability™ administrators along with 
                  the original reporter's documentation.
                </AlertDescription>
              </Alert>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setAction(null)} disabled={processing}>
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={processing}>
                  {processing ? "Processing..." : "Submit Dispute"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {action === "redirect" && (
          <Card>
            <CardHeader>
              <CardTitle>Redirect Liability</CardTitle>
              <CardDescription>
                Identify who is actually responsible for this payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="redirect-name">Full Name</Label>
                <Input
                  id="redirect-name"
                  placeholder="e.g., John Smith"
                  value={redirectName}
                  onChange={(e) => setRedirectName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="redirect-email">Email Address</Label>
                <Input
                  id="redirect-email"
                  type="email"
                  placeholder="e.g., john@example.com"
                  value={redirectEmail}
                  onChange={(e) => setRedirectEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="redirect-role">Role / Position</Label>
                <Input
                  id="redirect-role"
                  placeholder="e.g., Executive Producer, Line Producer"
                  value={redirectRole}
                  onChange={(e) => setRedirectRole(e.target.value)}
                />
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="redirect-affirmation"
                  checked={redirectAffirmation}
                  onCheckedChange={(checked) => setRedirectAffirmation(checked as boolean)}
                />
                <Label htmlFor="redirect-affirmation" className="text-sm leading-relaxed cursor-pointer">
                  I affirm under penalty of perjury that the information provided is true and accurate 
                  to the best of my knowledge
                </Label>
              </div>
              <Alert>
                <AlertDescription>
                  The person you name will receive a notification email with a link to respond. 
                  If they redirect back to someone already in the chain, liability will revert to the original party.
                </AlertDescription>
              </Alert>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setAction(null)} disabled={processing}>
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={processing || !redirectAffirmation}>
                  {processing ? "Processing..." : "Submit Redirect"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
