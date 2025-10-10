import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Navigation } from "@/components/Navigation";

const getDaysColor = (days: number | null) => {
  if (!days || days < 0) return "bg-background text-foreground";
  if (days >= 365) return "bg-status-nuclear text-status-nuclear-text font-bold";
  if (days >= 90) return "bg-status-critical text-white";
  if (days >= 30) return "bg-status-danger text-white";
  if (days >= 15) return "bg-status-warning text-black";
  return "bg-status-excellent text-white";
};

export default function Leaderboard() {
  const { data: producers, isLoading } = useQuery({
    queryKey: ["producers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("producers")
        .select("*")
        .order("pscs_score", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

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
        </div>

        {/* Alert Banner */}
        <Card className="mb-8 p-6 border-l-4 border-status-critical bg-status-critical/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-status-critical mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-lg mb-2">Public Accountability Notice</h3>
              <p className="text-sm text-muted-foreground">
                This leaderboard tracks producers who owe payments to freelance crew members. 
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
          <h3 className="font-black text-lg mb-4 text-center">PSCS™ ROLLING FORMULA</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Half - Formula */}
            <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border-2 border-primary/20 shadow-lg flex items-center justify-center">
              <div className="font-mono text-center space-y-3">
                <div className="text-xs md:text-sm text-foreground">
                  <span className="font-black">PSCS</span> = 
                  <span className="inline-block mx-1">
                    1000 × (1 − P) + F
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div><span className="font-bold text-foreground">P</span> = weighted penalty</div>
                  <div className="text-[10px]">
                    = 0.35×F<sub>$</sub> + 0.35×F<sub>days</sub> + 0.10×F<sub>crew</sub><br/>
                    + 0.10×F<sub>jobs</sub> + 0.10×F<sub>geo</sub>
                  </div>
                  <div className="pt-1"><span className="font-bold text-foreground">F</span> = forgiveness (if clean)</div>
                  <div className="text-[10px]">
                    = (1 − e<sup>−t/90</sup>) × (1000 − base)
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Half - Legend */}
            <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border-2 border-primary/20 shadow-lg flex items-center">
              <div className="text-[11px] text-muted-foreground space-y-1.5 w-full">
                <div className="font-bold text-foreground mb-2">Penalty Factors:</div>
                <div>F<sub>$</sub> = min(1, amt / $5k)</div>
                <div>F<sub>days</sub> = min(1, days / 180)</div>
                <div>F<sub>crew</sub> = min(1, crew / 5)</div>
                <div>F<sub>jobs</sub> = min(1, jobs / 5)</div>
                <div>F<sub>geo</sub> = min(1, cities / 3)</div>
                <div className="pt-2 font-bold text-foreground">Time Forgiveness:</div>
                <div>t = days since last debt closed</div>
                <div className="text-[10px] italic">Clean record → ~63% forgiven in 90d, ~95% in 270d</div>
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
                        <span className="blur-sm select-none">{producer.name}</span>
                        {producer.company && (
                          <div className="text-xs text-muted-foreground blur-sm select-none">{producer.company}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold text-lg">
                        {Math.round(producer.pscs_score || 0)}
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
    </>
  );
}
