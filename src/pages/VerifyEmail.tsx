import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Navigation } from "@/components/Navigation";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);

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
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="container max-w-md">
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
    </>
  );
}
