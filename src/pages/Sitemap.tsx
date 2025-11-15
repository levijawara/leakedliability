import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Home,
  LogIn,
  Key,
  Mail,
  Info,
  AlertTriangle,
  HelpCircle,
  MessageSquare,
  User,
  FileText,
  LayoutDashboard,
  TrendingUp,
  Shield,
  Globe,
  Lock,
  Star,
  Search,
  Map,
  ArrowLeft,
  BarChart3,
  FileCheck,
  FileX,
  DollarSign,
  Settings,
  Users,
  Lightbulb,
  ShieldAlert,
  ScrollText,
  ChevronRight,
} from "lucide-react";
import { Footer } from "@/components/Footer";

interface RouteInfo {
  path: string;
  name: string;
  icon: any;
  description: string;
  tabs?: string[];
}

interface RoutesData {
  public: RouteInfo[];
  authenticated: RouteInfo[];
  leaderboard: RouteInfo[];
  admin: RouteInfo[];
  edgeFunctions: RouteInfo[];
}

const Sitemap = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (error || !data) {
        toast({
          title: "Access Denied",
          description: "Admin privileges required to view sitemap.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to verify admin access.",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const routes: RoutesData = {
    public: [
      { path: "/", name: "Home", icon: Home, description: "Overview of Leaked Liability; primary CTA to submit reports" },
      { path: "/how-it-works", name: "How It Works", icon: Info, description: "Full breakdown of reporting → verification → leaderboard" },
      { path: "/terms", name: "Terms of Service", icon: ScrollText, description: "Platform terms and conditions" },
      { path: "/privacy", name: "Privacy Policy", icon: ShieldAlert, description: "Privacy policy and data handling" },
    ],
    authenticated: [
      { path: "/submission-form/crew", name: "Crew Report Form", icon: FileText, description: "Submit unpaid invoice report as a crew member" },
      { path: "/submission-form/vendor", name: "Vendor Report Form", icon: FileCheck, description: "Submit unpaid invoice report as a vendor/service provider" },
    ],
    leaderboard: [
      { path: "/leaderboard", name: "Leaderboard", icon: TrendingUp, description: "Public-facing producer debt rankings; requires access check" },
      { path: "/leaderboard/paywall", name: "Leaderboard Paywall", icon: Lock, description: "Shows reason for access denial; CTAs to subscribe or submit reports" },
      { path: "/subscription", name: "Subscription", icon: DollarSign, description: "Stripe-subscription checkout" },
    ],
    admin: [
      {
        path: "/admin",
        name: "Admin Dashboard",
        icon: Shield,
        description: "Main admin control panel with multiple management tabs",
        tabs: [
          "📋 Submissions Pending",
          "✅ Verified Reports",
          "❌ Rejected Reports",
          "💰 Payments Due",
          "✅ Payments Paid",
          "⚙️ Site Settings",
          "👥 Users",
          "💡 Suggestions",
          "🛡️ Moderation",
          "🧾 Audit Logs",
          "📧 Producer Notification Emails",
        ],
      },
      { path: "/admin/merge-producers", name: "Merge Producers", icon: Users, description: "Manual tool to merge duplicate producers safely" },
      { path: "/leaderboard-analytics", name: "Analytics Dashboard", icon: BarChart3, description: "View leaderboard subscription + usage analytics" },
    ],
    edgeFunctions: [
      { path: "check-leaderboard-access", name: "check-leaderboard-access", icon: Settings, description: "Edge function reference - not a user route" },
      { path: "send-producer-notifications", name: "send-producer-notifications", icon: Settings, description: "Edge function reference - not a user route" },
      { path: "send-email", name: "send-email", icon: Settings, description: "Edge function reference - not a user route" },
      { path: "admin-create-user", name: "admin-create-user", icon: Settings, description: "Edge function reference - not a user route" },
      { path: "admin-merge-producers", name: "admin-merge-producers", icon: Settings, description: "Edge function reference - not a user route" },
    ],
  };

  const filterRoutes = (routeList: RouteInfo[]) => {
    if (!searchQuery) return routeList;
    return routeList.filter(
      (route) =>
        route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.path.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const RouteCard = ({ route, variant }: { route: RouteInfo; variant: "public" | "authenticated" | "leaderboard" | "admin" | "edgeFunctions" }) => {
    const Icon = route.icon;
    const isCurrentPage = location.pathname === route.path;
    const isEdgeFunction = variant === "edgeFunctions";

    const variantStyles = {
      public: "border-green-500/20 hover:border-green-500/40",
      authenticated: "border-blue-500/20 hover:border-blue-500/40",
      leaderboard: "border-purple-500/20 hover:border-purple-500/40",
      admin: "border-red-500/20 hover:border-red-500/40",
      edgeFunctions: "border-gray-500/20 hover:border-gray-500/40",
    };

    const badgeVariants = {
      public: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
      authenticated: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
      leaderboard: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
      admin: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
      edgeFunctions: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
    };

    return (
      <Card 
        className={`${variantStyles[variant]} transition-all ${isEdgeFunction ? "opacity-75" : "cursor-pointer hover:shadow-md"} ${isCurrentPage ? "ring-2 ring-primary" : ""}`} 
        onClick={() => !isEdgeFunction && navigate(route.path)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <CardTitle className="text-lg">{route.name}</CardTitle>
              {isCurrentPage && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
              {isEdgeFunction && <Badge variant="secondary" className="ml-2 text-xs">Reference Only</Badge>}
            </div>
            <Badge variant="outline" className={badgeVariants[variant]}>
              {variant === "public" && <Globe className="h-3 w-3 mr-1" />}
              {variant === "authenticated" && <Lock className="h-3 w-3 mr-1" />}
              {variant === "leaderboard" && <TrendingUp className="h-3 w-3 mr-1" />}
              {variant === "admin" && <Shield className="h-3 w-3 mr-1" />}
              {variant === "edgeFunctions" && <Settings className="h-3 w-3 mr-1" />}
              {variant === "edgeFunctions" ? "Edge Function" : variant.charAt(0).toUpperCase() + variant.slice(1)}
            </Badge>
          </div>
          <CardDescription className="text-sm">{route.description}</CardDescription>
        </CardHeader>
        {route.tabs && (
          <CardContent className="pt-0">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">Admin Tabs ({route.tabs.length}):</p>
              <div className="grid grid-cols-1 gap-1">
                {route.tabs.map((tab, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ChevronRight className="h-3 w-3" />
                    {tab}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
        <CardContent className="pt-2 border-t">
          <code className="text-xs text-muted-foreground">{route.path}</code>
        </CardContent>
      </Card>
    );
  };

  const filteredPublicRoutes = filterRoutes(routes.public);
  const filteredAuthRoutes = filterRoutes(routes.authenticated);
  const filteredLeaderboardRoutes = filterRoutes(routes.leaderboard);
  const filteredAdminRoutes = filterRoutes(routes.admin);
  const filteredEdgeFunctions = filterRoutes(routes.edgeFunctions);

  const totalRoutes = routes.public.length + routes.authenticated.length + routes.leaderboard.length + routes.admin.length + routes.edgeFunctions.length;
  const totalFiltered = filteredPublicRoutes.length + filteredAuthRoutes.length + filteredLeaderboardRoutes.length + filteredAdminRoutes.length + filteredEdgeFunctions.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <Map className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Platform Sitemap</h1>
          </div>
          <p className="text-muted-foreground">
            Complete navigation map of all {totalRoutes} pages and routes
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search routes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing {totalFiltered} of {totalRoutes} routes
            </p>
          )}
        </div>

        {/* Route Sections */}
        <div className="space-y-8">
          {/* Public Routes */}
          {filteredPublicRoutes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-6 w-6 text-green-600" />
                <h2 className="text-2xl font-bold">✔ PUBLIC ROUTES</h2>
                <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20">
                  {filteredPublicRoutes.length} routes
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPublicRoutes.map((route) => (
                  <RouteCard key={route.path} route={route} variant="public" />
                ))}
              </div>
            </div>
          )}

          {/* Authenticated Routes */}
          {filteredAuthRoutes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Lock className="h-6 w-6 text-blue-600" />
                <h2 className="text-2xl font-bold">✔ AUTHENTICATED USER ROUTES</h2>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
                  {filteredAuthRoutes.length} routes
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAuthRoutes.map((route) => (
                  <RouteCard key={route.path} route={route} variant="authenticated" />
                ))}
              </div>
            </div>
          )}

          {/* Leaderboard Routes */}
          {filteredLeaderboardRoutes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-6 w-6 text-purple-600" />
                <h2 className="text-2xl font-bold">✔ LEADERBOARD ROUTES</h2>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
                  {filteredLeaderboardRoutes.length} routes
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLeaderboardRoutes.map((route) => (
                  <RouteCard key={route.path} route={route} variant="leaderboard" />
                ))}
              </div>
            </div>
          )}

          {/* Admin Routes */}
          {filteredAdminRoutes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-6 w-6 text-red-600" />
                <h2 className="text-2xl font-bold">✔ ADMIN-ONLY ROUTES</h2>
                <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20">
                  {filteredAdminRoutes.length} routes
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAdminRoutes.map((route) => (
                  <RouteCard key={route.path} route={route} variant="admin" />
                ))}
              </div>
            </div>
          )}

          {/* Edge Functions */}
          {filteredEdgeFunctions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-6 w-6 text-gray-600" />
                <h2 className="text-2xl font-bold">✔ EDGE FUNCTIONS (NON-ROUTE, ARCHITECTURE REFERENCES)</h2>
                <Badge variant="outline" className="bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20">
                  {filteredEdgeFunctions.length} references
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">These are backend functions, not user-accessible routes</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEdgeFunctions.map((route) => (
                  <RouteCard key={route.path} route={route} variant="edgeFunctions" />
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {totalFiltered === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No routes found matching "{searchQuery}"</p>
            </Card>
          )}
        </div>

        {/* 404 Catch-all */}
        <div className="mt-8">
          <Card className="border-yellow-500/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <CardTitle>404 Catch-all Route</CardTitle>
              </div>
              <CardDescription>Any invalid route redirects to the Not Found page</CardDescription>
            </CardHeader>
            <CardContent>
              <code className="text-xs text-muted-foreground">/*</code>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Sitemap;
