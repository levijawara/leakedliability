import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const checkVerificationAndRoute = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email_confirmed_at) {
        // Check for liability context routing
        const liabilityContext = user.user_metadata?.liability_entry_context;
        const pendingVerification = user.user_metadata?.pending_liability_verification;

        // Check URL params for liability context and report_id (from query string)
        const searchParams = new URLSearchParams(window.location.search);
        const urlLiabilityParam = searchParams.get('liability');
        const reportId = searchParams.get('report_id') || sessionStorage.getItem('liability_report_id');

        // Determine if user should be routed to liability arena
        const shouldRouteToArena = 
          (liabilityContext === 'initial' || liabilityContext === 'redirect' || urlLiabilityParam) &&
          pendingVerification === true &&
          reportId; // Report ID is required for arena

        if (shouldRouteToArena && reportId) {
          // Clear pending verification flag but keep context
          await supabase.auth.updateUser({
            data: {
              pending_liability_verification: false,
            },
          });

          // Clear session storage
          sessionStorage.removeItem('liability_report_id');
          sessionStorage.removeItem('liability_claim_token');

          toast.success("Email verified! Redirecting to liability arena...");
          
          // Route to arena with report_id in URL path
          setTimeout(() => {
            navigate(`/liability-arena/${reportId}`);
          }, 1000);
        } else {
          // Normal verification flow
          toast.success("Your email is already verified!");
          setTimeout(() => navigate("/"), 2000);
        }
      }
    };
    checkVerificationAndRoute();
  }, [navigate]);

  const handleResendEmail = async () => {
    setResending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        toast.error("No email address found. Please sign in again.");
        navigate("/auth");
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      // Check if user has liability context for verification URL
      const liabilityContext = user.user_metadata?.liability_entry_context;
      const reportId = sessionStorage.getItem('liability_report_id');
      const verificationUrl = liabilityContext && reportId
        ? `${window.location.origin}/verify-email?liability=${liabilityContext}&report_id=${reportId}`
        : liabilityContext
        ? `${window.location.origin}/verify-email?liability=${liabilityContext}`
        : `${window.location.origin}/verify-email`;

      // Send custom branded email verification email (in addition to Supabase default)
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'email_verification',
            to: user.email,
            data: {
              userName: user.user_metadata?.full_name || user.email,
              verificationUrl: verificationUrl,
              email: user.email,
            },
          },
        });
        console.log('[VERIFY] Custom email verification sent successfully');
      } catch (emailError) {
        console.error('[VERIFY] Custom email verification failed:', emailError);
        // Don't block the flow if custom email fails - Supabase email was sent
      }

      toast.success("Verification email resent! Check your inbox.");
    } catch (error: any) {
      console.error("Error resending verification email:", error);
      toast.error("Failed to resend email. Please try again later.");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background flex items-center justify-center px-4 pt-24 md:pt-28">
        <div className="w-full max-w-md mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>

          <Card className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>

            <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
            
            <p className="text-muted-foreground mb-6">
              We've sent a verification link to your email address. 
              Please check your inbox and click the link to verify your account before submitting reports.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-sm text-left">
              <p className="font-semibold mb-2">Didn't receive the email?</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Check your spam/junk folder</li>
                <li>Wait a few minutes for delivery</li>
                <li>Click the button below to resend</li>
              </ul>
            </div>

            <Button
              onClick={handleResendEmail}
              disabled={resending}
              className="w-full"
            >
              {resending ? "Sending..." : "Resend Verification Email"}
            </Button>

            <p className="text-xs text-muted-foreground mt-4">
              Once verified, you'll be able to submit reports and access all features.
            </p>
          </Card>
        </div>
      </div>
      
      <Footer />
    </>
  );
}
