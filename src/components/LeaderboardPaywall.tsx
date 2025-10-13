import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Award, CreditCard, Home, BookOpen, FileText, UserCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { LeaderboardAccessState } from "@/hooks/useLeaderboardAccess";
import type { User } from "@supabase/supabase-js";

interface LeaderboardPaywallProps {
  accessState: LeaderboardAccessState;
  onAccessGranted?: () => void;
  refreshAccess?: () => void;
}

export const LeaderboardPaywall = ({ accessState, onAccessGranted, refreshAccess }: LeaderboardPaywallProps) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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

    if (accessState.accountType === 'crew' && !accessState.hasVerifiedReport) {
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
        message: "Crew members: Get FREE temporary access by submitting a verified crew member payment report.\nProducers: Subscribe for $5.99/month.",
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
      {/* Navigation Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/how-it-works")}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              How It Works
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/submit-report")}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Submission Forms
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => navigate("/profile")}
                className="gap-2"
              >
                <UserCircle className="h-4 w-4" />
                Account
              </Button>
            ) : (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => navigate("/auth")}
                className="gap-2"
              >
                <UserCircle className="h-4 w-4" />
                Sign Up / Login
              </Button>
            )}
            <ThemeToggle />
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
                    Get FREE temporary access by submitting a verified crew member payment report.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.location.href = '/submit'}
                  >
                    Submit Report (Free Access)
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