import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useState, useEffect } from "react";
import { useLeaderboardAccess } from "@/hooks/useLeaderboardAccess";
import { LeaderboardPaywall } from "@/components/LeaderboardPaywall";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const getDaysColor = (days: number | null) => {
  if (!days || days < 0) return "bg-background text-foreground";
  if (days >= 365) return "bg-status-nuclear text-status-nuclear-text font-bold";
  if (days >= 90) return "bg-status-critical text-white";
  if (days >= 30) return "bg-status-danger text-white";
  if (days >= 15) return "bg-status-warning text-black";
  return "bg-status-excellent text-white";
};

export default function Leaderboard() {
  const { accessState, loading: accessLoading, refreshAccess } = useLeaderboardAccess();
  const [managingBilling, setManagingBilling] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const { data: producers, isLoading } = useQuery({
    queryKey: ["public_leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_leaderboard")
        .select("*");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch site settings for blur toggle and public readiness flag
  const { data: settings } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("blur_names_for_public, public_leaderboard_ready")
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
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
    };
    checkAdmin();
  }, []);

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

  // Show paywall if no access
  if (!accessLoading && accessState && !accessState.hasAccess) {
    return <LeaderboardPaywall accessState={accessState} onAccessGranted={refreshAccess} refreshAccess={refreshAccess} />;
  }

  // Two-tier blur system:
  // Stage 1: Names blurred until public_leaderboard_ready = TRUE
  // Stage 2: Names visible to all when admin flips the flag
  // Admins always see unblurred regardless of flag
  const shouldBlurNames = !settings?.public_leaderboard_ready && !isAdmin;

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
          <p className="text-xl md:text-2xl font-bold text-muted-foreground">
            Producer Debt Leaderboard
          </p>
          <p className="text-sm text-muted-foreground">
            Last Updated: {format(new Date(), "MM/dd/yy")}
          </p>
          
          {/* Access Status Badge */}
          {accessState && (
            <div className="flex justify-center gap-3 flex-wrap">
              {accessState.reason === 'admin' && (
                <Badge variant="default" className="text-lg px-4 py-2">Admin Access</Badge>
              )}
              {accessState.reason === 'contributor_free' && (
                <Badge variant="default" className="text-lg px-4 py-2 bg-green-600">
                  ✓ Contributor Access (Free)
                </Badge>
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
          <h3 className="font-black text-lg mb-4 text-center">PSCS™ CREDIT SCORE MODEL</h3>
          <div className="space-y-4">
            <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg border-2 border-primary/20 shadow-lg">
              <h4 className="font-bold text-sm mb-3 text-center">Active Debt Penalty</h4>
              <div className="text-xs text-muted-foreground space-y-2">
                <div className="font-mono text-center">
                  PSCS = 1000 - (Age Penalty + Amount Penalty + Repeat Penalty)
                </div>
                <div className="grid md:grid-cols-3 gap-3 mt-3">
                  <div className="bg-background/50 p-2 rounded text-center">
                    <div className="font-bold text-foreground text-xs">Age (max -650)</div>
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
                  Recovery = 1000 - (250 × (1 - forgiveness_factor))
                </div>
                <div className="font-mono text-center text-[10px]">
                  forgiveness_factor = 1 - e<sup>(-days_clean / 180 × ln(2))</sup>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                  <div className="bg-background/50 p-2 rounded">
                    <div className="font-bold text-foreground">6mo</div>
                    <div className="text-[10px]">~50%</div>
                  </div>
                  <div className="bg-background/50 p-2 rounded">
                    <div className="font-bold text-foreground">1yr</div>
                    <div className="text-[10px]">~75%</div>
                  </div>
                  <div className="bg-background/50 p-2 rounded">
                    <div className="font-bold text-foreground">2yr</div>
                    <div className="text-[10px]">~94%</div>
                  </div>
                  <div className="bg-background/50 p-2 rounded">
                    <div className="font-bold text-foreground">3yr+</div>
                    <div className="text-[10px]">~100%</div>
                  </div>
                </div>
                <div className="text-[10px] text-center italic mt-2">
                  25% history penalty fades over time with clean behavior
                </div>
              </div>
            </div>
          </div>
        </Card>

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
                    <span className="text-xs font-normal">(0 - 1,000)</span>
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
                ) : producers && producers.length > 0 ? (
                  producers.map((producer) => (
                    <TableRow 
                      key={producer.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          <div>
                            <span className={shouldBlurNames ? "blur-sm select-none" : ""}>{producer.name}</span>
                            {producer.company && (
                              <div className={`text-xs text-muted-foreground ${shouldBlurNames ? "blur-sm select-none" : ""}`}>{producer.company}</div>
                            )}
                          </div>
                          {producer.momentum_active_until && 
                           new Date(producer.momentum_active_until) > new Date() && (
                            <span 
                              title="Good Standing Momentum (7-day grace period)" 
                              className="text-xl"
                            >
                              🔥
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-bold text-lg">
                            {Math.round(producer.pscs_score || 0)}
                          </span>
                          {producer.total_amount_owed === 0 && producer.paid_jobs_count > 0 && (
                            <span className="text-xs text-muted-foreground italic">
                              (recovering)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        <span className="text-status-excellent">$</span>{producer.total_amount_owed?.toLocaleString() || "0"}
                      </TableCell>
                      <TableCell className="text-center">
                        {producer.oldest_debt_date
                          ? format(new Date(producer.oldest_debt_date), "MM/dd/yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded font-bold text-lg ${getDaysColor(
                            producer.oldest_debt_days
                          )}`}
                        >
                          {producer.oldest_debt_days || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-lg">
                        {producer.total_crew_owed || 0}
                      </TableCell>
                      <TableCell className="text-center text-lg">
                        {producer.total_vendors_owed || 0}
                      </TableCell>
                      <TableCell className="text-center text-lg">
                        {producer.total_jobs_owed || 0}
                      </TableCell>
                      <TableCell className="text-center text-lg">
                        {producer.total_cities_owed || 0}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No producers on the leaderboard yet.
                    </TableCell>
                  </TableRow>
                )}
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
