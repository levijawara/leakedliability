import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Award, CreditCard } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { LeaderboardAccessState } from "@/hooks/useLeaderboardAccess";

interface LeaderboardPaywallProps {
  accessState: LeaderboardAccessState;
  onAccessGranted?: () => void;
}

export const LeaderboardPaywall = ({ accessState, onAccessGranted }: LeaderboardPaywallProps) => {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to subscribe");
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-leaderboard-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success("Checkout opened in new tab");
        
        // Start polling for access after a delay
        setTimeout(() => {
          onAccessGranted?.();
        }, 3000);
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error("Failed to start checkout process");
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
      };
    }

    if (accessState.accountType === 'crew' && !accessState.hasVerifiedReport) {
      return {
        title: "🔒 Full Access Required",
        description: "Names are blurred until you unlock access.",
        message: "Choose one of the following options to view the full leaderboard:",
        showCrewOption: true,
      };
    }

    return {
      title: "🔒 Producer Access Required",
      description: "Names are blurred. Purchase access to view full leaderboard data.",
      message: null,
      showCrewOption: false,
    };
  };

  const content = getPaywallContent();

  return (
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
              <AlertDescription>{content.message}</AlertDescription>
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
                  <p className="text-sm text-muted-foreground mb-4">
                    Get FREE permanent access by submitting a verified crew member payment report.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.location.href = '/submit'}
                  >
                    Submit Report (Free Forever)
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

          {!content.showCrewOption && (
            <div className="text-center">
              <Button 
                size="lg"
                onClick={handleSubscribe}
                disabled={loading}
              >
                {loading ? "Processing..." : "Get Full Access - $5.99/month"}
              </Button>
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
  );
};