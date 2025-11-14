import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LeaderboardAccessState {
  hasAccess: boolean;
  canPurchase: boolean;
  reason: 
    | 'free_access_period'     // Global override
    | 'owner_account'          // Owner email
    | 'admin' 
    | 'admin_override' 
    | 'report_unlock'          // Earned unlock
    | 'subscription_active' 
    | 'contributor_free'       // Legacy
    | 'threshold_locked' 
    | 'producer_unpaid' 
    | 'crew_no_report_unpaid'
    | 'vendor_no_report_unpaid'
    | 'no_access';
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
    const verifyStripeCheckout = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      
      if (!sessionId) return;

      try {
        console.log('[LEADERBOARD] Verifying Stripe checkout session:', sessionId);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('[LEADERBOARD] No active session, skipping verification');
          return;
        }

        const { data, error } = await supabase.functions.invoke(
          'verify-leaderboard-checkout',
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            method: 'GET',
          }
        );

        if (error) {
          console.error('[LEADERBOARD] Verification error:', error);
        } else if (data?.ok) {
          console.log('[LEADERBOARD] Checkout verified successfully');
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
          // Force refresh access state
          checkAccess();
        } else {
          console.log('[LEADERBOARD] Checkout not verified:', data);
        }
      } catch (err) {
        console.error('[LEADERBOARD] Exception during verification:', err);
      }
    };

    // Run verification on mount if session_id is present
    verifyStripeCheckout();

    // Initial access check
    checkAccess();

    // Refresh every 10 seconds to catch subscription changes faster
    const interval = setInterval(checkAccess, 10000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAccess();
    });

    // Check access when tab becomes visible (user returns from checkout)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAccess();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { accessState, loading, error, refreshAccess };
};