import { useLeaderboardAccess } from "@/hooks/useLeaderboardAccess";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Crown, Gift, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

export const LeaderboardAccessStatus = () => {
  const { accessState, loading, refreshAccess } = useLeaderboardAccess();
  const [managingBilling, setManagingBilling] = useState(false);

  const handleManageBilling = async () => {
    try {
      setManagingBilling(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to manage billing");
        return;
      }

      const { data, error } = await supabase.functions.invoke('leaderboard-customer-portal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success("Billing portal opened in new tab");
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error("Failed to open billing portal");
    } finally {
      setManagingBilling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!accessState) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Please sign in to view access status
      </div>
    );
  }

  const getAccessContent = () => {
    switch (accessState.reason) {
      case 'admin':
        return {
          icon: <Crown className="h-8 w-8 text-yellow-600" />,
          badge: <Badge variant="default" className="bg-yellow-600">Admin Access</Badge>,
          description: "You have full administrative access to the leaderboard.",
          action: null,
        };

      case 'contributor_free':
        const contributorType = accessState.accountType === 'vendor' ? 'vendor' : 'crew';
        return {
          icon: <Gift className="h-8 w-8 text-green-600" />,
          badge: <Badge variant="default" className="bg-green-600">Free Contributor Access</Badge>,
          description: `You have free access for submitting a verified ${contributorType} report. This access is temporary and subject to platform policy changes.`,
          action: null,
        };

      case 'subscription_active':
        return {
          icon: <CheckCircle className="h-8 w-8 text-primary" />,
          badge: <Badge variant="default">Active Subscription</Badge>,
          description: accessState.subscriptionEnd 
            ? `Your subscription is active. Next billing: ${new Date(accessState.subscriptionEnd).toLocaleDateString()}`
            : "Your subscription is active.",
          action: (
            <Button 
              variant="outline" 
              onClick={handleManageBilling}
              disabled={managingBilling}
            >
              {managingBilling ? "Loading..." : "Manage Billing"}
            </Button>
          ),
        };

      case 'admin_override':
        return {
          icon: <Gift className="h-8 w-8 text-purple-600" />,
          badge: <Badge variant="default" className="bg-purple-600">Special Access</Badge>,
          description: "You have been granted special access by an administrator.",
          action: null,
        };

      case 'threshold_locked':
      case 'producer_unpaid':
      case 'crew_no_report_unpaid':
        return {
          icon: <CreditCard className="h-8 w-8 text-muted-foreground" />,
          badge: <Badge variant="outline">No Access</Badge>,
          description: "You need to subscribe to access the full leaderboard.",
          action: (
            <Button onClick={() => window.location.href = '/leaderboard'}>
              View Subscription Options
            </Button>
          ),
        };

      default:
        return {
          icon: <CreditCard className="h-8 w-8 text-muted-foreground" />,
          badge: <Badge variant="outline">No Access</Badge>,
          description: "Sign in to check your access status.",
          action: null,
        };
    }
  };

  const content = getAccessContent();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {content.icon}
        <div className="flex-1">
          {content.badge}
          <p className="text-sm text-muted-foreground mt-2">
            {content.description}
          </p>
        </div>
      </div>
      {content.action && (
        <div className="pt-2">
          {content.action}
        </div>
      )}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={refreshAccess}
        className="w-full"
      >
        Refresh Status
      </Button>
    </div>
  );
};