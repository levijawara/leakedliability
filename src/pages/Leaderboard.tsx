import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Instagram } from "lucide-react";
import { format } from "date-fns";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useState, useEffect, useRef } from "react";
import { useLeaderboardAccess } from "@/hooks/useLeaderboardAccess";
import { LeaderboardPaywall } from "@/components/LeaderboardPaywall";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const getDaysColor = (days: number | null) => {
  if (!days || days < 0) return "bg-background text-foreground";
  if (days >= 365) return "bg-status-nuclear text-status-nuclear-text font-bold";
  if (days >= 90) return "bg-status-critical text-white";
  if (days >= 30) return "bg-status-danger text-white";
  if (days >= 15) return "bg-status-warning text-black";
  return "bg-status-excellent text-white";
};

interface AdminEditableCellProps {
  value: string | number | null;
  onSave: (newValue: string | number | null) => Promise<void>;
  className?: string;
  isAdmin: boolean;
  viewMode: 'admin' | 'public';
  type?: 'text' | 'number' | 'date';
  isMoney?: boolean;
}

function AdminEditableCell({ 
  value, 
  onSave, 
  className = "", 
  isAdmin,
  viewMode,
  type = 'text',
  isMoney = false
}: AdminEditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value?.toString() || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setEditing(false);
    
    let finalValue: string | number | null = tempValue;
    
    if (type === 'number') {
      finalValue = tempValue ? Number(tempValue) : null;
    } else if (type === 'date') {
      finalValue = tempValue || null;
    }
    
    try {
      await onSave(finalValue);
    } catch (error) {
      console.error('Failed to save:', error);
      setTempValue(value?.toString() || "");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin || viewMode === 'public') {
    // Always render money in green, regardless of view mode
    if (isMoney) {
      const numValue = typeof value === 'string'
        ? parseFloat(value)
        : value;

      if (!numValue || numValue === 0) {
        return (
          <TableCell className={className}>
            <span className="text-green-500 font-semibold">$0</span>
          </TableCell>
        );
      }

      return (
        <TableCell className={className}>
          <span className="text-green-500 font-semibold">
            ${numValue.toLocaleString()}
          </span>
        </TableCell>
      );
    }

    return (
      <TableCell className={className}>
        {type === 'number' ? (value ?? 0) : (value || '—')}
      </TableCell>
    );
  }

  return (
    <TableCell
      className={`${className} ${isAdmin ? 'cursor-pointer hover:bg-muted/30' : ''}`}
      onClick={() => !editing && setEditing(true)}
    >
      {editing ? (
        <input
          type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
          className="w-full bg-background/80 border border-primary/30 rounded px-2 py-1 text-center"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setTempValue(value?.toString() || "");
              setEditing(false);
            }
          }}
          autoFocus
          disabled={saving}
        />
      ) : (
        <span className={saving ? 'opacity-50' : ''}>
          {value || '—'}
        </span>
      )}
    </TableCell>
  );
}

