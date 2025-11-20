import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LeaderboardAccessState {
  hasAccess: boolean;
  canPurchase: boolean;
  reason: 
    | 'free_access_period'     // Global override
    | 'owner_account'          // Owner email
    | 'admin' 
    | 'admin_override' 
    | 'subscription_active' 
    | 'grace_period'           // Payment failed, grace period active
    | 'no_access';
  accountType?: string;
  hasVerifiedReport?: boolean;
  subscriptionEnd?: string;
  subscriptionTier?: string;
  billingFrequency?: string;
  gracePeriodEnd?: string;
  failedAttempts?: number;
  message?: string;
}

export const useLeaderboardAccess = (shouldCheck = true) => {
  const [accessState, setAccessState] = useState<LeaderboardAccessState | null>(null);
  const [loading, setLoading] = useState(shouldCheck);
  const [error, setError] = useState<string | null>(null);
  const hasInitiallyLoaded = useRef(false);

  const checkAccess = async (isBackgroundRefresh = false) => {
    if (!shouldCheck) return;
    
    try {
      // Only show loading state on initial load
      if (!isBackgroundRefresh && !hasInitiallyLoaded.current) {
        setLoading(true);
      }
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
      
      // Mark initial load complete
      if (!hasInitiallyLoaded.current) {
        hasInitiallyLoaded.current = true;
      }
    } catch (err) {
      console.error('Error checking leaderboard access:', err);
      setError(err instanceof Error ? err.message : 'Failed to check access');
      setAccessState({
        hasAccess: false,
        canPurchase: false,
        reason: 'no_access',
      });
    } finally {
      // Only clear loading if it was set (initial load)
      if (!isBackgroundRefresh && !hasInitiallyLoaded.current) {
        setLoading(false);
      }
    }
  };

  const refreshAccess = () => {
    checkAccess();
  };

  useEffect(() => {
    if (!shouldCheck) {
      setLoading(false);
      return;
    }

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

    // Refresh every 10 seconds to catch subscription changes faster (background refresh)
    const interval = setInterval(() => checkAccess(true), 10000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAccess();
    });

    // Check access when tab becomes visible (user returns from checkout)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAccess(true); // Background refresh, no spinner
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shouldCheck]);

  return { accessState, loading, error, refreshAccess };
};