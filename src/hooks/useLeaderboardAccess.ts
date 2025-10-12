import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LeaderboardAccessState {
  hasAccess: boolean;
  canPurchase: boolean;
  reason: 'admin' | 'admin_override' | 'subscription_active' | 'contributor_free' | 'threshold_locked' | 'producer_unpaid' | 'crew_no_report_unpaid' | 'no_access';
  accountType?: string;
  hasVerifiedReport?: boolean;
  subscriptionEnd?: string;
  message?: string;
}

export const useLeaderboardAccess = () => {
  const [accessState, setAccessState] = useState<LeaderboardAccessState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setAccessState({
          hasAccess: false,
          canPurchase: false,
          reason: 'no_access',
        });
        setLoading(false);
        return;
      }

      const { data, error: funcError } = await supabase.functions.invoke('check-leaderboard-access', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (funcError) throw funcError;

      setAccessState(data as LeaderboardAccessState);
    } catch (err) {
      console.error('Error checking leaderboard access:', err);
      setError(err instanceof Error ? err.message : 'Failed to check access');
      setAccessState({
        hasAccess: false,
        canPurchase: false,
        reason: 'no_access',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshAccess = () => {
    checkAccess();
  };

  useEffect(() => {
    checkAccess();

    // Refresh every 60 seconds to catch subscription changes
    const interval = setInterval(checkAccess, 60000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAccess();
    });

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  return { accessState, loading, error, refreshAccess };
};