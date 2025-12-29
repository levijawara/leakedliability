export interface RouteMetadata {
  path: string;
  component: string;
  name: string;
  icon: string; // lucide icon name as string
  description: string;
  category: 'public' | 'authenticated' | 'leaderboard' | 'admin' | 'system';
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  tabs?: string[];
}

export const ROUTES: RouteMetadata[] = [
  // Public Routes
  { path: "/", component: "Index", name: "Home", icon: "Home", description: "Overview of Leaked Liability; primary CTA to submit reports", category: "public" },
  { path: "/how-it-works", component: "HowItWorks", name: "How It Works", icon: "Info", description: "Full breakdown of reporting → verification → leaderboard", category: "public" },
  { path: "/why-it-works", component: "WhyItWorks", name: "Why It Works", icon: "Lightbulb", description: "Rationale behind LL™", category: "public" },
  { path: "/disclaimer", component: "Disclaimer", name: "Disclaimer", icon: "AlertTriangle", description: "Legal disclaimer", category: "public" },
  { path: "/privacy-policy", component: "PrivacyPolicy", name: "Privacy Policy", icon: "Lock", description: "Privacy policy and data handling", category: "public" },
  { path: "/faq", component: "FAQ", name: "FAQ", icon: "HelpCircle", description: "Frequently asked questions", category: "public" },

  // Auth Routes
  { path: "/auth", component: "Auth", name: "Login / Sign Up", icon: "LogIn", description: "Authentication portal", category: "public" },
  { path: "/reset-password", component: "ResetPassword", name: "Reset Password", icon: "Key", description: "Password reset", category: "public" },
  { path: "/verify-email", component: "VerifyEmail", name: "Verify Email", icon: "Mail", description: "Email verification", category: "public" },

  // Results / Tools
  { path: "/results", component: "Results", name: "Results", icon: "BarChart2", description: "Report verification results", category: "public" },
  { path: "/results/fafo-generator", component: "FAFOGenerator", name: "FAFO Generator", icon: "Zap", description: "Admin testing tool", category: "admin", requiresAuth: true, requiresAdmin: true },

  // Authenticated Routes
  { path: "/profile", component: "Profile", name: "Profile", icon: "User", description: "Profile & settings", category: "authenticated", requiresAuth: true },
  { path: "/submit", component: "SubmitReport", name: "Submit Report", icon: "FileText", description: "Report submission walkthrough", category: "authenticated", requiresAuth: true },
  { path: "/producer-dashboard", component: "ProducerDashboard", name: "Producer Dashboard", icon: "LayoutDashboard", description: "Producer portal", category: "authenticated", requiresAuth: true },
  { path: "/suggestions", component: "SuggestionBox", name: "Suggestion Box", icon: "MessageSquare", description: "Platform feedback", category: "authenticated", requiresAuth: true },
  { path: "/confirm", component: "ConfirmReport", name: "Confirm Report", icon: "FileCheck", description: "Corroborate debts", category: "authenticated", requiresAuth: true },
  { path: "/call-sheets", component: "CallSheetManager", name: "Call Sheets", icon: "FileSpreadsheet", description: "Upload and manage call sheets", category: "authenticated", requiresAuth: true },
  { path: "/crew-contacts", component: "CrewContacts", name: "Crew Contacts", icon: "Users", description: "View and manage extracted crew contacts", category: "authenticated", requiresAuth: true },

  // Leaderboard Routes
  { path: "/leaderboard", component: "Leaderboard", name: "Leaderboard", icon: "TrendingUp", description: "Producer ranking board", category: "leaderboard" },
  { path: "/subscribe", component: "Subscribe", name: "Subscribe", icon: "CreditCard", description: "Subscription tier selection", category: "leaderboard" },
  { path: "/hold-that-l", component: "HoldThatLGenerator", name: "Hold That L Generator", icon: "Star", description: "Shareable debt graphics", category: "leaderboard" },

  // Claim Routes
  { path: "/claim/:producerId", component: "ClaimProducer", name: "Claim Producer", icon: "UserCheck", description: "Verified claim submission", category: "public" },
  { path: "/liability/claim/:token", component: "LiabilityClaim", name: "Liability Claim", icon: "ShieldCheck", description: "Secure liability claim link", category: "public" },

  // Admin Routes
  { path: "/admin", component: "Admin", name: "Admin Dashboard", icon: "Shield", description: "Admin control panel", category: "admin", requiresAuth: true, requiresAdmin: true, tabs: ["Submissions", "Payments Due", "Paid Reports", "Disputes", "Users", "Producers", "Settings"] },
  { path: "/admin/edit-report/:id", component: "AdminEditReport", name: "Edit Report", icon: "FileText", description: "Modify report", category: "admin", requiresAuth: true, requiresAdmin: true },
  { path: "/admin/search-insights", component: "AdminSearchInsights", name: "Search Insights", icon: "Search", description: "Leaderboard analytics", category: "admin", requiresAuth: true, requiresAdmin: true },
  { path: "/admin/analytics/daily-visitors", component: "DailyVisitors", name: "Daily Visitors", icon: "BarChart3", description: "Daily visitor metrics", category: "admin", requiresAuth: true, requiresAdmin: true },
  { path: "/admin/merge-producers", component: "AdminProducerMerge", name: "Merge/Redirect", icon: "Users", description: "Merge duplicates", category: "admin", requiresAuth: true, requiresAdmin: true },
  { path: "/admin-submit-existing", component: "AdminSubmitExisting", name: "Submit for Existing User", icon: "UserPlus", description: "Admin proxy submission (existing user)", category: "admin", requiresAuth: true, requiresAdmin: true },
  { path: "/admin-submit-new", component: "AdminSubmitNew", name: "Submit for New User", icon: "UserPlus", description: "Admin proxy submission (new user)", category: "admin", requiresAuth: true, requiresAdmin: true },
  { path: "/leaderboard-analytics", component: "LeaderboardAnalytics", name: "Leaderboard Analytics", icon: "BarChart3", description: "Leaderboard performance metrics", category: "admin", requiresAuth: true, requiresAdmin: true },
  { path: "/admin/call-sheet-reservoir", component: "AdminCallSheetReservoir", name: "Call Sheet Reservoir", icon: "Archive", description: "Complete call sheet archive", category: "admin", requiresAuth: true, requiresAdmin: true },

  // System Routes
  { path: "/sitemap", component: "Sitemap", name: "Platform Sitemap", icon: "Map", description: "Complete navigation map", category: "system", requiresAuth: true, requiresAdmin: true },
  { path: "/maintenance", component: "Maintenance", name: "Maintenance Mode", icon: "Settings", description: "System maintenance", category: "system" },
  { path: "/ban/:banId", component: "BanPage", name: "Account Banned", icon: "ShieldAlert", description: "Ban notice", category: "system" },
  { path: "/escrow", component: "EscrowHub", name: "Crew Payment Escrow", icon: "DollarSign", description: "Escrow service hub page", category: "public" },
  { path: "/escrow/initiate", component: "EscrowInitiate", name: "Initiate Escrow", icon: "DollarSign", description: "Producer-initiated escrow payment form", category: "public" },
  { path: "/escrow/redeem", component: "EscrowRedeem", name: "Redeem Escrow Code", icon: "CreditCard", description: "Enter escrow payment code", category: "public" },
  { path: "/pay/:code", component: "PayEscrow", name: "Escrow Payment", icon: "DollarSign", description: "Anonymous payment", category: "system" },
  { path: "/pay/:code/success", component: "PayEscrow", name: "Payment Success", icon: "FileCheck", description: "Post-payment confirmation", category: "system" },
  { path: "*", component: "NotFound", name: "404 Not Found", icon: "FileX", description: "Fallback route", category: "system" },
];

export const ROUTE_CATEGORIES = ['public', 'authenticated', 'leaderboard', 'admin', 'system'] as const;
