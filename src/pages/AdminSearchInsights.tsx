import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, TrendingUp, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";

interface SearchStat {
  searched_name: string;
  search_count: number;
  last_searched: string;
  recent_searches_7d: number;
  matched_producer_name?: string;
}

interface RecentSearch {
  searched_name: string;
  created_at: string;
  matched_producer_name?: string;
  source?: string;
}

export default function AdminSearchInsights() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [totalSearches, setTotalSearches] = useState(0);
  const [topSearches, setTopSearches] = useState<SearchStat[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasAdminRole = roles?.some((r) => r.role === "admin");
      if (!hasAdminRole) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this page.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
      fetchData();
    };

    checkAdminStatus();
  }, [navigate, toast]);

  const fetchData = async () => {
    setRefreshing(true);
    
    try {
      // Total searches
      const { count } = await supabase
        .from('search_logs')
        .select('*', { count: 'exact', head: true });
      setTotalSearches(count || 0);

      // Top searched names with 7-day trending
      const { data: topData, error: topError } = await supabase.rpc('get_top_searches');
      if (topError) throw topError;
      setTopSearches(topData || []);

      // Recent 100 searches
      const { data: recentData, error: recentError } = await supabase
        .from('search_logs')
        .select(`
          searched_name,
          created_at,
          matched_producer_id,
          source,
          producers (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (recentError) throw recentError;
      
      setRecentSearches(
        recentData?.map((s: any) => ({
          searched_name: s.searched_name,
          created_at: s.created_at,
          matched_producer_name: s.producers?.name,
          source: s.source || 'leaderboard'
        })) || []
      );
    } catch (error) {
      console.error('Error fetching search analytics:', error);
      toast({
        title: "Error loading analytics",
        description: "Failed to fetch search data",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate("/admin")}
                className="mb-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Button>
              <h1 className="text-3xl font-bold text-foreground">Inquiries</h1>
              <p className="text-muted-foreground mt-1">See who's been searched, when, and how often.</p>
            </div>
            <Button onClick={fetchData} disabled={refreshing} variant="outline">
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              Refresh Data
            </Button>
          </div>

          {/* Total Searches + Top 10 Card */}
          <Card>
            <CardHeader>
              <CardTitle>Total Searches</CardTitle>
              <CardDescription>All-time searches with Top 10 most searched</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground mb-6">{totalSearches.toLocaleString()}</div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Search Term</TableHead>
                      <TableHead>Matched Producer</TableHead>
                      <TableHead className="text-right">Total Searches</TableHead>
                      <TableHead className="text-right">Last 7 Days</TableHead>
                      <TableHead>Last Searched</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSearches.length > 0 ? (
                      topSearches.slice(0, 10).map((stat, index) => (
                        <TableRow key={stat.searched_name + index}>
                          <TableCell className="font-medium">#{index + 1}</TableCell>
                          <TableCell className="font-mono">{stat.searched_name}</TableCell>
                          <TableCell>
                            {stat.matched_producer_name ? (
                              <Badge variant="secondary">{stat.matched_producer_name}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">No match</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{stat.search_count}</TableCell>
                          <TableCell className="text-right">
                            {stat.recent_searches_7d > 5 && (
                              <TrendingUp className="inline h-4 w-4 text-orange-500 mr-1" />
                            )}
                            {stat.recent_searches_7d}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(stat.last_searched).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No search data yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Searches Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Searches</CardTitle>
              <CardDescription>Last 100 searches (live feed)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Search Term</TableHead>
                      <TableHead>Matched Producer</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSearches.length > 0 ? (
                      recentSearches.map((search, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{search.searched_name}</TableCell>
                          <TableCell>
                            {search.matched_producer_name ? (
                              <Badge variant="secondary">{search.matched_producer_name}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">No match</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {search.source === 'homepage' ? (
                              <Badge variant="outline" className="bg-neutral-800 text-neutral-300">
                                Homepage
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-blue-900/30 text-blue-300">
                                Leaderboard
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(search.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No recent searches
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
}
