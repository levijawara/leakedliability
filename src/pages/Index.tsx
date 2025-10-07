import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, FileText, Users, TrendingUp, Info } from "lucide-react";

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
            NET30+ was created as a means to assist businesses with monthly cash-flow BEFORE bank transactions became automated, but humanity has come a VERY long way—so has our technology. There's no need to pretend anymore. Humanity's undisciplined greed is the only reason why NET30+ still lingers, so we've decided to do something about it.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/how-it-works")}
              className="text-lg px-8"
            >
              <Info className="mr-2 h-5 w-5" />
              How It Works
            </Button>
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
          <Card className="p-6 text-center space-y-4 border-foreground">
            <div className="w-12 h-12 rounded-full bg-status-critical/10 flex items-center justify-center mx-auto">
              <Users className="h-6 w-6 text-status-critical" />
            </div>
            <h3 className="text-xl font-bold">Crew Protection</h3>
            <p className="text-muted-foreground">
              Your Identity stays anonymous. We only need it for documentation, corroboration, and verification purposes.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-4 border-foreground">
            <div className="w-12 h-12 rounded-full bg-status-warning/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6 text-status-warning" />
            </div>
            <h3 className="text-xl font-bold">PSCS Scoring</h3>
            <p className="text-muted-foreground">
              Producing Social Credit Score (0-1,000) is based on a logarithmic, weighted equation, that's modeled after real FICO credit score calculations.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-4 border-foreground">
            <div className="w-12 h-12 rounded-full bg-status-excellent/10 flex items-center justify-center mx-auto">
              <TrendingUp className="h-6 w-6 text-status-excellent" />
            </div>
            <h3 className="text-xl font-bold">Public Accountability</h3>
            <p className="text-muted-foreground">
              Verified reports enable us to post factual statistics, which could encourage better production budget negotiation and handling.
            </p>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <Card className="max-w-4xl mx-auto p-12 text-center bg-gradient-to-br from-card to-muted/20 border-foreground">
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
