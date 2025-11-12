import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertTriangle, FileText, Users, TrendingUp, Info, Search } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const searchLogTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/leaderboard?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  // Debounced search logging
  useEffect(() => {
    if (searchLogTimeoutRef.current) {
      clearTimeout(searchLogTimeoutRef.current);
    }
    
    if (searchTerm.trim().length >= 2) {
      searchLogTimeoutRef.current = setTimeout(async () => {
        try {
          // Log search asynchronously (no producer matching on homepage)
          await supabase.from('search_logs').insert({
            searched_name: searchTerm.trim(),
            matched_producer_id: null,
            source: 'homepage'
          });
        } catch (error) {
          // Fail silently - don't disrupt user experience
          console.debug('Search logging failed:', error);
        }
      }, 1500); // 1.5s debounce
    }
    
    return () => {
      if (searchLogTimeoutRef.current) {
        clearTimeout(searchLogTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
      <Navigation />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-0">
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
          <div className="bg-[#141414] rounded-2xl p-6 shadow-lg border border-neutral-800">
            <div className="text-center mb-4 space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Looking to see if someone's already been reported?
              </h3>
              <p className="text-sm text-muted-foreground">
                Search any producer or production company name to find out.
              </p>
            </div>
            
            <form onSubmit={handleSearch} className="w-full">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center flex-shrink-0"
                  aria-hidden="true"
                >
                  <Search className="h-5 w-5 text-muted-foreground animate-pulse" />
                </div>

                <Input
                  type="text"
                  aria-label="Search producers or production companies"
                  placeholder="Search for producers or production companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-neutral-900 border-neutral-700 rounded-xl px-4 py-3 text-white placeholder:text-neutral-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 w-full"
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="p-6 text-center space-y-4 border-foreground animate-glow-red transition-shadow duration-700">
            <div className="w-12 h-12 rounded-full bg-status-critical/10 flex items-center justify-center mx-auto">
              <Users className="h-6 w-6 text-status-critical" />
            </div>
            <h3 className="text-xl font-bold">Crew & Vendor Protection</h3>
            <p className="text-muted-foreground">
              Your identity stays anonymous (crew) or documented (vendors). We verify all reports for accuracy.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-4 border-foreground animate-glow-yellow transition-shadow duration-700">
            <div className="w-12 h-12 rounded-full bg-status-warning/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6 text-status-warning" />
            </div>
            <h3 className="text-xl font-bold">PSCS Scoring</h3>
            <p className="text-muted-foreground">
              Producing Social Credit Score (0-1,000) is based on a logarithmic, weighted equation, that's modeled after real FICO credit score calculations.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-4 border-foreground animate-glow-green transition-shadow duration-700">
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
        <Card className="max-w-4xl mx-auto p-12 text-center bg-gradient-to-br from-card to-muted/20 border-foreground">
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
