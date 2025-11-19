import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Code, Zap, User, Boxes, Info, UserCircle, FileText, RefreshCw, DollarSign, AlertTriangle, CreditCard, Shield, LayoutList, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import * as Icons from "lucide-react";
import { ROUTES, ROUTE_CATEGORIES } from "@/config/routes";
import { Footer } from "@/components/Footer";
import { EmailPreview } from "@/components/admin/EmailPreview";

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

interface EmailTemplateInfo {
  name: string;
  templateFile: string;
  trigger: string;
  recipient: string;
  edgeFunction: string;
  purpose: string;
  status: 'implemented' | 'pending';
  category: 'account' | 'reports' | 'liability' | 'payment' | 'disputes' | 'subscriptions' | 'admin';
}

const EMAIL_CATALOGUE: EmailTemplateInfo[] = [
  // Account & Authentication (4 emails)
  {
    name: "Welcome Email",
    templateFile: "welcome.tsx",
    trigger: "New user account created",
    recipient: "New user",
    edgeFunction: "send-email",
    purpose: "Welcome message with platform introduction",
    status: "implemented",
    category: "account"
  },
  {
    name: "Admin Created Account",
    templateFile: "admin-created-account.tsx",
    trigger: "Admin creates account on behalf of user",
    recipient: "New user created by admin",
    edgeFunction: "send-email",
    purpose: "Notify user of admin-created account with temporary credentials",
    status: "implemented",
    category: "account"
  },
  {
    name: "Email Verification",
    templateFile: "email-verification.tsx",
    trigger: "User signs up or requests email verification",
    recipient: "New user",
    edgeFunction: "send-email",
    purpose: "Verify email address with branded LL™ template. Includes CTA button and optional verification code.",
    status: "implemented",
    category: "account"
  },
  {
    name: "Password Reset",
    templateFile: "password-reset.tsx",
    trigger: "User requests password reset",
    recipient: "User",
    edgeFunction: "send-email",
    purpose: "Send password reset link with 60-minute expiration. Includes security warning if request was unauthorized.",
    status: "implemented",
    category: "account"
  },

  // Report Submissions (7 emails)
  {
    name: "Crew Report Confirmation",
    templateFile: "crew-report-confirmation.tsx",
    trigger: "Crew member submits payment report",
    recipient: "Crew member (reporter)",
    edgeFunction: "send-email",
    purpose: "Confirm report submission received",
    status: "implemented",
    category: "reports"
  },
  {
    name: "Vendor Report Confirmation",
    templateFile: "vendor-report-confirmation.tsx",
    trigger: "Vendor submits payment report",
    recipient: "Vendor (reporter)",
    edgeFunction: "send-email",
    purpose: "Confirm report submission received",
    status: "implemented",
    category: "reports"
  },
  {
    name: "Producer Submission Notification",
    templateFile: "producer-submission.tsx",
    trigger: "Producer self-reports payment issue",
    recipient: "Producer",
    edgeFunction: "send-email",
    purpose: "Confirm producer's self-submission",
    status: "implemented",
    category: "reports"
  },
  {
    name: "Crew Report Verified",
    templateFile: "crew-report-verified.tsx",
    trigger: "Admin verifies crew report",
    recipient: "Crew member (reporter)",
    edgeFunction: "send-email",
    purpose: "Notify reporter their report is now public on leaderboard",
    status: "implemented",
    category: "reports"
  },
  {
    name: "Vendor Report Verified",
    templateFile: "vendor-report-verified.tsx",
    trigger: "Admin verifies vendor report",
    recipient: "Vendor (reporter)",
    edgeFunction: "send-email",
    purpose: "Notify reporter their report is now public on leaderboard",
    status: "implemented",
    category: "reports"
  },
  {
    name: "Crew Report Rejected",
    templateFile: "crew-report-rejected.tsx",
    trigger: "Admin rejects crew report",
    recipient: "Crew member (reporter)",
    edgeFunction: "send-email",
    purpose: "Notify reporter of rejection with reason",
    status: "implemented",
    category: "reports"
  },
  {
    name: "Vendor Report Rejected",
    templateFile: "vendor-report-rejected.tsx",
    trigger: "Admin rejects vendor report",
    recipient: "Vendor (reporter)",
    edgeFunction: "send-email",
    purpose: "Notify reporter of rejection with reason",
    status: "implemented",
    category: "reports"
  },

  // Liability Chain (4 emails)
  {
    name: "Initial Liability Notification",
    templateFile: "liability-notification.tsx",
    trigger: "Report filed naming producer/company as responsible party",
    recipient: "Named producer/company",
    edgeFunction: "send-liability-notification",
    purpose: "Alert accused party with action link (accept/dispute/redirect). Contains legal warning about perjury.",
    status: "implemented",
    category: "liability"
  },
  {
    name: "Liability Redirect Notification",
    templateFile: "liability-notification.tsx (reused)",
    trigger: "Someone redirects liability to a new party",
    recipient: "Newly accused party",
    edgeFunction: "send-liability-notification",
    purpose: "Inform newly named party they've been accused. Provides action link with perjury warning.",
    status: "implemented",
    category: "liability"
  },
  {
    name: "Liability Loop Detected",
    templateFile: "liability-loop-detected.tsx",
    trigger: "Liability redirected to someone already in the chain",
    recipient: "All parties in the loop",
    edgeFunction: "send-email",
    purpose: "Notify parties that loop was detected and liability reverted to original accused",
    status: "implemented",
    category: "liability"
  },
  {
    name: "Liability Accepted Confirmation",
    templateFile: "liability-accepted.tsx",
    trigger: "Accused party accepts responsibility",
    recipient: "Party who accepted liability",
    edgeFunction: "process-liability-claim",
    purpose: "Confirm acceptance and provide next steps for payment",
    status: "pending",
    category: "liability"
  },

  // Payment & Resolution (3 emails)
  {
    name: "Producer Report Notification",
    templateFile: "producer-report-notification.tsx",
    trigger: "New report filed against producer",
    recipient: "Producer",
    edgeFunction: "send-email",
    purpose: "Alert producer of new report with details and resolution options",
    status: "implemented",
    category: "payment"
  },
  {
    name: "Producer Payment Confirmation",
    templateFile: "producer-payment-confirmation.tsx",
    trigger: "Producer uploads payment proof or pays via escrow",
    recipient: "Producer who made payment",
    edgeFunction: "send-email",
    purpose: "Confirm payment received and report will be marked resolved",
    status: "implemented",
    category: "payment"
  },
  {
    name: "Crew Payment Confirmed",
    templateFile: "crew-report-payment-confirmed.tsx",
    trigger: "Payment confirmed by admin or via escrow",
    recipient: "Crew member (original reporter)",
    edgeFunction: "send-email",
    purpose: "Notify reporter that payment was confirmed and report is resolved",
    status: "implemented",
    category: "payment"
  },

  // Disputes (3 emails)
  {
    name: "Dispute Submission",
    templateFile: "dispute-submission.tsx",
    trigger: "Producer/company files dispute on report",
    recipient: "Disputing party",
    edgeFunction: "send-email",
    purpose: "Confirm dispute submission received and under review",
    status: "implemented",
    category: "disputes"
  },
  {
    name: "Counter-Dispute Submission",
    templateFile: "counter-dispute-submission.tsx",
    trigger: "Original reporter submits counter-dispute",
    recipient: "Counter-disputing party",
    edgeFunction: "send-email",
    purpose: "Confirm counter-dispute received and under admin review",
    status: "implemented",
    category: "disputes"
  },
  {
    name: "Dispute Resolved",
    templateFile: "dispute-resolved.tsx",
    trigger: "Admin resolves dispute",
    recipient: "Both parties (reporter and accused)",
    edgeFunction: "send-email",
    purpose: "Notify both sides of dispute outcome and updated report status",
    status: "pending",
    category: "disputes"
  },

  // Subscriptions (2 emails)
  {
    name: "Subscription Payment Failed",
    templateFile: "subscription-payment-failed.tsx",
    trigger: "Stripe payment fails",
    recipient: "User with failed payment",
    edgeFunction: "leaderboard-stripe-webhooks",
    purpose: "Warn user of failed payment and upcoming access restriction",
    status: "pending",
    category: "subscriptions"
  },
  {
    name: "Subscription Canceled",
    templateFile: "subscription-canceled.tsx",
    trigger: "User cancels or payment fails repeatedly",
    recipient: "User",
    edgeFunction: "leaderboard-stripe-webhooks",
    purpose: "Confirm cancellation and explain access changes",
    status: "pending",
    category: "subscriptions"
  },

  // Admin System (2 emails)
  {
    name: "Admin Notification",
    templateFile: "admin-notification.tsx",
    trigger: "Various admin-worthy events (disputes, flags, etc.)",
    recipient: "Admin team",
    edgeFunction: "send-email",
    purpose: "Alert admins to events requiring review or action",
    status: "implemented",
    category: "admin"
  },
  {
    name: "New Report Alert",
    templateFile: "admin-report-alert.tsx",
    trigger: "New payment report submitted",
    recipient: "Admin team",
    edgeFunction: "send-email",
    purpose: "Notify admins of new report awaiting verification",
    status: "pending",
    category: "admin"
  },
];

