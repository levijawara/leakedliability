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
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'unauthorized'>('loading');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async (currentSession: Session | null) => {
      if (!currentSession) {
        if (mounted) setAuthState('unauthenticated');
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
            const { data: profile } = await supabase
              .from("profiles")
              .select("beta_access")
              .eq("user_id", currentSession.user.id)
              .single();

            if (!profile?.beta_access) {
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

  // Authenticated and authorized - render children
  return <>{children}</>;
}
