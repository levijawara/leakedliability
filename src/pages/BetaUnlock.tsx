import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function BetaUnlock() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkBetaAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Session is guaranteed by RequireAuth wrapper
      if (session) {
        // Check if user already has beta access
        const { data: profile } = await supabase
          .from("profiles")
          .select("beta_access")
          .eq("user_id", session.user.id)
          .single();

        if (profile?.beta_access) {
          // Already have access, redirect to call sheets
          navigate("/call-sheets");
          return;
        }
      }

      setChecking(false);
    };

    checkBetaAccess();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast({
        title: "Enter a code",
        description: "Please enter the secret code.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("redeem-beta-code", {
        body: { code: code.trim() },
      });

      if (error) {
        console.error("[BetaUnlock] Function error:", error);
        toast({
          title: "That's not it...",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (data?.error) {
        toast({
          title: data.error === "Invalid code" ? "That's not it..." : data.error,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Success!
      toast({
        title: "Access granted",
        description: "Welcome to the beta!",
      });

      // Redirect to call sheets
      navigate("/call-sheets");

    } catch (err) {
      console.error("[BetaUnlock] Error:", err);
      toast({
        title: "Something went wrong",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-sm px-4 space-y-4">
        <Input
          type="text"
          placeholder="Enter the secret..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="text-center"
          autoFocus
          disabled={loading}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            "Submit"
          )}
        </Button>
      </form>
    </div>
  );
}
