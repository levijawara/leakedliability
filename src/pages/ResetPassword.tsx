import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { Footer } from "@/components/Footer";

const isInstagramBrowser = () => {
  const ua = navigator.userAgent || navigator.vendor;
  return ua.indexOf('Instagram') > -1;
};

const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 12) {
    return { isValid: false, message: "Password must be at least 12 characters" };
  }

  let typeCount = 0;
  if (/[A-Z]/.test(password)) typeCount++;
  if (/[a-z]/.test(password)) typeCount++;
  if (/[0-9]/.test(password)) typeCount++;
  if (/[!@#$%^&*()\-_=+[\]{};:,<.>/?]/.test(password)) typeCount++;

  if (typeCount < 3) {
    return { isValid: false, message: "Password must include 3 of 4 types: uppercase, lowercase, numbers, symbols" };
  }

  return { isValid: true };
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isIGBrowser, setIsIGBrowser] = useState(false);
  const [email, setEmail] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    // Detect Instagram browser
    setIsIGBrowser(isInstagramBrowser());
    
    // Check if user has valid session from password reset link
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[RESET] Session check:', { 
        hasSession: !!session, 
        error: error?.message,
        userAgent: navigator.userAgent,
        origin: window.location.origin,
        hash: window.location.hash
      });
      
      if (!session) {
        const errorReason = error?.message || 'No active session found';
        toast({
          title: "Invalid or expired link",
          description: `${errorReason}. Please request a new password reset link.`,
          variant: "destructive",
        });
        
        // Log for debugging
        console.error('[RESET] Failed:', errorReason);
        
        // Delay navigation to allow toast to show
        setTimeout(() => navigate("/auth"), 2000);
      }
    });
  }, [navigate, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        toast({
          title: "Invalid Password",
          description: passwordValidation.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check passwords match
      if (password !== confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: "Please make sure both passwords are the same.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: "Password updated!",
        description: "You can now sign in with your new password.",
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResending(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "New link sent!",
        description: "Check your email for a fresh password reset link.",
      });
      setShowResend(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4 pt-24 md:pt-28">
      {isIGBrowser && (
        <div className="max-w-md w-full mb-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-sm text-destructive font-semibold">⚠️ Instagram Browser Detected</p>
          <p className="text-xs text-destructive/80 mt-1">
            Password resets don't work in Instagram's browser. Tap the "..." menu and select "Open in Safari/Chrome" to continue.
          </p>
        </div>
      )}
      
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black mb-2">Reset Password</h1>
          <p className="text-muted-foreground">Enter your new password below</p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <Label htmlFor="password">New Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min 12 chars, 3 of 4 types"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Must include 3 of: uppercase, lowercase, numbers, symbols
            </p>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm New Password *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={12}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Updating password..." : "Update Password"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          {!showResend ? (
            <Button
              variant="link"
              onClick={() => setShowResend(true)}
              className="text-sm text-muted-foreground"
            >
              Link expired? Request a new one
            </Button>
          ) : (
            <form onSubmit={handleResendReset} className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={resending}
                  className="flex-1"
                >
                  {resending ? "Sending..." : "Send New Link"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowResend(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
      
      <Footer />
      </div>
    </>
  );
}
