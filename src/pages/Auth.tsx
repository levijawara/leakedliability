import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
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

  // Get redirect info on mount
  useEffect(() => {
    const info = getRedirectInfo();
    setRedirectInfo(info);
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

      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
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
          const verificationUrl = `${window.location.origin}/verify-email`;
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
      <Navigation />
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
      
      <Footer />
      </div>
    </>
  );
}
