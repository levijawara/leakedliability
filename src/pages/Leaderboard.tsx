import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Instagram, ChevronDown, ChevronUp } from "lucide-react";
import { formatPacific, nowPacific } from "@/lib/dateUtils";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ProjectTimelineJsonUploader } from "@/components/admin/ProjectTimelineJsonUploader";

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

type LeaderboardSide = "active" | "liabilities";

export default function Leaderboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [managingBilling, setManagingBilling] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'admin' | 'public'>('admin');
  const [leaderboardSide, setLeaderboardSide] = useState<LeaderboardSide>("active"); // Front side = default
  const searchLogTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [expandedPenalty, setExpandedPenalty] = useState<'age' | 'amount' | 'repeat' | null>(null);
  
  // Only check subscription if NOT admin
  const { accessState, loading: accessLoading, refreshAccess } = useLeaderboardAccess(!checkingAdmin && !isAdmin);

  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [isAccessBlocked, setIsAccessBlocked] = useState(false);

  const { data: activeProductions, isLoading: isLoadingActive, refetch: refetchActive, error: activeError } = useQuery({
    queryKey: ["production_instances"],
    queryFn: async () => {
      if (!supabase) throw new Error("Database connection unavailable");
      const { data, error } = await supabase
        .from("production_instances")
        .select("id, production_name, company_name, primary_contacts, shoot_start_date, extracted_date, verification_status, crew_size")
        .order("shoot_start_date", { ascending: true, nullsFirst: true });
      if (error) throw error;
      return data ?? [];
    },
    retry: false,
  });

  const { data: producers, isLoading: isLoadingLiabilities, refetch: refetchProducers, error: queryError } = useQuery({
    queryKey: ["public_leaderboard"],
    queryFn: async () => {
      if (!supabase) {
        throw new Error("Database connection unavailable");
      }

      const { data, error } = await supabase
        .from("public_leaderboard")
        .select("*");
      
      if (error) {
        const errorMsg = error.message?.toLowerCase() || '';
        const errorCode = error.code || '';
        
        // Check if table/view doesn't exist
        const isTableMissing = 
          errorCode === '42P01' || // PostgreSQL: relation does not exist
          errorCode === 'PGRST204' || // PostgREST: relation not found
          errorMsg.includes('does not exist') ||
          (errorMsg.includes('relation') && errorMsg.includes('not found'));
        
        if (isTableMissing) {
          setIsAccessBlocked(false);
          setLeaderboardError("Leaderboard data is currently unavailable. Please check back later.");
          throw new Error("Leaderboard view does not exist - migrations may not have been run");
        } else if (errorMsg.includes('row-level security') || errorMsg.includes('permission denied')) {
          setIsAccessBlocked(true);
          setLeaderboardError("Access to leaderboard data is restricted. A subscription may be required to view producer information.");
        } else {
          setIsAccessBlocked(false);
          setLeaderboardError("Unable to load leaderboard. Please try again later.");
        }
        throw error;
      }
      
      setLeaderboardError(null);
      setIsAccessBlocked(false);
      return data;
    },
    retry: false, // Don't retry on error - show message immediately
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

  // Fetch leaderboard config for delinquent-only toggle
  const { data: leaderboardConfig, refetch: refetchConfig } = useQuery({
    queryKey: ["leaderboard_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaderboard_config")
        .select("show_delinquent_only")
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const showDelinquentOnly = leaderboardConfig?.show_delinquent_only ?? false;

  const toggleDelinquentOnly = async () => {
    const newValue = !showDelinquentOnly;
    const { error } = await supabase
      .from("leaderboard_config")
      .update({ show_delinquent_only: newValue })
      .eq("id", (await supabase.from("leaderboard_config").select("id").single()).data?.id ?? "");
    
    if (error) {
      console.error("Failed to update delinquent toggle:", error);
      return;
    }
    refetchConfig();
  };

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
    
    if (searchTerm.trim().length >= 2 && !isAdmin) {
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
          
          // Send admin notification
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
  }, [searchTerm, producers, isAdmin]);

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
              {leaderboardSide === "active" ? "Project Timeline" : "Producer Debt Leaderboard"}
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
            Last Updated: {formatPacific(nowPacific(), "MM/dd/yy")}
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

        {/* LL 2.0 Leaderboard Toggle + Admin JSON upload */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
          {isAdmin && (
            <ProjectTimelineJsonUploader variant="compact" onSuccess={() => refetchActive()} />
          )}
          <div className="inline-flex rounded-lg border-2 border-primary/30 bg-card p-1">
            <button
              type="button"
              onClick={() => setLeaderboardSide("active")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-semibold transition-colors",
                leaderboardSide === "active"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Project Timeline
            </button>
            <button
              type="button"
              onClick={() => setLeaderboardSide("liabilities")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-semibold transition-colors",
                leaderboardSide === "liabilities"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Verified Liabilities
            </button>
          </div>
        </div>

        {/* Alert Banner - Liabilities only */}
        {leaderboardSide === "liabilities" && (
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
        )}

        {/* Project Timeline notice - gentle, no accusations */}
        {leaderboardSide === "active" && (
          <Card className="mb-8 p-6 border-l-4 border-primary/50 bg-primary/5">
            <p className="text-sm text-muted-foreground">
              Productions tracked from call sheet uploads. Producers are expected to pay crew directly.
            </p>
          </Card>
        )}

        {/* Legend - Liabilities only */}
        {leaderboardSide === "liabilities" && (
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
        )}

        {/* PSCS Formula - Redesigned - Liabilities only */}
        {leaderboardSide === "liabilities" && (
        <Card className="mb-8 p-4 md:p-5 bg-gradient-to-br from-primary/5 to-accent/5 border-2 max-w-5xl mx-auto">
          {/* Tier 1: Title, Subtitle, Formula Banner */}
          <div className="mb-4">
            <h3 className="font-black text-lg mb-1 text-center">PSCS™ CREDIT SCORE MODEL</h3>
            <p className="text-xs text-muted-foreground text-center mb-3">
              How producer scores decrease (and recover) over time
            </p>
            {/* Formula Ribbon Bar */}
            <div className="bg-background/60 backdrop-blur-sm border-2 border-primary/30 rounded px-4 py-2.5 space-y-1.5">
              <div className="font-mono text-xs text-center font-semibold">
                PSCS = 1000 − (Age Penalty + Amount Penalty + Repeat Penalty)
              </div>
              <div className="font-mono text-[10px] text-center text-muted-foreground">
                Recovery = 1000 × MIN(days_clean / 30, 1)
              </div>
            </div>
          </div>

          {/* Tier 2: Two Columns (Desktop) / Stacked (Mobile) */}
          <div className="grid md:grid-cols-2 gap-3 md:gap-4 mb-4">
            {/* Left: Active Debt Penalty */}
            <div className="bg-card/80 backdrop-blur-sm p-3.5 rounded-lg border-2 border-primary/20">
              <h4 className="font-bold text-sm mb-2.5 text-center">Active Debt Penalty</h4>
              <div className="grid grid-cols-3 gap-2">
                {/* Age Penalty - Yellow */}
                <button
                  onClick={() => setExpandedPenalty(expandedPenalty === 'age' ? null : 'age')}
                  className="bg-yellow-500/20 border-2 border-yellow-500/40 p-2 rounded text-center hover:bg-yellow-500/30 transition-colors cursor-pointer"
                >
                  <div className="font-bold text-foreground text-[10px] mb-1">Age</div>
                  <div className="text-[9px] text-muted-foreground">(no cap)</div>
                  {expandedPenalty === 'age' ? (
                    <ChevronUp className="h-3 w-3 mx-auto mt-1" />
                  ) : (
                    <ChevronDown className="h-3 w-3 mx-auto mt-1" />
                  )}
                  {expandedPenalty === 'age' && (
                    <div className="mt-2 pt-2 border-t border-yellow-500/30 text-[9px] space-y-0.5">
                      <div>0-60d: -1/day</div>
                      <div>60+: -60 + -2/day</div>
                    </div>
                  )}
                </button>
                
                {/* Amount Penalty - Red */}
                <button
                  onClick={() => setExpandedPenalty(expandedPenalty === 'amount' ? null : 'amount')}
                  className="bg-red-500/20 border-2 border-red-500/40 p-2 rounded text-center hover:bg-red-500/30 transition-colors cursor-pointer"
                >
                  <div className="font-bold text-foreground text-[10px] mb-1">Amount</div>
                  <div className="text-[9px] text-muted-foreground">(max -300)</div>
                  {expandedPenalty === 'amount' ? (
                    <ChevronUp className="h-3 w-3 mx-auto mt-1" />
                  ) : (
                    <ChevronDown className="h-3 w-3 mx-auto mt-1" />
                  )}
                  {expandedPenalty === 'amount' && (
                    <div className="mt-2 pt-2 border-t border-red-500/30 text-[9px] space-y-0.5">
                      <div>-0.06 per dollar</div>
                      <div>Cap at $5,000</div>
                    </div>
                  )}
                </button>
                
                {/* Repeat Penalty - Orange */}
                <button
                  onClick={() => setExpandedPenalty(expandedPenalty === 'repeat' ? null : 'repeat')}
                  className="bg-orange-500/20 border-2 border-orange-500/40 p-2 rounded text-center hover:bg-orange-500/30 transition-colors cursor-pointer"
                >
                  <div className="font-bold text-foreground text-[10px] mb-1">Repeat</div>
                  <div className="text-[9px] text-muted-foreground">(no cap)</div>
                  {expandedPenalty === 'repeat' ? (
                    <ChevronUp className="h-3 w-3 mx-auto mt-1" />
                  ) : (
                    <ChevronDown className="h-3 w-3 mx-auto mt-1" />
                  )}
                  {expandedPenalty === 'repeat' && (
                    <div className="mt-2 pt-2 border-t border-orange-500/30 text-[9px] space-y-0.5">
                      <div>-10/crew, -20/vendor</div>
                      <div>-10/job, -5/city</div>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Credit Recovery - Green */}
            <div className="bg-card/80 backdrop-blur-sm p-3.5 rounded-lg border-2 border-primary/20">
              <h4 className="font-bold text-sm mb-2.5 text-center">Credit Recovery</h4>
              <div className="text-[10px] text-muted-foreground text-center mb-2 italic">
                When all debts paid
              </div>
              
              {/* Progress Bar Timeline */}
              <div className="space-y-2">
                <div className="relative h-8 bg-background/50 rounded-full border-2 border-green-500/30 overflow-hidden">
                  {/* Progress segments */}
                  <div className="absolute inset-0 flex">
                    <div className="flex-1 bg-gradient-to-r from-green-900/20 to-green-700/30 border-r border-green-500/20"></div>
                    <div className="flex-1 bg-gradient-to-r from-green-700/30 to-green-500/40 border-r border-green-500/30"></div>
                    <div className="flex-1 bg-gradient-to-r from-green-500/40 to-green-400/50 border-r border-green-500/40"></div>
                    <div className="flex-1 bg-green-400/50"></div>
                  </div>
                  {/* Labels */}
                  <div className="absolute inset-0 flex items-center justify-around text-[9px] font-semibold text-foreground px-1">
                    <span>0d</span>
                    <span>15d</span>
                    <span>30d</span>
                    <span>30d+</span>
                  </div>
                  {/* Percentages below */}
                  <div className="absolute -bottom-4 inset-x-0 flex items-center justify-around text-[9px] font-bold text-green-600 dark:text-green-400 px-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                    <span>100%</span>
                  </div>
                </div>
                <div className="text-[9px] text-center italic text-muted-foreground mt-3 pt-2 border-t">
                  After 30 clean days, all history penalties reset to zero
                </div>
              </div>
            </div>
          </div>

          {/* Tier 3: Final Score Banner Footer */}
          <div className="bg-background/80 backdrop-blur-sm border-2 border-primary/30 rounded px-4 py-2.5">
            <div className="font-mono text-xs font-bold text-center mb-1.5">
              FINAL SCORE = 1000 − (Age + Amount + Repeat)
            </div>
            <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
              <span>Upper cap: 1000</span>
              <span>|</span>
              <span className="text-red-700 dark:text-red-400 font-semibold">No lower bound (scores can go negative)</span>
            </div>
          </div>
        </Card>
        )}

        {/* Search Filter + View Toggle */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder={leaderboardSide === "active" ? "Search by production or company..." : "Search by producer name or company..."}
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
          
          {/* Admin View Toggle - Only visible to admins on liabilities */}
          {isAdmin && leaderboardSide === "liabilities" && (
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
          
          {/* Delinquent Toggle - Only visible to admins on liabilities */}
          {isAdmin && leaderboardSide === "liabilities" && (
            <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg">
              <Label htmlFor="delinquent-mode" className="text-sm font-semibold cursor-pointer whitespace-nowrap">
                {showDelinquentOnly ? 'Delinquent' : 'All'}
              </Label>
              <Switch
                id="delinquent-mode"
                checked={showDelinquentOnly}
                onCheckedChange={() => toggleDelinquentOnly()}
              />
            </div>
          )}
        </div>

        {/* Project Timeline View (Front Side) */}
        {leaderboardSide === "active" && (() => {
          const list = [...(activeProductions ?? [])].sort((a, b) => {
            const dateA = a.extracted_date ? new Date(a.extracted_date).getTime() : 0;
            const dateB = b.extracted_date ? new Date(b.extracted_date).getTime() : 0;
            return dateB - dateA;
          });
          const filtered = !searchTerm.trim()
            ? list
            : list.filter((p) => {
                const s = searchTerm.trim().toLowerCase();
                return (p.production_name || "").toLowerCase().includes(s) || (p.company_name || "").toLowerCase().includes(s);
              });
          return (
            <>
              <Card className="overflow-hidden md:hidden mb-4">
                {isLoadingActive ? (
                  <div className="text-center py-12 text-muted-foreground">Loading...</div>
                ) : activeError ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Unable to load active productions.</p>
                    <Button variant="outline" size="sm" onClick={() => refetchActive()} className="mt-2">Try Again</Button>
                  </div>
                ) : filtered.length > 0 ? (
                  <div className="divide-y">
                    {filtered.map((p) => (
                      <div key={p.id} className="p-4 flex flex-col gap-2">
                        <div className="font-semibold">{p.production_name || "—"}</div>
                        {p.company_name && <div className="text-sm text-muted-foreground">{p.company_name}</div>}
                        <Badge variant={p.verification_status === "verified" ? "default" : "secondary"}>
                          {p.verification_status}
                        </Badge>
                        {p.crew_size != null && <div className="text-xs text-muted-foreground">Crew: {p.crew_size}</div>}
                        {p.extracted_date && <div className="text-xs text-muted-foreground">Job Date: {formatPacific(p.extracted_date, "MM/dd/yyyy")}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchTerm ? "No matching productions." : "No active productions yet. Call sheet uploads will appear here."}
                  </div>
                )}
              </Card>
              <Card className="overflow-hidden hidden md:block">
                {isLoadingActive ? (
                  <div className="text-center py-12 text-muted-foreground">Loading...</div>
                ) : activeError ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Unable to load active productions.</p>
                    <Button variant="outline" size="sm" onClick={() => refetchActive()} className="mt-2">Try Again</Button>
                  </div>
                ) : (
                   <div className="overflow-x-auto">
                     <Table>
                       <TableHeader>
                         <TableRow className="bg-primary hover:bg-primary">
                           <TableHead className="text-primary-foreground font-black text-sm">PRODUCTION AUTHORITY</TableHead>
                           <TableHead className="text-primary-foreground font-black text-sm">COMPANY</TableHead>
                          <TableHead className="text-primary-foreground font-black text-sm">CREW SIZE</TableHead>
                          <TableHead className="text-primary-foreground font-black text-sm text-center">JOB DATE</TableHead>
                           <TableHead className="text-primary-foreground font-black text-sm text-center">STATUS</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {filtered.length > 0 ? filtered.map((p) => (
                           <TableRow key={p.id} className="hover:bg-muted/50">
                             <TableCell className="font-semibold">{p.production_name || "—"}</TableCell>
                             <TableCell>{p.company_name || "—"}</TableCell>
                            <TableCell className="text-center">{p.crew_size ?? "—"}</TableCell>
                            <TableCell className="text-center">{p.extracted_date ? formatPacific(p.extracted_date, "MM/dd/yy") : "—"}</TableCell>
                             <TableCell className="text-center">
                               <Badge variant={p.verification_status === "verified" ? "default" : "secondary"}>
                                 {p.verification_status}
                               </Badge>
                             </TableCell>
                           </TableRow>
                         )) : (
                           <TableRow>
                             <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                               {searchTerm ? "No matching productions." : "No active productions yet. Call sheet uploads will appear here."}
                             </TableCell>
                           </TableRow>
                         )}
                       </TableBody>
                     </Table>
                   </div>
                 )}
              </Card>
            </>
          );
        })()}

        {/* Liabilities View - Mobile Accordion + Desktop Table */}
        {leaderboardSide === "liabilities" && (
        <>
        <Card className="overflow-hidden md:hidden">
          {isLoadingLiabilities ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading producers...
            </div>
          ) : leaderboardError || queryError ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="bg-card border border-status-warning/50 rounded-lg p-6">
                  <AlertTriangle className="h-8 w-8 text-status-warning mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-2">Unable to Load Leaderboard</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {leaderboardError || "An error occurred while loading producer data"}
                  </p>
                  {isAccessBlocked && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Access to the leaderboard may require a subscription.{" "}
                      <a 
                        href="/subscribe" 
                        className="text-primary hover:underline font-medium"
                      >
                        View subscription options
                      </a>
                    </p>
                  )}
                  <Button
                    onClick={() => refetchProducers()}
                    variant="outline"
                    size="sm"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          ) : (() => {
            let filteredProducers = producers?.filter((producer) => {
              if (!searchTerm.trim()) return true;
              const search = searchTerm.trim().toLowerCase();
              const name = (producer.producer_name || "").toLowerCase();
              const company = (producer.company_name || "").toLowerCase();
              return name === search || company === search;
            }) || [];

            // Apply delinquent filter if enabled
            if (showDelinquentOnly) {
              filteredProducers = filteredProducers.filter(p => (p.total_amount_owed || 0) > 0);
            }

            return filteredProducers.length > 0 ? (
              <Accordion type="multiple" className="w-full">
                {filteredProducers.map((producer) => (
                  <AccordionItem key={producer.producer_id} value={producer.producer_id} className="border-b-2">
                    <AccordionTrigger className="hover:no-underline px-4 py-4 [&[data-state=open]]:bg-muted/30 transition-colors">
                      <div className="flex flex-col w-full text-left space-y-2">
                        {/* Name */}
                        <div className="font-semibold text-base">
                          {producer.producer_name || '—'}
                          {producer.sub_name && (
                            <div className="text-sm text-muted-foreground mt-1 font-normal">
                              {producer.sub_name}
                            </div>
                          )}
                        </div>
                        
                        {/* PSCS and Total Owed Row */}
                        <div className="flex items-center justify-between">
                          {/* PSCS */}
                          <div className="flex flex-col">
                            <span className={cn(
                              "font-mono text-base font-semibold",
                              producer.pscs_score >= 800 && "text-green-500",
                              producer.pscs_score >= 650 && producer.pscs_score < 800 && "text-green-300",
                              producer.pscs_score >= 500 && producer.pscs_score < 650 && "text-yellow-300",
                              producer.pscs_score >= 300 && producer.pscs_score < 500 && "text-orange-400",
                              producer.pscs_score >= 0 && producer.pscs_score < 300 && "text-red-500",
                              producer.pscs_score < 0 && "text-red-700 font-semibold"
                            )}>
                              {Number(producer.pscs_score || 0).toFixed(2)}
                            </span>
                            {/* Perfect score weeks subtext */}
                            {producer.total_amount_owed === 0 && Number(producer.pscs_score || 0) === 1000 && (() => {
                              const lastClosedDate = (producer as any).last_closed_date;
                              if (lastClosedDate) {
                                try {
                                  const lastClosed = new Date(lastClosedDate);
                                  const perfectDate = new Date(lastClosed);
                                  perfectDate.setDate(perfectDate.getDate() + 30);
                                  const today = new Date();
                                  const daysSincePerfect = Math.floor((today.getTime() - perfectDate.getTime()) / (1000 * 60 * 60 * 24));
                                  const weeksSincePerfect = Math.floor(daysSincePerfect / 7);
                                  if (weeksSincePerfect >= 1) {
                                    return (
                                      <span className="text-xs text-gray-400 italic">
                                        ({weeksSincePerfect} week{weeksSincePerfect !== 1 ? 's' : ''})
                                      </span>
                                    );
                                  }
                                } catch (e) {
                                  console.warn('Invalid last_closed_date for producer:', producer.producer_id, e);
                                }
                              }
                              return null;
                            })()}
                            {/* Recovering subtext */}
                            {producer.total_amount_owed === 0 && producer.pscs_score < 1000 && (
                              <span className="text-xs text-gray-400 italic">
                                recovering
                              </span>
                            )}
                          </div>
                          
                          {/* Total Owed */}
                          <span className="text-green-500 font-semibold text-base">
                            ${(producer.total_amount_owed || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3 pt-3 border-t-2 border-border">
                        {/* Oldest Debt */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Oldest Debt:</span>
                          <span className="text-sm font-medium">
                            {producer.oldest_debt_date ? formatPacific(producer.oldest_debt_date, 'MM/dd/yyyy') : '—'}
                          </span>
                        </div>
                        
                        {/* Oldest Debt Day Counter */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Oldest Debt Day Counter:</span>
                          <span className={cn(
                            "inline-block px-3 py-1 rounded font-bold text-sm",
                            getDaysColor(producer.oldest_debt_days)
                          )}>
                            {producer.oldest_debt_days || 0}
                          </span>
                        </div>
                        
                        {/* Crew Owed */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Crew Owed:</span>
                          <span className="text-sm font-medium">{producer.total_crew_owed || 0}</span>
                        </div>
                        
                        {/* Vendors Owed */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Vendors Owed:</span>
                          <span className="text-sm font-medium">{producer.total_vendors_owed || 0}</span>
                        </div>
                        
                        {/* Jobs Owed */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Jobs Owed:</span>
                          <span className="text-sm font-medium">{producer.total_jobs_owed || 0}</span>
                        </div>
                        
                        {/* Cities Owed */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Cities Owed:</span>
                          <span className="text-sm font-medium">{producer.total_cities_owed || 0}</span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-12">
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    {searchTerm 
                      ? `No exact match found for "${searchTerm}". Try the full name as shown on the leaderboard.`
                      : "No producers on the leaderboard yet."}
                  </p>
                  {!searchTerm && (
                    <p className="text-sm text-muted-foreground">
                      Producer information will appear here once verified payment reports are submitted.
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </Card>

        {/* Desktop Table View */}
        <Card className="overflow-hidden hidden md:block">
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
                {isLoadingLiabilities ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      Loading producers...
                    </TableCell>
                  </TableRow>
                ) : leaderboardError || queryError ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="max-w-md mx-auto">
                        <div className="bg-card border border-status-warning/50 rounded-lg p-6">
                          <AlertTriangle className="h-8 w-8 text-status-warning mx-auto mb-3" />
                          <h3 className="font-bold text-lg mb-2">Unable to Load Leaderboard</h3>
                          <p className="text-muted-foreground text-sm mb-4">
                            {leaderboardError || "An error occurred while loading producer data"}
                          </p>
                          {isAccessBlocked && (
                            <p className="text-sm text-muted-foreground mb-4">
                              Access to the leaderboard may require a subscription.{" "}
                              <a 
                                href="/subscribe" 
                                className="text-primary hover:underline font-medium"
                              >
                                View subscription options
                              </a>
                            </p>
                          )}
                          <Button
                            onClick={() => refetchProducers()}
                            variant="outline"
                            size="sm"
                          >
                            Try Again
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (() => {
                  // Filter producers based on search term
                  let filteredProducers = producers?.filter((producer) => {
                    if (!searchTerm.trim()) return true; // Show all if no search
                    
                    const search = searchTerm.trim().toLowerCase();
                    const name = (producer.producer_name || "").toLowerCase();
                    const company = (producer.company_name || "").toLowerCase();
                    
                    return name === search || company === search;
                  }) || [];

                  // Apply delinquent filter if enabled
                  if (showDelinquentOnly) {
                    filteredProducers = filteredProducers.filter(p => (p.total_amount_owed || 0) > 0);
                  }
                  
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
                          
                          {/* Perfect score weeks subtext - matches "recovering" pattern */}
                          {producer.total_amount_owed === 0 && Number(producer.pscs_score || 0) === 1000 && (() => {
                            // Calculate weeks since achieving perfect score
                            // Perfect score is achieved 30 days after last_closed_date
                            // TypeScript may not have last_closed_date typed yet, so use type assertion
                            const lastClosedDate = (producer as any).last_closed_date;
                            
                            if (lastClosedDate) {
                              try {
                                const lastClosed = new Date(lastClosedDate);
                                const perfectDate = new Date(lastClosed);
                                perfectDate.setDate(perfectDate.getDate() + 30); // 30 days after last closed = perfect score date
                                
                                const today = new Date();
                                const daysSincePerfect = Math.floor((today.getTime() - perfectDate.getTime()) / (1000 * 60 * 60 * 24));
                                const weeksSincePerfect = Math.floor(daysSincePerfect / 7);
                                
                                // Only show if at least 1 full week has passed
                                if (weeksSincePerfect >= 1) {
                                  return (
                                    <span className="text-xs text-gray-400 italic">
                                      ({weeksSincePerfect} week{weeksSincePerfect !== 1 ? 's' : ''})
                                    </span>
                                  );
                                }
                              } catch (e) {
                                // Invalid date, skip
                                console.warn('Invalid last_closed_date for producer:', producer.producer_id, e);
                              }
                            }
                            // For producers who never had debt (NULL last_closed_date), don't show weeks
                            return null;
                          })()}
                          
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
                      value={producer.oldest_debt_date ? formatPacific(producer.oldest_debt_date, 'MM/dd/yyyy') : null}
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
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="space-y-2">
                          <p className="text-muted-foreground">
                            {searchTerm 
                              ? `No exact match found for "${searchTerm}". Try the full name as shown on the leaderboard.`
                              : "No producers on the leaderboard yet."}
                          </p>
                          {!searchTerm && (
                            <p className="text-sm text-muted-foreground">
                              Producer information will appear here once verified payment reports are submitted.
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })()}
              </TableBody>
            </Table>
          </div>
        </Card>
        </>
        )}

        </div>
      </div>
      
      <Footer />
    </>
  );
}
