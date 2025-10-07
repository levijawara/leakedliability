import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, FileText, Users, TrendingDown } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-block mb-4">
            <div className="inline-flex items-center gap-2 bg-status-critical/10 border border-status-critical/20 rounded-full px-4 py-2">
              <AlertTriangle className="h-4 w-4 text-status-critical" />
              <span className="text-sm font-semibold text-status-critical">Public Accountability Platform</span>
            </div>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight">
            Leaked Liability™
          </h1>

          <p className="text-2xl md:text-3xl font-bold text-muted-foreground max-w-2xl mx-auto">
            Weaponizing human psychology to motivate producers to pay crew faster
          </p>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A public leaderboard tracking producers who owe payments to freelance filmmakers. 
            No more Net 30+. It's time for accountability.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button 
              size="lg" 
              onClick={() => navigate("/leaderboard")}
              className="text-lg px-8"
            >
              <TrendingDown className="mr-2 h-5 w-5" />
              View Leaderboard
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/submit")}
              className="text-lg px-8"
            >
              <FileText className="mr-2 h-5 w-5" />
              Submit Report
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-status-critical/10 flex items-center justify-center mx-auto">
              <Users className="h-6 w-6 text-status-critical" />
            </div>
            <h3 className="text-xl font-bold">Crew Protection</h3>
            <p className="text-muted-foreground">
              Your identity stays anonymous. Producers never see who reported them.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-status-warning/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6 text-status-warning" />
            </div>
            <h3 className="text-xl font-bold">PSCS Scoring</h3>
            <p className="text-muted-foreground">
              Producer Social Credit Score (0-1,000) based on payment behavior and debt age.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-status-excellent/10 flex items-center justify-center mx-auto">
              <TrendingDown className="h-6 w-6 text-status-excellent" />
            </div>
            <h3 className="text-xl font-bold">Public Accountability</h3>
            <p className="text-muted-foreground">
              Verified reports appear publicly, creating social pressure for faster payments.
            </p>
          </Card>
        </div>
      </div>

      {/* How It Works */}
      <div className="container mx-auto px-4 py-20 bg-muted/20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-black text-center mb-12">How It Works</h2>
          
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Submit a Report</h3>
                  <p className="text-muted-foreground">
                    Crew members submit unpaid invoice details. Your identity is protected.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Verification Process</h3>
                  <p className="text-muted-foreground">
                    Human review + AI parsing verifies reports before they appear publicly.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Public Leaderboard</h3>
                  <p className="text-muted-foreground">
                    Verified producers appear on the leaderboard with their PSCS score and debt details.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Payment = Relief</h3>
                  <p className="text-muted-foreground">
                    When payment is confirmed, penalties drop immediately and PSCS improves.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <Card className="max-w-4xl mx-auto p-12 text-center bg-gradient-to-br from-card to-muted/20">
          <h2 className="text-4xl font-black mb-4">Ready to Change the Industry?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join the movement to hold producers accountable and get crews paid faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="text-lg px-8"
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/leaderboard")}
              className="text-lg px-8"
            >
              View Leaderboard
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Index;
