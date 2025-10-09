import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, TrendingUp, FileText, Info, AlertTriangle, Instagram, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export function Navigation() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const menuItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Info, label: "How It Works", path: "/how-it-works" },
    { icon: TrendingUp, label: "Leaderboard", path: "/leaderboard" },
    { icon: FileText, label: "Submission Forms", path: "/submit" },
    { icon: AlertTriangle, label: "Disclaimer", path: "/disclaimer" },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <nav className="border-b bg-card/50 backdrop-blur">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
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

          <div className="hidden md:flex items-center gap-2">
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

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <a 
                href="https://www.instagram.com/leakedliability/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-black hover:opacity-80 transition-opacity flex items-center gap-2"
              >
                @LeakedLiability
                <Instagram className="h-4 w-4" />
              </a>
            </div>
            
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col gap-4 mt-8">
                  {menuItems.map((item) => (
                    <Button
                      key={item.path}
                      variant="ghost"
                      className="justify-start"
                      onClick={() => handleNavigate(item.path)}
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
