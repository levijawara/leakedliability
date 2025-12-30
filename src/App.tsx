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
import { validateEnv, testSupabaseConnection } from "@/config/env";
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

const queryClient = new QueryClient();

const AppContent = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionValidated, setConnectionValidated] = useState(false);
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
    };

    testConnection();
  }, []);

  useEffect(() => {
    // Wait for connection validation before starting app logic
    if (!connectionValidated) return;
    
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
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('site_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'site_settings'
        },
        (payload) => {
          setMaintenanceMode(payload.new.maintenance_mode);
          setMaintenanceMessage(payload.new.maintenance_message || "");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionValidated]);

  const checkMaintenanceMode = async () => {
    if (!supabase) return;
    
    const { data } = await supabase
      .from("site_settings")
      .select("maintenance_mode, maintenance_message")
      .single();
    
    if (data) {
      setMaintenanceMode(data.maintenance_mode);
      setMaintenanceMessage(data.maintenance_message || "");
    }
    setLoading(false);
  };

  const checkAdminStatus = async () => {
    if (!supabase) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.rpc('has_role', { 
        _user_id: user.id, 
        _role: 'admin' 
      });
      setIsAdmin(!!data);
    }
  };

  // Show loading until connection is validated and initial setup complete
  if (loading || !connectionValidated) {
    return null;
  }

  // Allow auth routes even during maintenance so admins can log in
  const isAuthRoute = location.pathname === '/auth' || location.pathname === '/reset-password';
  
  // Show maintenance page if enabled, user is not admin, AND not on auth page
  if (maintenanceMode && !isAdmin && !isAuthRoute) {
    return <Maintenance message={maintenanceMessage} />;
  }

  return (
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
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/search-insights" element={<AdminSearchInsights />} />
        <Route path="/admin/edit-report/:id" element={<AdminEditReport />} />
        <Route path="/admin/merge-producers" element={<AdminProducerMerge />} />
        <Route path="/admin-submit-existing" element={<AdminSubmitExisting />} />
        <Route path="/admin-submit-new" element={<AdminSubmitNew />} />
        <Route path="/hold-that-l" element={<HoldThatLGenerator />} />
        <Route path="/producer-dashboard" element={<ProducerDashboard />} />
        <Route path="/suggestion-box" element={<SuggestionBox />} />
        <Route path="/suggestions" element={<SuggestionBox />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/leaderboard-analytics" element={<LeaderboardAnalytics />} />
        <Route path="/admin/analytics/daily-visitors" element={<DailyVisitors />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/sitemap" element={<Sitemap />} />
        <Route path="/maintenance" element={<Maintenance message={maintenanceMessage} />} />
        <Route path="/ban/:banId" element={<BanPage />} />
        <Route path="/confirm" element={<ConfirmReport />} />
        <Route path="/pay/:code" element={<PayEscrow />} />
        <Route path="/pay/:code/success" element={<PayEscrow />} />
        <Route path="/liability/claim/:token" element={<LiabilityClaim />} />
        <Route path="/escrow" element={<EscrowHub />} />
        <Route path="/escrow/initiate" element={<EscrowInitiate />} />
        <Route path="/escrow/redeem" element={<EscrowRedeem />} />
        <Route path="/claim/:producerId" element={<ClaimProducer />} />
        <Route path="/call-sheets" element={<CallSheetManager />} />
        <Route path="/call-sheets/:id/review" element={<ParseReview />} />
        <Route path="/call-sheets/:id/ig-matching" element={<IGMatching />} />
        <Route path="/crew-contacts" element={<CrewContacts />} />
        <Route path="/admin/call-sheet-reservoir" element={<AdminCallSheetReservoir />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
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
