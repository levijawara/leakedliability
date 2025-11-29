import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, DollarSign, Users, FileText, ArrowLeft, Wrench, Building2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface UserTypeCardProps {
  title: string;
  icon: React.ReactNode;
  users: any[];
  extraFormatter?: (user: any) => React.ReactNode;
}

interface ProducerCardProps {
  name: string;
  email: string;
  pscs: number | null;
  totalDebtEver: number;
  openDebt: number;
  linked?: boolean;
}

const ProducerCard = ({ name, email, pscs, totalDebtEver, openDebt }: ProducerCardProps) => (
  <Card className="p-4 h-full w-[280px] sm:w-[300px] md:w-[320px] lg:w-[340px]">
    <div className="space-y-3">
      <div>
        <p className="font-semibold text-base">{name}</p>
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>
      
      <div className="space-y-2 pt-2 border-t">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Debt Ever:</span>
          <span className="font-medium">${totalDebtEver.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Open Debt:</span>
          <span className="font-medium">${openDebt.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t">
          <span className="text-muted-foreground">PSCS:</span>
          <span className="font-bold">
            {pscs !== null ? pscs.toFixed(0) : <span className="text-muted-foreground italic">No data yet</span>}
          </span>
        </div>
      </div>
    </div>
  </Card>
);

function UserTypeCard({ title, icon, users, extraFormatter }: UserTypeCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="p-6">
      <div 
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          {icon}
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{users.length}</p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {isOpen ? '▲ Hide' : '▼ View list'}
        </div>
      </div>

      {isOpen && users.length > 0 && (
        <div className="mt-4 max-h-60 overflow-y-auto border-t pt-4">
          <div className="space-y-2 font-mono text-sm">
            {users.map((user: any) => (
              <div key={user.id} className="select-text">
                <div className="text-foreground">
                  {user.full_name} – {user.email}
                </div>
                {extraFormatter && extraFormatter(user)}
              </div>
            ))}
          </div>
        </div>
      )}

      {isOpen && users.length === 0 && (
        <div className="mt-4 text-sm text-muted-foreground border-t pt-4">
          No users in this category
        </div>
      )}
    </Card>
  );
}

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
    <>
      <Navigation />
      <div className="min-h-screen bg-background pt-20 md:pt-24 p-6">
        <div className="container max-w-6xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          <Button 
            variant="ghost"
            onClick={() => navigate("/admin/analytics/daily-visitors")}
          >
            Daily Visitors
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Leaderboard Analytics</h1>
          <p className="text-muted-foreground">Real-time insights and metrics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{insights?.totalUsers || 0}</p>
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
                <p className="text-sm text-muted-foreground">Total Debt Ever Reported</p>
                <p className="text-2xl font-bold">${insights?.totalDebtEver?.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Current Open: ${insights?.totalOpenDebt?.toLocaleString() || 0}</p>
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
              <p className="text-sm font-medium">Unpaid Reports</p>
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

        {/* User Overview Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-1 flex items-center gap-2">
            <Users className="h-6 w-6" />
            User Overview
          </h2>
          <p className="text-muted-foreground mb-6">
            Account type distribution across the platform
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UserTypeCard
              title="Crew Member Accounts"
              icon={<User className="h-8 w-8 text-yellow-500" />}
              users={insights?.crewMembers || []}
              extraFormatter={(user) =>
                user.most_common_role ? (
                  <div className="text-xs text-muted-foreground mt-1">
                    Most reported role: {user.most_common_role}
                  </div>
                ) : null
              }
            />

            <UserTypeCard
              title="Vendor / Service Provider Accounts"
              icon={<Wrench className="h-8 w-8 text-purple-500" />}
              users={insights?.vendors || []}
            />

            <UserTypeCard
              title="Production Company Accounts"
              icon={<Building2 className="h-8 w-8 text-emerald-500" />}
              users={insights?.productionCompanies || []}
            />
          </div>
        </div>

        {/* Producer Accounts - Two Carousels */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-1 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-500" />
            Producer Accounts
          </h2>
          <p className="text-muted-foreground mb-6">
            Registered producers vs system-created producers from reports
          </p>
          
          <div className="flex flex-col lg:flex-row gap-6 justify-between">
            {/* Non-Registered Producers */}
            <div className="flex flex-col gap-2 w-full max-w-[420px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Non-Registered Producer Accounts
                </h3>
                <Badge variant="outline">
                  {insights?.nonRegisteredProducerAccounts?.length || 0}
                </Badge>
              </div>
              
              {insights?.nonRegisteredProducerAccounts && insights.nonRegisteredProducerAccounts.length > 0 ? (
                <Carousel className="w-full relative px-12">
                  <CarouselContent>
                    {insights.nonRegisteredProducerAccounts.map((producer: ProducerCardProps, index: number) => (
                      <CarouselItem key={index} className="flex justify-center">
                        <ProducerCard {...producer} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-0 -translate-x-1/2" />
                  <CarouselNext className="right-0 translate-x-1/2" />
                </Carousel>
              ) : (
                <Card className="p-6">
                  <p className="text-sm text-muted-foreground text-center">
                    No non-registered producers
                  </p>
                </Card>
              )}
            </div>

            {/* Registered Producers */}
            <div className="flex flex-col gap-2 w-full max-w-[420px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Registered Producer Accounts
                </h3>
                <Badge variant="outline">
                  {insights?.registeredProducerAccounts?.length || 0}
                </Badge>
              </div>
              
              {insights?.registeredProducerAccounts && insights.registeredProducerAccounts.length > 0 ? (
                <Carousel className="w-full relative px-12">
                  <CarouselContent>
                    {insights.registeredProducerAccounts.map((producer: ProducerCardProps, index: number) => (
                      <CarouselItem key={index} className="flex justify-center">
                        <ProducerCard {...producer} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-0 -translate-x-1/2" />
                  <CarouselNext className="right-0 translate-x-1/2" />
                </Carousel>
              ) : (
                <Card className="p-6">
                  <p className="text-sm text-muted-foreground text-center">
                    No registered producers
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>

        </div>
        
        <Footer />
      </div>
    </>
  );
}
