import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ConfirmationCashBadge() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("confirmation_cash_balance")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setBalance(profile.confirmation_cash_balance || 0);
      }
    } catch (error) {
      console.error("Error loading confirmation cash balance:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || balance === 0) return null;

  return (
    <Badge variant="secondary" className="gap-1">
      <DollarSign className="h-3 w-3" />
      {balance.toFixed(2)}
    </Badge>
  );
}
