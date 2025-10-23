import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
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
  admin: RouteInfo[];
}

const Sitemap = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const routes: RoutesData = {
    public: [
      { path: "/", name: "Home", icon: Home, description: "Landing page with hero section and platform overview" },
      { path: "/auth", name: "Authentication", icon: LogIn, description: "Sign in or sign up for an account" },
      { path: "/reset-password", name: "Reset Password", icon: Key, description: "Reset your account password" },
      { path: "/verify-email", name: "Email Verification", icon: Mail, description: "Verify your email address" },
      { path: "/how-it-works", name: "How It Works", icon: Info, description: "Learn how the platform operates" },
      { path: "/why-it-works", name: "Why It Works", icon: Info, description: "Understand the reasoning behind our approach" },
      { path: "/disclaimer", name: "Disclaimer", icon: AlertTriangle, description: "Legal disclaimers and terms" },
      { path: "/faq", name: "FAQ", icon: HelpCircle, description: "Frequently asked questions" },
      { path: "/suggestions", name: "Suggestion Box", icon: MessageSquare, description: "Submit feedback and suggestions" },
      { path: "/maintenance", name: "Maintenance Mode", icon: Settings, description: "Shown when site is under maintenance (admin-only bypass)" },
    ],
    authenticated: [
      { path: "/profile", name: "User Profile", icon: User, description: "Manage your account settings and information" },
      { path: "/submit", name: "Submit Report", icon: FileText, description: "Multi-step report submission walkthrough" },
      { path: "/producer-dashboard", name: "Producer Dashboard", icon: LayoutDashboard, description: "View reports associated with your production company" },
      { path: "/leaderboard", name: "Leaderboard", icon: TrendingUp, description: "View ranking of reported producers (paywall protected)" },
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
        ],
      },
      { path: "/leaderboard-analytics", name: "Analytics Dashboard", icon: BarChart3, description: "View leaderboard subscription and revenue analytics" },
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

  const RouteCard = ({ route, variant }: { route: RouteInfo; variant: "public" | "authenticated" | "admin" }) => {
    const Icon = route.icon;
    const isCurrentPage = location.pathname === route.path;

    const variantStyles = {
      public: "border-green-500/20 hover:border-green-500/40",
      authenticated: "border-blue-500/20 hover:border-blue-500/40",
      admin: "border-red-500/20 hover:border-red-500/40",
    };

    const badgeVariants = {
      public: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
      authenticated: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
      admin: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
    };

    return (
      <Card className={`${variantStyles[variant]} transition-all cursor-pointer hover:shadow-md ${isCurrentPage ? "ring-2 ring-primary" : ""}`} onClick={() => navigate(route.path)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <CardTitle className="text-lg">{route.name}</CardTitle>
              {isCurrentPage && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
            </div>
            <Badge variant="outline" className={badgeVariants[variant]}>
              {variant === "public" && <Globe className="h-3 w-3 mr-1" />}
              {variant === "authenticated" && <Lock className="h-3 w-3 mr-1" />}
              {variant === "admin" && <Shield className="h-3 w-3 mr-1" />}
              {variant.charAt(0).toUpperCase() + variant.slice(1)}
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
  const filteredAdminRoutes = filterRoutes(routes.admin);

  const totalRoutes = routes.public.length + routes.authenticated.length + routes.admin.length;
  const totalFiltered = filteredPublicRoutes.length + filteredAuthRoutes.length + filteredAdminRoutes.length;

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
                <h2 className="text-2xl font-bold">Public Routes</h2>
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
                <h2 className="text-2xl font-bold">Authenticated User Routes</h2>
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

          {/* Admin Routes */}
          {filteredAdminRoutes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-6 w-6 text-red-600" />
                <h2 className="text-2xl font-bold">Admin-Only Routes</h2>
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
    </div>
  );
};

export default Sitemap;
