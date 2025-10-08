import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, TrendingUp, FileText, Info, AlertTriangle, Instagram } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Navigation() {
  const navigate = useNavigate();

  return (
    <nav className="border-b bg-card/50 backdrop-blur">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              onClick={() => navigate("/")}
              className="bg-white h-10 w-10 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
            >
              <span className="text-black font-black text-xl">LL</span>
            </div>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            <a 
              href="https://www.instagram.com/leakedliability/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl font-black hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              @LeakedLiability
              <Instagram className="h-5 w-5" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/how-it-works")}
            >
              <Info className="h-4 w-4 mr-2" />
              How It Works
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/leaderboard")}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Leaderboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/submit")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Submission Forms
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/disclaimer")}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Disclaimer
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
