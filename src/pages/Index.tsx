import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, FileText, Users, TrendingUp } from "lucide-react";

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
            A platform designed to enable and empower freelance crew members, by intrinsically motivating producers to be good people.
          </p>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Net30+ was created as a means to assist businesses with monthly cash-flow BEFORE bank transactions became automated. We used AI to help build and automate this entire platform...in a matter of days. Anyone who thinks NET30+ payment terms are still needed or necessary is deluded.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button 
              size="lg" 
              onClick={() => navigate("/leaderboard")}
              className="text-lg px-8"
            >
              <TrendingUp className="mr-2 h-5 w-5" />
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
              <TrendingUp className="h-6 w-6 text-status-excellent" />
            </div>
            <h3 className="text-xl font-bold">Public Accountability</h3>
            <p className="text-muted-foreground">
              Verified reports appear publicly, creating social pressure for faster payments.
            </p>
          </Card>
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