const Sitemap = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [emailViewMode, setEmailViewMode] = useState<"list" | "gallery">("list");
  const [selectedEmail, setSelectedEmail] = useState<EmailTemplateInfo | null>(null);
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

  // Convert icon string names to actual lucide-react components
  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.HelpCircle;
  };

  // Group routes by category dynamically
  const routesByCategory = ROUTE_CATEGORIES.reduce((acc, category) => {
    acc[category] = ROUTES.filter(r => r.category === category).map(route => ({
      path: route.path,
      name: route.name,
      icon: getIcon(route.icon),
      description: route.description,
      tabs: route.tabs,
    }));
    return acc;
  }, {} as Record<string, RouteInfo[]>);

  const routes: RoutesData = {
    public: routesByCategory.public,
    authenticated: routesByCategory.authenticated,
    leaderboard: routesByCategory.leaderboard,
    admin: routesByCategory.admin,
    edgeFunctions: [], // Keep empty for now, can be moved to config later if needed
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
              {isCurrentPage && <Icons.Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
              {isEdgeFunction && <Badge variant="secondary" className="ml-2 text-xs">Reference Only</Badge>}
            </div>
            <Badge variant="outline" className={badgeVariants[variant]}>
              {variant === "public" && <Icons.Globe className="h-3 w-3 mr-1" />}
              {variant === "authenticated" && <Icons.Lock className="h-3 w-3 mr-1" />}
              {variant === "leaderboard" && <Icons.TrendingUp className="h-3 w-3 mr-1" />}
              {variant === "admin" && <Icons.Shield className="h-3 w-3 mr-1" />}
              {variant === "edgeFunctions" && <Icons.Settings className="h-3 w-3 mr-1" />}
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
                    <Icons.ChevronRight className="h-3 w-3" />
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
            <Icons.ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <Icons.Map className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Platform Sitemap</h1>
          </div>
          <p className="text-muted-foreground">
            Complete navigation map of all {totalRoutes} pages and routes
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <Icons.Globe className="h-6 w-6 text-green-600" />
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
                <Icons.Lock className="h-6 w-6 text-blue-600" />
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
                <Icons.TrendingUp className="h-6 w-6 text-purple-600" />
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
                <Icons.Shield className="h-6 w-6 text-red-600" />
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
                <Icons.Settings className="h-6 w-6 text-gray-600" />
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

        {/* Email Catalogue Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Mail className="h-6 w-6 text-orange-600" />
              <h2 className="text-2xl font-bold">✉️ EMAIL CATALOGUE</h2>
              <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20">
                {EMAIL_CATALOGUE.filter(e => e.status === 'implemented').length} implemented
              </Badge>
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20">
                {EMAIL_CATALOGUE.filter(e => e.status === 'pending').length} pending
              </Badge>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={emailViewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setEmailViewMode("list")}
                className="gap-2"
              >
                <LayoutList className="h-4 w-4" />
                List View
              </Button>
              <Button
                variant={emailViewMode === "gallery" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setEmailViewMode("gallery");
                  if (!selectedEmail && EMAIL_CATALOGUE.length > 0) {
                    setSelectedEmail(EMAIL_CATALOGUE[0]);
                  }
                }}
                className="gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                Gallery View
              </Button>
            </div>
          </div>
            
          <p className="text-muted-foreground mb-6">
            All automated system emails and templates. Shows what communications users receive at each stage of the platform lifecycle.
          </p>

          {emailViewMode === "list" ? (
            <Accordion type="multiple" className="space-y-4">
              {/* Account & Authentication */}
              <AccordionItem value="account" className="border rounded-lg px-4">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">Account & Authentication</span>
                    <Badge variant="secondary" className="ml-2">
                      {EMAIL_CATALOGUE.filter(e => e.category === 'account').length} emails
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 pt-4">
                    {EMAIL_CATALOGUE.filter(e => e.category === 'account').map((email, idx) => (
                      <Card key={idx} className="p-4 hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-lg">{email.name}</h3>
                          <Badge variant={email.status === 'implemented' ? 'default' : 'secondary'}>
                            {email.status === 'implemented' ? '✅ Live' : '🚧 Pending'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <Code className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <code className="text-xs bg-muted px-2 py-1 rounded">{email.templateFile}</code>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Zap className="h-4 w-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                            <span><strong>Trigger:</strong> {email.trigger}</span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                            <span><strong>Recipient:</strong> {email.recipient}</span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Boxes className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />
                            <span><strong>Function:</strong> <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{email.edgeFunction}</code></span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">{email.purpose}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Report Submissions */}
              <AccordionItem value="reports" className="border rounded-lg px-4">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span className="font-semibold">Report Submissions</span>
                    <Badge variant="secondary" className="ml-2">
                      {EMAIL_CATALOGUE.filter(e => e.category === 'reports').length} emails
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 pt-4">
                    {EMAIL_CATALOGUE.filter(e => e.category === 'reports').map((email, idx) => (
                      <Card key={idx} className="p-4 hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-lg">{email.name}</h3>
                          <Badge variant={email.status === 'implemented' ? 'default' : 'secondary'}>
                            {email.status === 'implemented' ? '✅ Live' : '🚧 Pending'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <Code className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <code className="text-xs bg-muted px-2 py-1 rounded">{email.templateFile}</code>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Zap className="h-4 w-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                            <span><strong>Trigger:</strong> {email.trigger}</span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                            <span><strong>Recipient:</strong> {email.recipient}</span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Boxes className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />
                            <span><strong>Function:</strong> <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{email.edgeFunction}</code></span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">{email.purpose}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Liability Chain */}
              <AccordionItem value="liability" className="border rounded-lg px-4">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-orange-600" />
                    <span className="font-semibold">Liability Chain (Ring Around the Rosie)</span>
                    <Badge variant="secondary" className="ml-2">
                      {EMAIL_CATALOGUE.filter(e => e.category === 'liability').length} emails
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 pt-4">
                    {EMAIL_CATALOGUE.filter(e => e.category === 'liability').map((email, idx) => (
                      <Card key={idx} className="p-4 hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-lg">{email.name}</h3>
                          <Badge variant={email.status === 'implemented' ? 'default' : 'secondary'}>
                            {email.status === 'implemented' ? '✅ Live' : '🚧 Pending'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <Code className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <code className="text-xs bg-muted px-2 py-1 rounded">{email.templateFile}</code>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Zap className="h-4 w-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                            <span><strong>Trigger:</strong> {email.trigger}</span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                            <span><strong>Recipient:</strong> {email.recipient}</span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Boxes className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />
                            <span><strong>Function:</strong> <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{email.edgeFunction}</code></span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">{email.purpose}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Payment & Resolution */}
              <AccordionItem value="payment" className="border rounded-lg px-4">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="font-semibold">Payment & Resolution</span>
                    <Badge variant="secondary" className="ml-2">
                      {EMAIL_CATALOGUE.filter(e => e.category === 'payment').length} emails
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 pt-4">
                    {EMAIL_CATALOGUE.filter(e => e.category === 'payment').map((email, idx) => (
                      <Card key={idx} className="p-4 hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-lg">{email.name}</h3>
                          <Badge variant={email.status === 'implemented' ? 'default' : 'secondary'}>
                            {email.status === 'implemented' ? '✅ Live' : '🚧 Pending'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <Code className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <code className="text-xs bg-muted px-2 py-1 rounded">{email.templateFile}</code>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Zap className="h-4 w-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                            <span><strong>Trigger:</strong> {email.trigger}</span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                            <span><strong>Recipient:</strong> {email.recipient}</span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Boxes className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />
                            <span><strong>Function:</strong> <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{email.edgeFunction}</code></span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">{email.purpose}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Disputes */}
              <AccordionItem value="disputes" className="border rounded-lg px-4">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold">Disputes</span>
                    <Badge variant="secondary" className="ml-2">
                      {EMAIL_CATALOGUE.filter(e => e.category === 'disputes').length} emails
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 pt-4">
                    {EMAIL_CATALOGUE.filter(e => e.category === 'disputes').map((email, idx) => (
                      <Card key={idx} className="p-4 hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-lg">{email.name}</h3>
                          <Badge variant={email.status === 'implemented' ? 'default' : 'secondary'}>
                            {email.status === 'implemented' ? '✅ Live' : '🚧 Pending'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <Code className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <code className="text-xs bg-muted px-2 py-1 rounded">{email.templateFile}</code>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Zap className="h-4 w-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                            <span><strong>Trigger:</strong> {email.trigger}</span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                            <span><strong>Recipient:</strong> {email.recipient}</span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Boxes className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />
                            <span><strong>Function:</strong> <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{email.edgeFunction}</code></span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">{email.purpose}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Subscriptions */}
              <AccordionItem value="subscriptions" className="border rounded-lg px-4">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                    <span className="font-semibold">Subscriptions & Billing</span>
                    <Badge variant="secondary" className="ml-2">
                      {EMAIL_CATALOGUE.filter(e => e.category === 'subscriptions').length} emails
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 pt-4">
                    {EMAIL_CATALOGUE.filter(e => e.category === 'subscriptions').map((email, idx) => (
                      <Card key={idx} className="p-4 hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-lg">{email.name}</h3>
                          <Badge variant={email.status === 'implemented' ? 'default' : 'secondary'}>
                            {email.status === 'implemented' ? '✅ Live' : '🚧 Pending'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <Code className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <code className="text-xs bg-muted px-2 py-1 rounded">{email.templateFile}</code>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Zap className="h-4 w-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                            <span><strong>Trigger:</strong> {email.trigger}</span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                            <span><strong>Recipient:</strong> {email.recipient}</span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Boxes className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />
                            <span><strong>Function:</strong> <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{email.edgeFunction}</code></span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">{email.purpose}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Admin System */}
              <AccordionItem value="admin" className="border rounded-lg px-4">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-gray-600" />
                    <span className="font-semibold">Admin System</span>
                    <Badge variant="secondary" className="ml-2">
                      {EMAIL_CATALOGUE.filter(e => e.category === 'admin').length} emails
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 pt-4">
                    {EMAIL_CATALOGUE.filter(e => e.category === 'admin').map((email, idx) => (
                      <Card key={idx} className="p-4 hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-lg">{email.name}</h3>
                          <Badge variant={email.status === 'implemented' ? 'default' : 'secondary'}>
                            {email.status === 'implemented' ? '✅ Live' : '🚧 Pending'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <Code className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <code className="text-xs bg-muted px-2 py-1 rounded">{email.templateFile}</code>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Zap className="h-4 w-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                            <span><strong>Trigger:</strong> {email.trigger}</span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                            <span><strong>Recipient:</strong> {email.recipient}</span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Boxes className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />
                            <span><strong>Function:</strong> <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{email.edgeFunction}</code></span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">{email.purpose}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : (
            /* Gallery View - Finder Style */
            <div className="grid grid-cols-1 lg:grid-cols-[350px,1fr] gap-6 h-[800px]">
              {/* Left Column - Email List */}
              <Card className="p-4 overflow-auto">
                <div className="space-y-1">
                  {EMAIL_CATALOGUE.map((email, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedEmail(email)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        selectedEmail?.templateFile === email.templateFile
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{email.name}</div>
                          <div className="text-xs opacity-70 truncate">{email.category}</div>
                        </div>
                        <Badge
                          variant={email.status === "implemented" ? "default" : "secondary"}
                          className="text-xs shrink-0"
                        >
                          {email.status === "implemented" ? "✅" : "🚧"}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Right Column - Preview Pane */}
              <div className="flex flex-col gap-4 overflow-hidden">
                {/* Preview */}
                <div className="flex-1 overflow-hidden">
                  {selectedEmail ? (
                    <EmailPreview
                      templateFile={selectedEmail.templateFile}
                      emailName={selectedEmail.name}
                      status={selectedEmail.status}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed">
                      <div className="text-center p-8">
                        <Mail className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Select an email to preview</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Metadata Card */}
                {selectedEmail && (
                  <Card className="p-4 shrink-0">
                    <h3 className="font-bold text-lg mb-3">{selectedEmail.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Code className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <code className="text-xs bg-muted px-2 py-1 rounded">{selectedEmail.templateFile}</code>
                      </div>
                      <div className="flex items-start gap-2">
                        <Zap className="h-4 w-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                        <span><strong>Trigger:</strong> {selectedEmail.trigger}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                        <span><strong>Recipient:</strong> {selectedEmail.recipient}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Boxes className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />
                        <span><strong>Function:</strong> <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{selectedEmail.edgeFunction}</code></span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground">{selectedEmail.purpose}</span>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}

            {/* Reference Box */}
            <Card className="mt-6 p-6 bg-muted/50">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Boxes className="h-5 w-5" />
                Edge Functions & Template Locations
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2">Edge Functions:</p>
                  <div className="flex flex-wrap gap-2">
                    <code className="text-xs bg-background px-2 py-1 rounded border">send-email</code>
                    <code className="text-xs bg-background px-2 py-1 rounded border">send-liability-notification</code>
                    <code className="text-xs bg-background px-2 py-1 rounded border">process-liability-claim</code>
                    <code className="text-xs bg-background px-2 py-1 rounded border">leaderboard-stripe-webhooks</code>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-semibold mb-2">Template Files Location:</p>
                  <code className="text-xs bg-background px-2 py-1 rounded border block">
                    📁 supabase/functions/send-email/_templates/
                  </code>
                </div>
              </div>
            </Card>
          </div>

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
                <Icons.AlertTriangle className="h-5 w-5 text-yellow-600" />
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
