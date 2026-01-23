import { useEffect, useState } from "react";
import { ROUTES } from "@/config/routes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { AdminProxyProvider } from "@/contexts/AdminProxyContext";
import { trackVisit } from "@/lib/analytics";
import { trackRealtimeFailure, trackRoleCheckFailure } from "@/lib/failureTracking";
import { validateRLSAssumptions, logRLSValidationResults, getRLSViolationsSummary } from "@/lib/rlsValidation";
import { validateEnv, testSupabaseConnection } from "@/config/env";
import { validateTableExistence, logTableValidationResults, getTableValidationSummary } from "@/lib/tableValidation";
import { validateStorageBuckets, logStorageBucketValidationResults } from "@/lib/storageValidation";
import { RequireAuth } from "@/components/RequireAuth";
import Index from "./pages/Index";
import Leaderboard from "./pages/Leaderboard";
import SubmitReport from "./pages/SubmitReport";
import HowItWorks from "./pages/HowItWorks";
import WhyItWorks from "./pages/WhyItWorks";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Disclaimer from "./pages/Disclaimer";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import FAQ from "./pages/FAQ";
import Maintenance from "./pages/Maintenance";
import NotFound from "./pages/NotFound";
import ProducerDashboard from "./pages/ProducerDashboard";
import SuggestionBox from "./pages/SuggestionBox";
import VerifyEmail from "./pages/VerifyEmail";
import LeaderboardAnalytics from "./pages/LeaderboardAnalytics";
import Subscribe from "./pages/Subscribe";
import Sitemap from "./pages/Sitemap";
import BanPage from "./pages/BanPage";
import ConfirmReport from "./pages/ConfirmReport";
import AdminSearchInsights from "./pages/AdminSearchInsights";
import HoldThatLGenerator from "./pages/HoldThatLGenerator";
import AdminEditReport from "./pages/AdminEditReport";
import AdminProducerMerge from "./pages/AdminProducerMerge";
import PayEscrow from "./pages/PayEscrow";
import AdminSubmitExisting from "./pages/AdminSubmitExisting";
import AdminSubmitNew from "./pages/AdminSubmitNew";
import LiabilityClaim from "./pages/LiabilityClaim";
import LiabilityArena from "./pages/LiabilityArena";
import EscrowHub from "./pages/EscrowHub";
import EscrowInitiate from "./pages/EscrowInitiate";
import EscrowRedeem from "./pages/EscrowRedeem";
import DailyVisitors from "./pages/DailyVisitors";
import Results from "./pages/Results";
import FAFOGenerator from "./pages/FAFOGenerator";
import ClaimProducer from "./pages/ClaimProducer";
import CallSheetManager from "./pages/CallSheetManager";
import CrewContacts from "./pages/CrewContacts";
import ParseReview from "./pages/ParseReview";
import IGMatching from "./pages/IGMatching";
import AdminCallSheetReservoir from "./pages/AdminCallSheetReservoir";
import AdminNetworkGraph from "./pages/AdminNetworkGraph";
import BetaUnlock from "./pages/BetaUnlock";
import { FailureIndicator } from "./components/FailureIndicator";

const queryClient = new QueryClient();

