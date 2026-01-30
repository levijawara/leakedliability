import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, LogOut, FileSpreadsheet, Users } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const PORTAL_BASE = "/extra-credit";

export function PortalNavigation() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ email?: string } | null>(null);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    }).catch(() => setUser(null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate(`${PORTAL_BASE}/auth`);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-card/95 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => navigate(`${PORTAL_BASE}/call-sheets`)}
              className="text-2xl font-black tracking-tight text-foreground hover:opacity-80 transition-opacity"
            >
              Extra Credit
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`${PORTAL_BASE}/call-sheets`)}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Call Sheets
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`${PORTAL_BASE}/crew-contacts`)}
              >
                <Users className="h-4 w-4 mr-2" />
                Crew Contacts
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
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
                  <DropdownMenuItem onClick={() => navigate(`${PORTAL_BASE}/call-sheets`)}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Call Sheets
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`${PORTAL_BASE}/crew-contacts`)}>
                    <Users className="h-4 w-4 mr-2" />
                    Crew Contacts
                  </DropdownMenuItem>
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
                onClick={() => navigate(`${PORTAL_BASE}/auth`)}
              >
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
