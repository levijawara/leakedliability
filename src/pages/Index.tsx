import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, FileText, Users, TrendingUp, Info, Instagram } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ProducerSearchAutocomplete } from "@/components/ProducerSearchAutocomplete";


const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-0">
        <div className="max-w-[1600px] mx-auto text-center space-y-6">
          <div className="inline-block mb-4">
            <div className="inline-flex items-center gap-2 bg-status-critical/10 border border-status-critical/20 rounded-sm px-4 py-2">
              <AlertTriangle className="h-4 w-4 text-status-critical" />
              <span className="text-sm font-semibold text-status-critical">Public Accountability Platform</span>
            </div>
          </div>

          <h1 className="text-[4.4rem] sm:text-[3.5rem] md:text-[5rem] lg:text-[7rem] xl:text-[8rem] font-black tracking-tighter leading-tight sm:leading-none sm:whitespace-nowrap">
            Leaked Liability<span className="text-[70%] align-super">™</span>
          </h1>

          <a 
            href="https://www.instagram.com/leakedliability/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xl font-bold hover:opacity-80 transition-opacity text-muted-foreground"
          >
            @LeakedLiability
            <Instagram className="h-5 w-5" />
          </a>

          <p className="text-2xl md:text-xl font-bold text-muted-foreground max-w-2xl mx-auto">
            A platform designed to enable and empower freelance crew members and vendors, by intrinsically motivating producers to be good people. We reward integrity, and expose the exploiters.
          </p>

          <p className="text-lg md:text-base text-muted-foreground max-w-2xl mx-auto">
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
              Submission Forms
            </Button>
          </div>
        </div>
      </div>

      {/* Search/Inquiry Box */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-sm p-6 border border-border">
            <div className="text-center mb-4 space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Looking to see if someone's already been reported?
              </h3>
              <p className="text-sm text-muted-foreground">
                Search any producer or production company name to find out.
              </p>
            </div>
            
            <ProducerSearchAutocomplete source="homepage" />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="p-6 text-center space-y-4 border-foreground">
            <div className="w-12 h-12 rounded-full bg-status-critical/10 flex items-center justify-center mx-auto">
              <Users className="h-6 w-6 text-status-critical" />
            </div>
            <h3 className="text-xl font-bold">Crew & Vendor Protection</h3>
            <p className="text-muted-foreground">
              Your identity stays anonymous (crew) or documented (vendors). We verify all reports for accuracy.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-4 border-foreground">
            <div className="w-12 h-12 rounded-full bg-status-warning/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6 text-status-warning" />
            </div>
            <h3 className="text-xl font-bold">PSCS Scoring</h3>
            <p className="text-muted-foreground">
              Producing Social Credit Score (Unknown – 1,000) is based on a logarithmic, weighted equation, that's modeled after real FICO credit score calculations.
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
      <div className="container mx-auto px-4 py-6">
        <Card className="max-w-4xl mx-auto p-12 text-center bg-card border-foreground">
          <h2 className="text-4xl font-black mb-4">Ready to Change the Industry?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Follow @LeakedLiability on Instagram to join the movement. Let's start holding producers accountable, so that we can get crews paid faster.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.open('https://www.instagram.com/leakedliability/', '_blank')}
            className="text-lg px-8"
          >
            Follow on Instagram
          </Button>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;
