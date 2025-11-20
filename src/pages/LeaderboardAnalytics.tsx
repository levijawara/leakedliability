import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, DollarSign, Users, FileText, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";

export default function LeaderboardAnalytics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    checkAccessAndLoadData();
  }, []);

  const checkAccessAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: isAdmin } = await supabase.rpc('has_role', { 
        _user_id: user.id, 
        _role: 'admin' 
      });

      if (!isAdmin) {
        toast({
          title: "Access Denied",
          description: "Admin privileges required",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const { data, error } = await supabase.functions.invoke('leaderboard-insights');

      if (error) {
        console.error('Error fetching insights:', error);
        toast({
          title: "Error",
          description: "Failed to load analytics",
          variant: "destructive",
        });
        return;
      }

      setInsights(data.data);
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Leaderboard Analytics</h1>
          <p className="text-muted-foreground">Real-time insights and metrics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Producers</p>
                <p className="text-2xl font-bold">{insights?.totalProducers || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">{insights?.totalReports || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Debt</p>
                <p className="text-2xl font-bold">${insights?.totalDebt?.toLocaleString() || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Debt/Producer</p>
                <p className="text-2xl font-bold">${insights?.averageDebt?.toFixed(2) || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Verified Reports</p>
              <Badge variant="outline">{insights?.verifiedReports || 0}</Badge>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500" 
                style={{ width: `${(insights?.verifiedReports / insights?.totalReports * 100) || 0}%` }}
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Pending Reports</p>
              <Badge variant="outline">{insights?.pendingReports || 0}</Badge>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-500" 
                style={{ width: `${(insights?.pendingReports / insights?.totalReports * 100) || 0}%` }}
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Paid Reports</p>
              <Badge variant="outline">{insights?.paidReports || 0}</Badge>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500" 
                style={{ width: `${(insights?.paidReports / insights?.totalReports * 100) || 0}%` }}
              />
            </div>
          </Card>
        </div>

      </div>
      
      <Footer />
    </div>
  );
}