export default function Leaderboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [managingBilling, setManagingBilling] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'admin' | 'public'>('admin');
  const searchLogTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Only check subscription if NOT admin
  const { accessState, loading: accessLoading, refreshAccess } = useLeaderboardAccess(!checkingAdmin && !isAdmin);

  const { data: producers, isLoading, refetch: refetchProducers } = useQuery({
    queryKey: ["public_leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_leaderboard")
        .select("*");
      
      if (error) throw error;
      return data;
    },
  });

  const updateProducer = async (
    producerId: string, 
    updates: Partial<{
      name: string;
      pscs_score: number;
      total_amount_owed: number;
      oldest_debt_date: string | null;
      total_crew_owed: number;
      total_vendors_owed: number;
      total_jobs_owed: number;
      total_cities_owed: number;
    }>
  ) => {
    const { error } = await supabase
      .from('producers')
      .update(updates)
      .eq('id', producerId);

    if (error) {
      console.error('Update failed:', error);
      throw error;
    }

    await refetchProducers();
  };

  // Fetch site settings for blur toggle and public readiness flag
  const { data: settings } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("public_leaderboard_ready")
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Check admin status FIRST
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase.rpc('has_role', {
            _user_id: user.id,
            _role: 'admin'
          });
          if (!error) {
            setIsAdmin(!!data);
          }
        }
      } finally {
        setCheckingAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  // Log search terms with debouncing and send admin notification
  useEffect(() => {
    if (searchLogTimeoutRef.current) {
      clearTimeout(searchLogTimeoutRef.current);
    }
    
    if (searchTerm.trim().length >= 2) {
      searchLogTimeoutRef.current = setTimeout(async () => {
        try {
          // Get current user info
          const { data: { user } } = await supabase.auth.getUser();
          const userEmail = user?.email || null;
          const userId = user?.id || null;
          
          // Find matched producer
          const matchedProducer = producers?.find((p) => {
            const search = searchTerm.toLowerCase();
            const name = (p.producer_name || "").toLowerCase();
            const company = (p.company_name || "").toLowerCase();
            return name.includes(search) || company.includes(search);
          });
          
          // Log search asynchronously with user info
          await supabase.from('search_logs').insert({
            searched_name: searchTerm.trim(),
            matched_producer_id: matchedProducer?.producer_id || null,
            source: 'leaderboard',
            user_ip: null,
            user_id: userId,
            user_email: userEmail
          });
          
          // Send admin notification (skip for admin accounts)
          const ADMIN_EMAILS = ['leakedliability@gmail.com', 'lojawara@gmail.com'];
          if (!userEmail || !ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
            await supabase.functions.invoke('send-email', {
              body: {
                type: 'admin_notification',
                to: 'leakedliability@gmail.com',
                data: {
                  eventType: 'search',
                  searchTerm: searchTerm.trim(),
                  source: 'leaderboard',
                  userEmail: userEmail || null,
                  timestamp: new Date().toISOString(),
                  adminDashboardUrl: 'https://leakedliability.com/admin',
                },
              },
            });
          }
        } catch (error) {
          // Fail silently - don't disrupt user experience
          console.debug('Search logging failed:', error);
        }
      }, 1500); // Log after 1.5 seconds of inactivity
    }
    
    return () => {
      if (searchLogTimeoutRef.current) {
        clearTimeout(searchLogTimeoutRef.current);
      }
    };
  }, [searchTerm, producers]);

  const handleManageBilling = async () => {
    try {
      setManagingBilling(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('leaderboard-customer-portal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
    } finally {
      setManagingBilling(false);
    }
  };

  // 1. CHECKING ADMIN STATUS - show spinner
  if (checkingAdmin) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto px-4 py-20">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Verifying access...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // 2. ADMIN BYPASS - grant full access immediately
  if (isAdmin) {
    // Admin gets full access - skip to leaderboard render below
  } else {
    // 3. NON-ADMIN - check subscription
    if (accessLoading || !accessState) {
      return (
        <>
          <Navigation />
          <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
            <div className="container mx-auto px-4 py-20">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Verifying subscription...</p>
              </div>
            </div>
          </div>
          <Footer />
        </>
      );
    }

    // 4. NO ACCESS - show paywall
    if (!accessState.hasAccess) {
      return <LeaderboardPaywall accessState={accessState} onAccessGranted={refreshAccess} refreshAccess={refreshAccess} />;
    }
  }

  // 5. HAS ACCESS (admin or subscribed) - show full leaderboard

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-12 text-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">
            Leaked Liability™
          </h1>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <p className="text-xl md:text-2xl font-bold text-muted-foreground">
              Producer Debt Leaderboard
            </p>
            <span className="text-muted-foreground">|</span>
            <a 
              href="https://www.instagram.com/leakedliability/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-bold hover:opacity-80 transition-opacity flex items-center gap-2 text-muted-foreground"
            >
              @LeakedLiability
              <Instagram className="h-4 w-4" />
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            Last Updated: {format(new Date(), "MM/dd/yy")}
          </p>
          
          {/* Access Status Badge */}
          {accessState && (
            <div className="flex justify-center gap-3 flex-wrap">
              {accessState.reason === 'admin' && (
                <Badge variant="default" className="text-lg px-4 py-2">Admin Access</Badge>
              )}
              {accessState.reason === 'subscription_active' && (
                <>
                  <Badge variant="default" className="text-lg px-4 py-2">Subscribed</Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleManageBilling}
                    disabled={managingBilling}
                  >
                    {managingBilling ? "Loading..." : "Manage Billing"}
                  </Button>
                </>
              )}
              {accessState.reason === 'admin_override' && (
                <Badge variant="default" className="text-lg px-4 py-2">Special Access</Badge>
              )}
            </div>
          )}
        </div>

        {/* Alert Banner */}
        <Card className="mb-8 p-6 border-l-4 border-status-critical bg-status-critical/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-status-critical mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-lg mb-2">Public Accountability Notice</h3>
              <p className="text-sm text-muted-foreground">
                This leaderboard tracks producers who owe payments to freelance crew members and vendors. 
                All data is verified through our review process. Scores update daily and include 
                time-based forgiveness after debts are closed.
              </p>
            </div>
          </div>
        </Card>

        {/* Legend */}
        <Card className="mb-8 p-6">
          <h3 className="font-bold text-lg mb-4">Days-Since-Wrap color coding:</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-status-excellent" />
              <span className="text-sm text-status-excellent font-semibold">0-14 days</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-status-warning" />
              <span className="text-sm text-status-warning font-semibold">15-29 days</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-status-danger" />
              <span className="text-sm text-status-danger font-semibold">30-89 days</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-status-critical" />
              <span className="text-sm text-status-critical font-semibold">90-364 days</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-status-nuclear border border-status-nuclear-text" />
              <span className="text-sm bg-status-nuclear text-status-nuclear-text px-2 py-1 rounded font-bold">365+ days</span>
            </div>
          </div>
        </Card>

        {/* PSCS Formula */}
        <Card className="mb-8 p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-2">
            <h3 className="font-black text-lg mb-2 text-center">PSCS™ CREDIT SCORE MODEL</h3>
            <p className="text-xs text-muted-foreground text-center mb-4">
              How producer scores decrease (and recover) over time
            </p>
          <div className="space-y-4">
            <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg border-2 border-primary/20 shadow-lg">
              <h4 className="font-bold text-sm mb-3 text-center">Active Debt Penalty</h4>
              <div className="text-xs text-muted-foreground space-y-2">
                <div className="font-mono text-center">
                  PSCS = 1000 - (Age Penalty + Amount Penalty + Repeat Penalty)
                </div>
                <div className="grid md:grid-cols-3 gap-3 mt-3">
                  <div className="bg-background/50 p-2 rounded text-center">
                    <div className="font-bold text-foreground text-xs">Age (no cap)</div>
                    <div className="text-[10px]">0-60d: -1/day</div>
                    <div className="text-[10px]">60+: -60 + -2/day</div>
                  </div>
                  <div className="bg-background/50 p-2 rounded text-center">
                    <div className="font-bold text-foreground text-xs">Amount (max -300)</div>
                    <div className="text-[10px]">-0.06 per dollar</div>
                    <div className="text-[10px]">Cap at $5,000</div>
                  </div>
                  <div className="bg-background/50 p-2 rounded text-center">
                    <div className="font-bold text-foreground text-xs">Repeat (no cap)</div>
                    <div className="text-[10px]">-10/crew, -20/vendor</div>
                    <div className="text-[10px]">-10/job, -5/city</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg border-2 border-primary/20 shadow-lg">
              <h4 className="font-bold text-sm mb-3 text-center">Credit Recovery (When All Debts Paid)</h4>
              <div className="text-xs text-muted-foreground space-y-2">
                <div className="font-mono text-center text-[10px]">
                  recovery = 1000 × forgiveness_factor
                </div>
                <div className="font-mono text-center text-[10px]">
                  forgiveness_factor = MIN(days_clean / 30, 1)
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                  <div className="bg-background/50 p-2 rounded">
                    <div className="font-bold text-foreground">0d</div>
                    <div className="text-[10px]">0%</div>
                  </div>
                  <div className="bg-background/50 p-2 rounded">
                    <div className="font-bold text-foreground">15d</div>
                    <div className="text-[10px]">50%</div>
                  </div>
                  <div className="bg-background/50 p-2 rounded">
                    <div className="font-bold text-foreground">30d</div>
                    <div className="text-[10px]">100%</div>
                  </div>
                  <div className="bg-background/50 p-2 rounded">
                    <div className="font-bold text-foreground">30d+</div>
                    <div className="text-[10px]">100%</div>
                  </div>
                </div>
                <div className="text-[10px] text-center italic mt-2">
                  After 30 clean days, all history penalties reset to zero
                </div>
              </div>
            </div>

            {/* Master Equation Card */}
            <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg border-2 border-primary/20 shadow-lg">
              <h4 className="font-bold text-sm mb-3 text-center">Final Score Calculation</h4>
              <div className="text-xs text-muted-foreground space-y-2">
                <div className="font-mono text-center text-sm font-bold">
                  PSCS = 1000 – (Age + Amount + Repeat)
                </div>
                <div className="text-center text-[10px] mt-2">
                  <div>Upper cap: 1000</div>
                  <div className="text-red-700 font-semibold">No lower bound — scores can go negative</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Producer Search Filter + View Toggle */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by producer name or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Admin View Toggle - Only visible to admins */}
          {isAdmin && (
            <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg">
              <Label htmlFor="view-mode" className="text-sm font-semibold cursor-pointer whitespace-nowrap">
                {viewMode === 'admin' ? 'Admin View' : 'Public View'}
              </Label>
              <Switch
                id="view-mode"
                checked={viewMode === 'admin'}
                onCheckedChange={(checked) => setViewMode(checked ? 'admin' : 'public')}
              />
            </div>
          )}
        </div>

        {/* Leaderboard Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-primary-foreground font-black text-sm">
                    NAME
                  </TableHead>
                  <TableHead className="text-primary-foreground font-black text-sm text-center min-w-[120px]">
                    *PSCS*
                    <br />
                    <span className="text-xs font-normal">(Unknown – 1,000)</span>
                  </TableHead>
                  <TableHead className="text-primary-foreground font-black text-sm text-center">
                    TOTAL <span className="text-status-excellent">$$$</span>
                    <br />
                    OWED
                  </TableHead>
                  <TableHead className="text-primary-foreground font-black text-sm text-center">
                    OLDEST
                    <br />
                    DEBT
                  </TableHead>
                  <TableHead className="text-primary-foreground font-black text-sm text-center min-w-[140px]">
                    OLDEST DEBT
                    <br />
                    DAY-COUNTER
                  </TableHead>
                  <TableHead className="text-primary-foreground font-black text-sm text-center">
                    TOTAL # of
                    <br />
                    CREW OWED
                  </TableHead>
                  <TableHead className="text-primary-foreground font-black text-sm text-center">
                    TOTAL # of
                    <br />
                    VENDORS OWED
                  </TableHead>
                  <TableHead className="text-primary-foreground font-black text-sm text-center">
                    TOTAL # of
                    <br />
                    JOBS OWED
                  </TableHead>
                  <TableHead className="text-primary-foreground font-black text-sm text-center">
                    TOTAL # of
                    <br />
                    CITIES OWED
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      Loading producers...
                    </TableCell>
                  </TableRow>
                ) : (() => {
                  // Filter producers based on search term
                  const filteredProducers = producers?.filter((producer) => {
                    if (!searchTerm.trim()) return true; // Show all if no search
                    
                    const search = searchTerm.trim().toLowerCase();
                    const name = (producer.producer_name || "").toLowerCase();
                    const company = (producer.company_name || "").toLowerCase();
                    
                    return name === search || company === search;
                  }) || [];
                  
                  return filteredProducers.length > 0 ? (
                    filteredProducers.map((producer) => (
                    <TableRow 
                      key={producer.producer_id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                    {isAdmin && viewMode === "admin" ? (
                      <TableCell className="font-semibold">
                        <div
                          className="cursor-pointer hover:bg-muted/30 rounded px-2 py-1"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const newName = prompt('Edit Producer Name:', producer.producer_name || '');
                            if (newName && newName !== producer.producer_name) {
                              await updateProducer(producer.producer_id, { name: newName });
                            }
                          }}
                        >
                          <div>{producer.producer_name || '—'}</div>
                          {producer.sub_name && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {producer.sub_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    ) : (
                      <TableCell className="font-semibold">
                        <div>
                          <div>{producer.producer_name || '—'}</div>
                          {producer.sub_name && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {producer.sub_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      {isAdmin && viewMode === "admin" ? (
                        <AdminEditableCell
                          value={Number(producer.pscs_score || 0).toFixed(2)}
                          onSave={(v) => updateProducer(producer.producer_id, { pscs_score: Number(v) })}
                          className="text-center"
                          isAdmin={isAdmin}
                          viewMode={viewMode}
                          type="number"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn(
                            "font-mono text-sm",
                            producer.pscs_score >= 800 && "text-green-500",                    // 800-1000: Excellent
                            producer.pscs_score >= 650 && producer.pscs_score < 800 && "text-green-300",  // 650-799: Good
                            producer.pscs_score >= 500 && producer.pscs_score < 650 && "text-yellow-300", // 500-649: Watchlist
                            producer.pscs_score >= 300 && producer.pscs_score < 500 && "text-orange-400", // 300-499: High risk
                            producer.pscs_score >= 0 && producer.pscs_score < 300 && "text-red-500",      // 0-299: Severe risk
                            producer.pscs_score < 0 && "text-red-700 font-semibold"            // <0: Critical
                          )}>
                            {Number(producer.pscs_score || 0).toFixed(2)}
                          </span>
                          
                          {producer.total_amount_owed === 0 && producer.pscs_score < 1000 && (
                            <span className="text-xs text-gray-400 italic">
                              recovering
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <AdminEditableCell
                      value={producer.total_amount_owed || 0}
                      onSave={(v) => updateProducer(producer.producer_id, { total_amount_owed: Number(v) })}
                      className="text-center font-semibold"
                      isAdmin={isAdmin}
                      viewMode={viewMode}
                      type="number"
                      isMoney={true}
                    />
                    <AdminEditableCell
                      value={producer.oldest_debt_date ? format(new Date(producer.oldest_debt_date), 'MM/dd/yyyy') : null}
                      onSave={(v) => updateProducer(producer.producer_id, { oldest_debt_date: v as string | null })}
                      className="text-center"
                      isAdmin={isAdmin}
                      viewMode={viewMode}
                      type="date"
                    />
                      <TableCell className="text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded font-bold text-lg ${getDaysColor(
                            producer.oldest_debt_days
                          )}`}
                        >
                          {producer.oldest_debt_days || 0}
                        </span>
                      </TableCell>
                    <AdminEditableCell
                      value={producer.total_crew_owed || 0}
                      onSave={(v) => updateProducer(producer.producer_id, { total_crew_owed: Number(v) })}
                      className="text-center text-lg"
                      isAdmin={isAdmin}
                      viewMode={viewMode}
                      type="number"
                    />
                    <AdminEditableCell
                      value={producer.total_vendors_owed || 0}
                      onSave={(v) => updateProducer(producer.producer_id, { total_vendors_owed: Number(v) })}
                      className="text-center text-lg"
                      isAdmin={isAdmin}
                      viewMode={viewMode}
                      type="number"
                    />
                    <AdminEditableCell
                      value={producer.total_jobs_owed || 0}
                      onSave={(v) => updateProducer(producer.producer_id, { total_jobs_owed: Number(v) })}
                      className="text-center text-lg"
                      isAdmin={isAdmin}
                      viewMode={viewMode}
                      type="number"
                    />
                    <AdminEditableCell
                      value={producer.total_cities_owed || 0}
                      onSave={(v) => updateProducer(producer.producer_id, { total_cities_owed: Number(v) })}
                      className="text-center text-lg"
                      isAdmin={isAdmin}
                      viewMode={viewMode}
                      type="number"
                    />
                    </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        {searchTerm 
                          ? `No exact match found for "${searchTerm}". Try the full name as shown on the leaderboard.`
                          : "No producers on the leaderboard yet."}
                      </TableCell>
                    </TableRow>
                  );
                })()}
              </TableBody>
            </Table>
          </div>
        </Card>

        </div>
      </div>
      
      <Footer />
    </>
  );
}
