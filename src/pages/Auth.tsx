import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Navigation } from "@/components/Navigation";
import { usePortalMode } from "@/contexts/PortalContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Info, ArrowRight } from "lucide-react";
import ProducerAssociationModal from "@/components/ProducerAssociationModal";
import { Footer } from "@/components/Footer";
import { getRedirectInfo } from "@/lib/authRedirectHelpers";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AccountType = 'crew' | 'vendor' | 'producer' | 'production_company' | 'admin';

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

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("crew");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showProducerModal, setShowProducerModal] = useState(false);
  const [newUserId, setNewUserId] = useState<string>("");
  const [redirectInfo, setRedirectInfo] = useState<ReturnType<typeof getRedirectInfo>>(null);
  const [liabilityContext, setLiabilityContext] = useState<"initial" | "redirect" | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const isPortal = usePortalMode();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  // Get redirect info and check for liability context on mount
  useEffect(() => {
    const info = getRedirectInfo();
    setRedirectInfo(info);

    // Check for liability query parameter
    const searchParams = new URLSearchParams(window.location.search);
    const liabilityParam = searchParams.get('liability');
    if (liabilityParam === 'initial' || liabilityParam === 'redirect') {
      setLiabilityContext(liabilityParam as "initial" | "redirect");
      
      // Store token and report_id in sessionStorage for later use
      const token = searchParams.get('token');
      const reportId = searchParams.get('report_id');
      
      if (token) {
        sessionStorage.setItem('liability_claim_token', token);
      }
      if (reportId) {
        sessionStorage.setItem('liability_report_id', reportId);
      }
    }
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
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

      // Validate business name for production companies
      if (accountType === 'production_company' && !businessName.trim()) {
        toast({
          title: "Business Name Required",
          description: "Production companies must provide a business name",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Determine redirect URL based on liability context
      // If user has liability context, verification will route to arena
      // Otherwise use default redirect
      const redirectUrl = liabilityContext 
        ? `${window.location.origin}/verify-email?liability=${liabilityContext}`
        : `${window.location.origin}/`;

      // Prepare user metadata with liability context if present
      const userMetadata: Record<string, any> = {};
      if (liabilityContext) {
        userMetadata.liability_entry_context = liabilityContext;
        userMetadata.pending_liability_verification = true;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: userMetadata,
        },
      });

      if (error) throw error;

      // Create profile
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          user_id: data.user.id,
          account_type: accountType,
          legal_first_name: firstName,
          legal_last_name: lastName,
          business_name: accountType === 'production_company' ? businessName : null,
          email: email,
        });

        if (profileError) throw profileError;

        // Update user metadata with liability context if present
        // (Supabase signUp data may not persist, so we update it explicitly)
        if (liabilityContext) {
          const { error: metadataError } = await supabase.auth.updateUser({
            data: {
              liability_entry_context: liabilityContext,
              pending_liability_verification: true,
            },
          });
          if (metadataError) {
            console.error('[AUTH] Failed to update user metadata:', metadataError);
            // Don't block signup if metadata update fails
          }
        }

        // Send welcome email
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'welcome',
              to: email,
              data: {
                userName: `${firstName} ${lastName}`,
                accountType: accountType === 'crew' ? 'Crew Member' : 
                            accountType === 'vendor' ? 'Vendor / Service Provider' :
                            accountType === 'producer' ? 'Producer' : 
                            'Production Company',
              },
            },
          });
          console.log('[AUTH] Welcome email sent successfully');
        } catch (emailError) {
          console.error('[AUTH] Welcome email failed:', emailError);
          // Don't block signup if email fails
        }

        // Send custom branded email verification email (in addition to Supabase default)
        try {
          // If liability context exists, verification URL should route to arena with report_id after verification
          const reportId = sessionStorage.getItem('liability_report_id');
          const verificationUrl = liabilityContext && reportId
            ? `${window.location.origin}/verify-email?liability=${liabilityContext}&report_id=${reportId}`
            : liabilityContext
            ? `${window.location.origin}/verify-email?liability=${liabilityContext}`
            : `${window.location.origin}/verify-email`;
          
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'email_verification',
              to: email,
              data: {
                userName: `${firstName} ${lastName}`,
                verificationUrl: verificationUrl,
                email: email,
              },
            },
          });
          console.log('[AUTH] Custom email verification sent successfully');
        } catch (emailError) {
          console.error('[AUTH] Custom email verification failed:', emailError);
          // Don't block signup if email fails - Supabase verification email was sent
        }
      }

      toast({
        title: "Success!",
        description: "Account created! Check your email to verify before submitting reports.",
      });

      // Show producer association modal for producers and production companies
      if (data.user && (accountType === 'producer' || accountType === 'production_company')) {
        setNewUserId(data.user.id);
        setShowProducerModal(true);
      } else {
        // Only show verification page if email is NOT already confirmed
        if (data.user?.email_confirmed_at) {
          toast({
            title: "Account Created!",
            description: "You're all set! Redirecting to homepage...",
          });
          setTimeout(() => navigate("/"), 1500);
        } else {
          navigate("/verify-email");
        }
      }
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Handle redirect param from protected routes
      const info = getRedirectInfo();
      const redirectTo = info?.redirectTo || "/";
      
      toast({
        title: "Welcome back!",
        description: info 
          ? `Redirecting you to ${info.routeName}...`
          : "Successfully signed in.",
      });
      
      // Small delay to show toast message before redirect
      setTimeout(() => {
        navigate(redirectTo);
      }, 300);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      console.log('[AUTH] Sending reset email:', { email, redirectUrl });
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      // Send custom branded password reset email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'password_reset',
            to: email,
            data: {
              resetUrl: redirectUrl,
              email: email,
            },
          },
        });
        console.log('[AUTH] Custom password reset email sent successfully');
      } catch (emailError) {
        console.error('[AUTH] Custom password reset email failed:', emailError);
        // Don't block the flow if custom email fails - Supabase email was sent
      }

      toast({
        title: "Check your email",
        description: `We've sent a password reset link to ${email}. The link expires in 60 minutes.`,
      });
      
      console.log('[AUTH] Reset email sent successfully');
      setShowForgotPassword(false);
    } catch (error: any) {
      console.error('[AUTH] Reset email failed:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!isPortal && <Navigation />}
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4 pt-24 md:pt-28">
        <Card className="w-full max-w-md p-8 mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black mb-2">Leaked Liability™</h1>
          <p className="text-muted-foreground">Filmmaking's financial accountability platform.</p>
        </div>

        {/* Redirect Context Banner */}
        {redirectInfo && (
          <Alert className="mb-6 border-primary/50 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="space-y-2">
              <div className="font-medium text-sm">
                Sign in to continue to {redirectInfo.routeName}
              </div>
              <div className="text-xs text-muted-foreground">
                {redirectInfo.reason}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                <ArrowRight className="h-3 w-3" />
                <span>After signing in, you'll be redirected automatically</span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowForgotPassword(false)}
                >
                  Back to Sign In
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>

                {/* Google OAuth Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                {/* Google Sign In Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {googleLoading ? "Connecting..." : "Continue with Google"}
                </Button>
              </form>
            )}
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <Label htmlFor="accountType">Account Type *</Label>
                <Select value={accountType} onValueChange={(value) => setAccountType(value as AccountType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crew">Crew Member</SelectItem>
                    <SelectItem value="vendor">Vendor / Service Provider</SelectItem>
                    <SelectItem value="producer">Producer</SelectItem>
                    <SelectItem value="production_company">Production Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="firstName">Legal First Name *</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="lastName">Legal Last Name *</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              {accountType === 'production_company' && (
                <div>
                  <Label htmlFor="businessName">Official Business Name *</Label>
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Business name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password *</Label>
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </Button>

              {/* Google OAuth Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              {/* Google Sign Up Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Crew member identities remain anonymous, always. If you're a producer, known exploitation may cause career instability. Move with caution.</p>
        </div>
      </Card>

      {/* Producer Association Modal */}
      <ProducerAssociationModal
        isOpen={showProducerModal}
        onClose={() => setShowProducerModal(false)}
        userId={newUserId}
      />
      
      {!isPortal && <Footer />}
      </div>
    </>
  );
}
