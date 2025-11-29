import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DayStat = {
  day: string;
  unique_visitors: number;
};

type GeoBreakdown = {
  country: string | null;
  region: string | null;
  city: string | null;
  visitor_count: number;
};

export default function DailyVisitors() {
  const navigate = useNavigate();
  const [days, setDays] = useState<DayStat[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [geoBreakdown, setGeoBreakdown] = useState<GeoBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDailyStats = async () => {
      setLoading(true);
      
      const start = new Date();
      start.setDate(start.getDate() - 30);
      const startIso = start.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .rpc('get_daily_visitor_stats', { start_date: startIso });

      if (error) {
        console.error("Failed to load daily stats:", error);
      } else {
        setDays(data || []);
        if (data && data.length > 0) {
          setSelectedDay(data[0].day);
        }
      }
      
      setLoading(false);
    };

    loadDailyStats();
  }, []);

  useEffect(() => {
    if (!selectedDay) return;

    const loadGeoBreakdown = async () => {
      const { data, error } = await supabase
        .rpc('get_geo_breakdown', { selected_day: selectedDay });

      if (error) {
        console.error("Failed to load geo breakdown:", error);
      } else {
        setGeoBreakdown(data || []);
      }
    };

    loadGeoBreakdown();
  }, [selectedDay]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container max-w-6xl mx-auto">
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background p-6 pt-24 md:pt-28">
        <div className="container max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/analytics")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Analytics
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Daily Visitors</h1>
          <p className="text-muted-foreground">
            Unique visitors per day (last 30 days) • Anonymized via hashing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">By Day</h2>
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead className="text-right">Unique Visitors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {days.map((stat) => (
                    <TableRow
                      key={stat.day}
                      onClick={() => setSelectedDay(stat.day)}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        selectedDay === stat.day ? "bg-muted" : ""
                      }`}
                    >
                      <TableCell className="font-mono">{stat.day}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {stat.unique_visitors}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Breakdown for {selectedDay || "—"}
            </h2>
            {!selectedDay ? (
              <p className="text-muted-foreground">Select a day to view breakdown</p>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Visitors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {geoBreakdown.map((geo, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {geo.city || "Unknown"}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {[geo.region, geo.country].filter(Boolean).join(", ") || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {geo.visitor_count}
                        </TableCell>
                      </TableRow>
                    ))}
                    {geoBreakdown.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No data for this day
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
        <Footer />
        </div>
      </div>
    </>
  );
}
