/**
 * RequireAuth - Centralized authentication guard component
 * 
 * Prevents premature redirects on page refresh by waiting for Supabase's
 * INITIAL_SESSION event before determining authentication status.
 */

import { useState, useEffect, ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { createRedirectUrl } from "@/lib/authRedirectHelpers";
import { useToast } from "@/hooks/use-toast";

interface RequireAuthProps {
  children: ReactNode;
  /** Require admin role in addition to authentication */
  requireAdmin?: boolean;
  /** Require beta access in addition to authentication */
  requireBeta?: boolean;
}

export function RequireAuth({ 
  children, 
  requireAdmin = false, 
  requireBeta = false 
}: RequireAuthProps) {
  const location = useLocation();
  const { toast } = useToast();
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'unauthorized' | 'banned'>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [banId, setBanId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async (currentSession: Session | null) => {
      if (!currentSession) {
        if (mounted) setAuthState('unauthenticated');
        return;
      }

      // Check if user is banned/suspended FIRST (before any other access checks)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("account_status")
        .eq("user_id", currentSession.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('[RequireAuth] Profile fetch error:', profileError);
        if (mounted) setAuthState('unauthorized');
        return;
      }

      // Handle missing profile as unauthorized
      if (!profile) {
        console.error('[RequireAuth] No profile found for user:', currentSession.user.id);
        if (mounted) setAuthState('unauthorized');
        return;
      }

      // Block banned or suspended accounts
      if (profile.account_status === 'banned' || profile.account_status === 'suspended') {
        console.log('[RequireAuth] User is blocked, status:', profile.account_status);
        
        // Fetch the active ban record to get the ban ID for redirect
        const { data: banRecord } = await supabase
          .from("account_bans")
          .select("id")
          .eq("target_user_id", currentSession.user.id)
          .is("revoked_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (mounted) {
          setBanId(banRecord?.id || null);
          setAuthState('banned');
        }
        return;
      }

      // If no special requirements, user is authenticated
      if (!requireAdmin && !requireBeta) {
        if (mounted) {
          setSession(currentSession);
          setAuthState('authenticated');
        }
        return;
      }

      try {
        // Check admin if required
        if (requireAdmin) {
          const { data: isAdmin, error } = await supabase.rpc('has_role', {
            _user_id: currentSession.user.id,
            _role: 'admin'
          });

          if (error || !isAdmin) {
            if (mounted) {
              toast({
                title: "Access Denied",
                description: "Admin privileges required.",
                variant: "destructive",
              });
              setAuthState('unauthorized');
            }
            return;
          }
        }

        // Check beta access if required
        if (requireBeta) {
          // First check if admin (admins bypass beta requirement)
          const { data: isAdmin } = await supabase.rpc('has_role', {
            _user_id: currentSession.user.id,
            _role: 'admin'
          });

          if (!isAdmin) {
            const { data: betaProfile, error: betaError } = await supabase
              .from("profiles")
              .select("beta_access")
              .eq("user_id", currentSession.user.id)
              .maybeSingle();

            if (betaError) {
              console.error('[RequireAuth] Beta access check failed:', betaError);
              // Fail closed - no beta access if we can't verify
            }

            // No profile or no beta access = denied
            if (!betaProfile?.beta_access) {
              if (mounted) {
                toast({
                  title: "Beta Access Required",
                  description: "Unlock beta features from your profile page.",
                });
                setAuthState('unauthorized');
              }
              return;
            }
          }
        }

        // All checks passed
        if (mounted) {
          setSession(currentSession);
          setAuthState('authenticated');
        }
      } catch (error) {
        console.error('[RequireAuth] Access check error:', error);
        if (mounted) setAuthState('unauthenticated');
      }
    };

    // Set up auth state listener - wait for INITIAL_SESSION
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      // INITIAL_SESSION is the definitive answer after hydration
      if (event === 'INITIAL_SESSION') {
        checkAccess(currentSession);
      } else if (event === 'SIGNED_OUT') {
        if (mounted) setAuthState('unauthenticated');
      } else if (event === 'SIGNED_IN' && authState === 'unauthenticated') {
        // Handle sign-in after being unauthenticated
        checkAccess(currentSession);
      }
    });

    // Also do an immediate check in case INITIAL_SESSION already fired
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      // Only proceed if still loading (INITIAL_SESSION hasn't resolved yet)
      if (mounted && authState === 'loading') {
        checkAccess(currentSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [requireAdmin, requireBeta, toast, authState]);

  // Loading state - show spinner
  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Unauthenticated - redirect to auth page with return URL
  if (authState === 'unauthenticated') {
    const redirectUrl = createRedirectUrl(location.pathname + location.search);
    return <Navigate to={redirectUrl} replace />;
  }

  // Unauthorized (authenticated but lacks required role/access)
  if (authState === 'unauthorized') {
    // For admin pages, redirect home; for beta pages, redirect to profile
    const destination = requireAdmin ? "/" : "/profile";
    return <Navigate to={destination} replace />;
  }

  // Banned/suspended - redirect to ban page (no sign-out here; BanPage handles it)
  if (authState === 'banned') {
    const destination = banId ? `/ban/${banId}` : "/";
    return <Navigate to={destination} replace />;
  }

  // Authenticated and authorized - render children
  return <>{children}</>;
}
