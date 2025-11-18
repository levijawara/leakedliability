import { useEffect, useState } from "react";
import { ROUTES } from "@/config/routes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client"; // Force rebuild
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
import FAQ from "./pages/FAQ";
import Maintenance from "./pages/Maintenance";
import NotFound from "./pages/NotFound";
import ProducerDashboard from "./pages/ProducerDashboard";
import SuggestionBox from "./pages/SuggestionBox";
import VerifyEmail from "./pages/VerifyEmail";
import LeaderboardAnalytics from "./pages/LeaderboardAnalytics";
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

const queryClient = new QueryClient();

const AppContent = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dev-mode route config validator
  if (import.meta.env.DEV) {
    console.log("[Router] Loaded route config:", ROUTES.map(r => r.path));
  }

  useEffect(() => {
    checkMaintenanceMode();
    checkAdminStatus();
    
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
  }, []);

  const checkMaintenanceMode = async () => {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.rpc('has_role', { 
        _user_id: user.id, 
        _role: 'admin' 
      });
      setIsAdmin(!!data);
    }
  };

  if (loading) {
    return null;
  }

  // Show maintenance page if enabled and user is not admin
  if (maintenanceMode && !isAdmin) {
    return <Maintenance message={maintenanceMessage} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/submit" element={<SubmitReport />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/why-it-works" element={<WhyItWorks />} />
      <Route path="/disclaimer" element={<Disclaimer />} />
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
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/leaderboard-analytics" element={<LeaderboardAnalytics />} />
      <Route path="/sitemap" element={<Sitemap />} />
      <Route path="/maintenance" element={<Maintenance message={maintenanceMessage} />} />
      <Route path="/ban/:banId" element={<BanPage />} />
      <Route path="/confirm" element={<ConfirmReport />} />
      <Route path="/pay/:code" element={<PayEscrow />} />
      <Route path="/pay/:code/success" element={<PayEscrow />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