const AppContent = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionValidated, setConnectionValidated] = useState(false);
  const [rlsValidated, setRlsValidated] = useState(false);
  const location = useLocation();

  // Dev-mode route config validator
  if (import.meta.env.DEV) {
    console.log("[Router] Loaded route config:", ROUTES.map(r => r.path));
  }

  // Test Supabase connection on mount (runs before other effects)
  useEffect(() => {
    const testConnection = async () => {
      if (!supabase) {
        // Already handled by App-level validation
        setConnectionValidated(true);
        return;
      }

      const result = await testSupabaseConnection(supabase);
      
      if (!result.connected) {
        console.error(
          "[FATAL SUPABASE CONFIG ERROR] Cannot connect to Supabase:",
          result.error
        );
        console.error("[FATAL SUPABASE CONFIG ERROR] Details:", result.details);
        console.error(
          "[FATAL SUPABASE CONFIG ERROR]",
          "Please verify:\n",
          `  - VITE_SUPABASE_URL is correct: ${import.meta.env.VITE_SUPABASE_URL}\n`,
          "  - VITE_SUPABASE_PUBLISHABLE_KEY is the correct 'anon' key\n",
          "  - Supabase project is active and accessible"
        );
      } else {
        console.log("[SUPABASE] Connection validated successfully");
      }
      
      setConnectionValidated(true);
      
      // After connection is validated, validate RLS assumptions and table existence
      if (result.connected && supabase) {
        // Validate RLS assumptions
        validateRLSAssumptions().then(results => {
          logRLSValidationResults(results);
          const summary = getRLSViolationsSummary(results);
          
          if (summary.hasViolations) {
            console.warn(
              `[RLS Validation] Found ${summary.criticalCount} critical and ${summary.warningCount} warning violations.`,
              'These may cause pages to appear empty or features to fail.'
            );
          }
          
          setRlsValidated(true);
        }).catch(err => {
          console.error('[RLS Validation] Failed to validate RLS assumptions:', err);
          setRlsValidated(true); // Continue anyway
        });

        // Validate table existence and storage buckets (run in parallel)
        Promise.all([
          validateTableExistence(),
          validateStorageBuckets()
        ]).then(([tableResults, storageResults]) => {
          logTableValidationResults(tableResults);
          logStorageBucketValidationResults(storageResults);
          
          const tableSummary = getTableValidationSummary(tableResults);
          
          if (!tableSummary.allValid) {
            if (tableSummary.criticalIssues > 0) {
              console.error(
                `[Table Validation] ${tableSummary.criticalIssues} critical table(s) missing!`,
                'Some features will not work. Ensure migrations have been run.'
              );
            } else if (tableSummary.warnings > 0) {
              console.warn(
                `[Table Validation] ${tableSummary.warnings} table(s)/view(s) missing or inaccessible.`,
                'Some features may have reduced functionality.'
              );
            }
          }

          // Storage validation warnings are logged in logStorageBucketValidationResults
        }).catch(err => {
          console.error('[Validation] Failed to validate database/storage:', err);
          // Don't block - continue anyway
        });
      } else {
        setRlsValidated(true); // Skip validation if connection failed
      }
    };

    testConnection();
  }, []);

  useEffect(() => {
    // For static pages, we can render even if connection isn't validated yet
    // Only block if we're trying to do backend-dependent operations
    
    // Wait for connection and RLS validation before starting app logic
    // BUT don't block rendering - let pages render and show loading states instead
    if (!connectionValidated || !rlsValidated) {
      // Still set loading to false so static pages can render
      // Backend-dependent features will show their own loading/error states
      setLoading(false);
      return;
    }
    
    // Guard: supabase should never be null here because App-level validation
    // prevents AppContent from rendering when env vars are missing
    if (!supabase) {
      console.error("[AppContent] Supabase client is null - this should not happen");
      setLoading(false);
      return;
    }

    checkMaintenanceMode();
    checkAdminStatus();
    trackVisit();
    
    // Subscribe to maintenance mode changes (useful for all users, including anonymous)
    // Failures for anonymous users are non-critical - they can still use the site
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    const setupRealtime = async () => {
      const { createRealtimeChannel, isAnonymousUser } = await import("@/lib/realtimeHelpers");
      const isAnonymous = await isAnonymousUser();
      
      channel = await createRealtimeChannel(
        'site_settings_changes',
        {
          table: 'site_settings',
          event: 'UPDATE',
          callback: (payload) => {
            const newData = payload.new as { maintenance_mode?: boolean; maintenance_message?: string };
            setMaintenanceMode(newData.maintenance_mode ?? false);
            setMaintenanceMessage(newData.maintenance_message || "");
          }
        },
        {
          feature: 'maintenance',
          silentForAnonymous: false, // Maintenance updates matter even for anonymous users
          onError: (error: unknown) => {
            // Only track failures for authenticated users
            // Anonymous users don't need realtime, so failures don't matter
            const err = error as { message?: string; status?: string; error?: unknown };
            if (!isAnonymous) {
              trackRealtimeFailure('site_settings_changes', err.message || 'Unknown error', {
                status: err.status,
                error: err.error
              });
            }
            console.warn("[App] Realtime subscription issue for site_settings (non-critical for anonymous):", error);
          }
        }
      );
    };
    
    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [connectionValidated]);

  const checkMaintenanceMode = async () => {
    if (!supabase) {
      // If Supabase is unavailable, don't block rendering
      // Static pages can still work without maintenance mode check
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("maintenance_mode, maintenance_message")
        .maybeSingle();
      
      if (error) {
        // Don't block rendering if maintenance mode check fails
        // Static pages should still work
        console.debug('[App] Maintenance mode check failed (non-critical):', error);
        // Default to non-maintenance mode and continue init
        setMaintenanceMode(false);
        setMaintenanceMessage("");
      } else if (!data) {
        // No site_settings row exists - default to normal operation
        console.debug('[App] No site_settings row found, defaulting to non-maintenance mode');
        setMaintenanceMode(false);
        setMaintenanceMessage("");
      } else {
        // Valid data - use it
        setMaintenanceMode(data.maintenance_mode);
        setMaintenanceMessage(data.maintenance_message || "");
      }
    } catch (err) {
      // Don't block rendering on maintenance check errors
      console.debug('[App] Maintenance mode check exception (non-critical):', err);
    } finally {
      setLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    if (!supabase) return;
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        // Only log if it's a real error, not just "no user" (which is expected for anonymous users)
        const isExpectedNoUser = userError.message?.toLowerCase().includes('session') || 
                                 userError.code === 'PGRST116'; // No rows returned
        if (!isExpectedNoUser) {
          trackRoleCheckFailure('checkAdminStatus', userError.message, {
            errorCode: userError.code
          });
          console.error("[App] Failed to get user for admin check:", userError);
        }
        return;
      }
      
      if (user) {
        const { shouldLogAdminCheckError, isNormalUserResponse } = await import("@/lib/adminCheckHelpers");
        const { data, error: roleError } = await supabase.rpc('has_role', { 
          _user_id: user.id, 
          _role: 'admin' 
        });
        
        // Check if this is just a normal user (not an admin) vs an actual error
        if (isNormalUserResponse(data, roleError)) {
          // User is simply not an admin - this is expected, not an error
          setIsAdmin(false);
          return;
        }

        // If there's an error, check if it's worth logging
        if (roleError) {
          const shouldLog = shouldLogAdminCheckError(roleError, data, { userId: user.id });
          
          if (shouldLog) {
            // Real error - track and log it
            trackRoleCheckFailure('checkAdminStatus', roleError.message, {
              userId: user.id,
              errorCode: roleError.code
            });
            console.error("[App] Failed to check admin role:", roleError);
          } else {
            // Expected "not admin" response - log at debug level only
            if (import.meta.env.DEV) {
              console.debug("[App] User is not admin (expected)");
            }
          }
          setIsAdmin(false);
          return;
        }
        
        // Success - user is admin
        setIsAdmin(!!data);
      }
    } catch (error: any) {
      // Exceptions are always real errors
      trackRoleCheckFailure('checkAdminStatus', error?.message || 'Unknown error', {
        errorType: error?.constructor?.name
      });
      console.error("[App] Exception in checkAdminStatus:", error);
    }
  };

  // Determine if current page is static and can render without backend
  const isStatic = location.pathname === '/how-it-works' || 
                   location.pathname === '/why-it-works' || 
                   location.pathname === '/disclaimer' || 
                   location.pathname === '/privacy-policy' || 
                   location.pathname === '/faq';

  // For static pages, allow rendering even if backend isn't ready
  // For other pages, wait for connection validation
  if (!isStatic && (loading || !connectionValidated || !rlsValidated)) {
    return null;
  }
  
  // For static pages, show loading only briefly, then allow render
  if (isStatic && loading && !connectionValidated) {
    // Still show loading while connection is being validated
    return null;
  }

  // Allow auth routes even during maintenance so admins can log in
  const isAuthRoute = location.pathname === '/auth' || location.pathname === '/reset-password';
  
  // Show maintenance page if enabled, user is not admin, AND not on auth page
  if (maintenanceMode && !isAdmin && !isAuthRoute) {
    return <Maintenance message={maintenanceMessage} />;
  }

  return (
    <>
      <FailureIndicator />
      <div className="pt-0 md:pt-[72px]">
        <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/results" element={<Results />} />
        <Route path="/results/fafo-generator" element={<FAFOGenerator />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/submit" element={<SubmitReport />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/why-it-works" element={<WhyItWorks />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth requireAdmin><Admin /></RequireAuth>} />
        <Route path="/admin/search-insights" element={<RequireAuth requireAdmin><AdminSearchInsights /></RequireAuth>} />
        <Route path="/admin/edit-report/:id" element={<RequireAuth requireAdmin><AdminEditReport /></RequireAuth>} />
        <Route path="/admin/merge-producers" element={<RequireAuth requireAdmin><AdminProducerMerge /></RequireAuth>} />
        <Route path="/admin-submit-existing" element={<RequireAuth requireAdmin><AdminSubmitExisting /></RequireAuth>} />
        <Route path="/admin-submit-new" element={<RequireAuth requireAdmin><AdminSubmitNew /></RequireAuth>} />
        <Route path="/hold-that-l" element={<HoldThatLGenerator />} />
        <Route path="/producer-dashboard" element={<RequireAuth><ProducerDashboard /></RequireAuth>} />
        <Route path="/suggestion-box" element={<SuggestionBox />} />
        <Route path="/suggestions" element={<SuggestionBox />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/leaderboard-analytics" element={<RequireAuth requireAdmin><LeaderboardAnalytics /></RequireAuth>} />
        <Route path="/admin/analytics/daily-visitors" element={<RequireAuth requireAdmin><DailyVisitors /></RequireAuth>} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/sitemap" element={<Sitemap />} />
        <Route path="/maintenance" element={<Maintenance message={maintenanceMessage} />} />
        <Route path="/ban/:banId" element={<BanPage />} />
        <Route path="/confirm" element={<ConfirmReport />} />
        <Route path="/pay/:code" element={<PayEscrow />} />
        <Route path="/pay/:code/success" element={<PayEscrow />} />
        <Route path="/liability/claim/:token" element={<LiabilityClaim />} />
        <Route path="/liability-arena/:reportId" element={<LiabilityArena />} />
        <Route path="/escrow" element={<EscrowHub />} />
        <Route path="/escrow/initiate" element={<EscrowInitiate />} />
        <Route path="/escrow/redeem" element={<EscrowRedeem />} />
        <Route path="/claim/:producerId" element={<ClaimProducer />} />
        <Route path="/call-sheets" element={<RequireAuth requireBeta><CallSheetManager /></RequireAuth>} />
        <Route path="/call-sheets/:id/review" element={<RequireAuth requireBeta><ParseReview /></RequireAuth>} />
        <Route path="/call-sheets/:id/ig-matching" element={<RequireAuth requireBeta><IGMatching /></RequireAuth>} />
        <Route path="/crew-contacts" element={<RequireAuth requireBeta><CrewContacts /></RequireAuth>} />
        <Route path="/admin/call-sheet-reservoir" element={<RequireAuth requireAdmin><AdminCallSheetReservoir /></RequireAuth>} />
        <Route path="/admin/intelligence/network-graph" element={<RequireAuth requireAdmin><AdminNetworkGraph /></RequireAuth>} />
        <Route path="/admin/intelligence/heat-map" element={<RequireAuth requireAdmin><AdminCallSheetReservoir /></RequireAuth>} />
        <Route path="/beta-unlock" element={<RequireAuth><BetaUnlock /></RequireAuth>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  );
};

const App = () => {
  // Validate environment variables before rendering app
  const envStatus = validateEnv();

  if (!envStatus.ok) {
    const missingVars = (envStatus as { ok: false; missing: string[] }).missing;
    console.error(
      "[FATAL CONFIG ERROR] Missing environment variables:",
      missingVars
    );

    return (
      <div style={{ 
        padding: 32, 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: 600,
        margin: '0 auto',
        marginTop: '10vh'
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
          Configuration Error
        </h1>
        <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
          This site is temporarily unavailable due to a server configuration issue.
        </p>
        <p style={{ marginBottom: 8, fontWeight: 'bold' }}>
          Missing environment variables:
        </p>
        <ul style={{ marginLeft: 20, marginBottom: 16 }}>
          {missingVars.map((key) => (
            <li key={key} style={{ marginBottom: 4 }}>{key}</li>
          ))}
        </ul>
        <p style={{ fontSize: 14, color: '#666', marginTop: 24 }}>
          Please contact the site administrator if this issue persists.
        </p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AdminProxyProvider>
              <AppContent />
            </AdminProxyProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
