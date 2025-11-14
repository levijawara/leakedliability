import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Award, CreditCard, RefreshCw, Instagram, Menu, User, Home } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { LeaderboardAccessState } from "@/hooks/useLeaderboardAccess";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface LeaderboardPaywallProps {
  accessState: LeaderboardAccessState;
  onAccessGranted?: () => void;
  refreshAccess?: () => void;
}

export const LeaderboardPaywall = ({ accessState, onAccessGranted, refreshAccess }: LeaderboardPaywallProps) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      if (error) {
        console.error('has_role error', error);
        setIsAdmin(false);
        return;
      }
      setIsAdmin(Boolean(data));
    } catch (e) {
      console.error('checkAdminStatus exception', e);
      setIsAdmin(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to subscribe");
        navigate("/auth");
        return;
      }

      console.log("Invoking create-leaderboard-checkout function...");
      const { data, error } = await supabase.functions.invoke('create-leaderboard-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log("Function response:", { data, error });

      if (error) {
        console.error("Function error:", error);
        throw error;
      }

      if (!data?.url) {
        throw new Error("No checkout URL returned");
      }

      console.log("Redirecting to Stripe checkout:", data.url);
      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error details:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to start checkout: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const getPaywallContent = () => {
    if (accessState.reason === 'threshold_locked') {
      return {
        title: "⚠️ Access Policy Updated",
        description: "The Leaked Liability™ Leaderboard has reached critical mass. Free contributor access has ended.",
        message: "All users now require a paid subscription to view the full leaderboard.",
        showCrewOption: false,
        showSignupPrompt: false,
      };
    }

    if ((accessState.accountType === 'crew' || accessState.accountType === 'vendor') && !accessState.hasVerifiedReport) {
      return {
        title: "🔒 Full Access Required",
        description: "Names are blurred until you unlock access.",
        message: "Choose one of the following options to view the full leaderboard:",
        showCrewOption: true,
        showSignupPrompt: false,
      };
    }

    if (!accessState.accountType) {
      return {
        title: "🔒 Leaderboard Access",
        description: "Names are blurred. Create an account to unlock access.",
        message: "Crew members: Get FREE temporary access by submitting a verified crew member payment report.\nVendors & Service Providers: Get FREE temporary access by submitting a verified vendor report.\nProducers: Subscribe for $5.99/month.",
        showCrewOption: false,
        showSignupPrompt: true,
      };
    }

    return {
      title: "🔒 Paid Access Required",
      description: "Names are blurred. Subscribe to view the full leaderboard.",
      message: null,
      showCrewOption: false,
      showSignupPrompt: false,
    };
  };

  const content = getPaywallContent();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Desktop Navigation Header */}
      <div className="hidden md:block container mx-auto px-4 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a 
              href="https://www.instagram.com/leakedliability/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl font-black hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              @LeakedLiability
              <Instagram className="h-5 w-5" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Account
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <User className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut}>
                    <User className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => navigate("/auth")}
                className="gap-2"
              >
                <User className="h-4 w-4" />
                Sign Up / Login
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Header */}
      <div className="md:hidden container mx-auto px-4 py-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a 
              href="https://www.instagram.com/leakedliability/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-black hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              @LeakedLiability
              <Instagram className="h-4 w-4" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <User className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut}>
                    <User className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/auth")}
              >
                <User className="h-5 w-5" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/")}>
                  <User className="h-4 w-4 mr-2" />
                  Home
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/how-it-works")}>
                  <User className="h-4 w-4 mr-2" />
                  How It Works
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/why-it-works")}>
                  <User className="h-4 w-4 mr-2" />
                  Why It Works
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/leaderboard")}>
                  <User className="h-4 w-4 mr-2" />
                  Leaderboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/submit")}>
                  <User className="h-4 w-4 mr-2" />
                  Submission Forms
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/disclaimer")}>
                  <User className="h-4 w-4 mr-2" />
                  Disclaimer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/faq")}>
                  <User className="h-4 w-4 mr-2" />
                  FAQ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Paywall Content */}
      <div className="container max-w-4xl mx-auto py-8">
        <Card className="border-2">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Lock className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl">{content.title}</CardTitle>
          <CardDescription className="text-lg">{content.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {content.message && (
            <Alert>
              <AlertDescription className="text-center whitespace-pre-line">{content.message}</AlertDescription>
            </Alert>
          )}

          {content.showCrewOption && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <Award className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-xl">Option 1: Contribute</CardTitle>
                  <CardDescription>Submit a verified Crew Member Report</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Get FREE temporary access by submitting a verified {accessState.accountType === 'vendor' ? 'vendor' : 'crew member'} report.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.location.href = '/submit'}
                  >
                    Submit {accessState.accountType === 'vendor' ? 'Vendor' : 'Crew'} Report (Free Access)
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CreditCard className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-xl">Option 2: Subscribe</CardTitle>
                  <CardDescription>Instant access for $5.99/month</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get immediate access to the full leaderboard with a monthly subscription.
                  </p>
                  <Button 
                    className="w-full" 
                    onClick={handleSubscribe}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Subscribe - $5.99/month"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {!content.showCrewOption && !content.showSignupPrompt && (
            <div className="text-center space-y-4">
              <Button 
                size="lg"
                onClick={handleSubscribe}
                disabled={loading}
              >
                {loading ? "Processing..." : "Get Full Access - $5.99/month"}
              </Button>
              
              {refreshAccess && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setRefreshing(true);
                      await refreshAccess();
                      toast.success("Status refreshed");
                      setRefreshing(false);
                    }}
                    disabled={refreshing}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? "Checking..." : "Just subscribed? Refresh status"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {content.showSignupPrompt && (
            <div className="text-center space-y-4">
              <Button 
                size="lg"
                onClick={() => navigate("/auth")}
              >
                Sign Up / Login to Continue
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an account? Sign in to access your subscription or submit a crew report.
              </p>
            </div>
          )}

          <Alert className="bg-muted">
            <AlertDescription className="text-center text-sm">
              Your subscription helps support the platform and maintain the integrity of the Leaked Liability™ system.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};