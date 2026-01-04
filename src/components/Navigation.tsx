import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, TrendingUp, FileText, Info, Instagram, Menu, User, LogOut, Shield, HelpCircle, MessageSquare, DollarSign, FileSpreadsheet, Users, Map } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Navigation() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasBetaAccess, setHasBetaAccess] = useState(false);

  useEffect(() => {
    // Gracefully handle if Supabase is unavailable
    if (!supabase) {
      // Navigation can still render without Supabase - just won't show user menu
      setUser(null);
      setIsAdmin(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        checkBetaAccess(session.user.id);
      }
    }).catch((err) => {
      // Gracefully handle auth errors - navigation still works
      console.debug('[Navigation] Auth session check failed (expected if backend unavailable):', err);
      setUser(null);
      setIsAdmin(false);
      setHasBetaAccess(false);
    });

    let subscription: any;
    try {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkAdminStatus(session.user.id);
          checkBetaAccess(session.user.id);
        } else {
          setIsAdmin(false);
          setHasBetaAccess(false);
        }
      });
      subscription = sub;
    } catch (err) {
      console.debug('[Navigation] Failed to set up auth state listener (expected if backend unavailable):', err);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      // Dynamic import to avoid circular dependency
      const { trackRoleCheckFailure } = await import("@/lib/failureTracking");
      const { shouldLogAdminCheckError, isNormalUserResponse } = await import("@/lib/adminCheckHelpers");
      
      const { data, error } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      
      // Check if this is just a normal user (not an admin) vs an actual error
      if (isNormalUserResponse(data, error)) {
        // User is simply not an admin - this is expected, not an error
        setIsAdmin(false);
        return;
      }

      // If there's an error, check if it's worth logging
      if (error) {
        const shouldLog = shouldLogAdminCheckError(error, data, { userId });
        
        if (shouldLog) {
          // Real error - track and log it
          trackRoleCheckFailure('Navigation.checkAdminStatus', error.message, {
            userId,
            errorCode: error.code
          });
          console.error('[Navigation] has_role error', error);
        } else {
          // Expected "not admin" response - log at debug level only
          if (import.meta.env.DEV) {
            console.debug('[Navigation] User is not admin (expected)');
          }
        }
        setIsAdmin(false);
        return;
      }

      // Success - user is admin
      setIsAdmin(Boolean(data));
    } catch (e: any) {
      // Exceptions are always real errors
      const { trackRoleCheckFailure } = await import("@/lib/failureTracking");
      trackRoleCheckFailure('Navigation.checkAdminStatus', e?.message || 'Unknown exception', {
        errorType: e?.constructor?.name
      });
      console.error('[Navigation] checkAdminStatus exception', e);
      setIsAdmin(false);
    }
  };

  const checkBetaAccess = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('beta_access')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.debug('[Navigation] Beta access check failed:', error);
        setHasBetaAccess(false);
        return;
      }
      
      setHasBetaAccess(data?.beta_access ?? false);
    } catch (e) {
      console.debug('[Navigation] Beta access check exception:', e);
      setHasBetaAccess(false);
    }
  };

  const menuItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Info, label: "How It Works", path: "/how-it-works" },
    { icon: Info, label: "Why It Works", path: "/why-it-works" },
    { icon: TrendingUp, label: "Leaderboard", path: "/leaderboard" },
    { icon: FileText, label: "Submission Forms", path: "/submit" },
    { icon: HelpCircle, label: "FAQ", path: "/faq" },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <>
      {/* Desktop Navigation - Fixed */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-50 border-b bg-card/95 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center">
            <div className="flex w-full items-center justify-evenly px-4 gap-2">
            <ThemeToggle />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            
            <Button
              onClick={() => navigate("/results")}
              size="sm"
              className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold"
            >
              RESULTS
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-4 w-4 mr-2" />
                  Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => navigate("/how-it-works")}>
                  <Info className="h-4 w-4 mr-2" />
                  How It Works
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/why-it-works")}>
                  <Info className="h-4 w-4 mr-2" />
                  Why It Works
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/faq")}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  FAQ
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href="https://www.instagram.com/leakedliability/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Instagram className="h-4 w-4" />
                    @LeakedLiability
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/suggestions")}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  CONTACT US
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/leaderboard")}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Leaderboard
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/submit")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Submission Forms
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/escrow")}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Escrow
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Account
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  {(hasBetaAccess || isAdmin) && (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/call-sheets")}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Call Sheets
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/crew-contacts")}>
                        <Users className="h-4 w-4 mr-2" />
                        Crew Contacts
                      </DropdownMenuItem>
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/admin")}>
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/leaderboard-analytics")}>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/sitemap")}>
                        <Map className="h-4 w-4 mr-2" />
                        Site Map
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/auth")}
              >
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Inline */}
      <nav className="md:hidden border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-3 items-center w-full">
            {/* Left: Theme Toggle */}
            <div className="flex items-center justify-start">
              <ThemeToggle />
            </div>
            
            {/* Center: RESULTS Button */}
            <div className="flex items-center justify-center">
              <Button
                onClick={() => navigate("/results")}
                size="sm"
                className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-xs px-3"
              >
                RESULTS
              </Button>
            </div>
            
            {/* Right: User & Menu */}
            <div className="flex items-center justify-end gap-2">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="flex items-center gap-2">
                      {user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleNavigate("/profile")}>
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    {(hasBetaAccess || isAdmin) && (
                      <>
                        <DropdownMenuItem onClick={() => handleNavigate("/call-sheets")}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Call Sheets
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleNavigate("/crew-contacts")}>
                          <Users className="h-4 w-4 mr-2" />
                          Crew Contacts
                        </DropdownMenuItem>
                      </>
                    )}
                    {isAdmin && (
                      <>
                        <DropdownMenuItem onClick={() => handleNavigate("/admin")}>
                          <Shield className="h-4 w-4 mr-2" />
                          Admin Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleNavigate("/sitemap")}>
                          <Map className="h-4 w-4 mr-2" />
                          Site Map
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/auth")}
                >
                  <User className="h-5 w-5" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => handleNavigate("/")}>
                    <Home className="h-4 w-4 mr-2" />
                    Home
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigate("/how-it-works")}>
                    <Info className="h-4 w-4 mr-2" />
                    How It Works
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigate("/why-it-works")}>
                    <Info className="h-4 w-4 mr-2" />
                    Why It Works
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigate("/leaderboard")}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Leaderboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigate("/submit")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Submission Forms
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigate("/escrow")}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Escrow
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigate("/faq")}>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    FAQ
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href="https://www.instagram.com/leakedliability/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2 py-1.5"
                    >
                      <Instagram className="h-4 w-4" />
                      <span>@LeakedLiability</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleNavigate("/suggestions")}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    CONTACT US
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
