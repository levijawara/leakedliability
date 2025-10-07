import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, TrendingUp, FileText, Info } from "lucide-react";

export function Navigation() {
  const navigate = useNavigate();

  return (
    <nav className="border-b bg-card/50 backdrop-blur">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate("/")}
            className="text-xl font-black hover:opacity-80 transition-opacity"
          >
            Leaked Liability™
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/how-it-works")}
            >
              <Info className="h-4 w-4 mr-2" />
              How It Works
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/leaderboard")}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Leaderboard
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
