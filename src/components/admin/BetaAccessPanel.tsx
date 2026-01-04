import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Key, Users, Plus } from "lucide-react";
import { format } from "date-fns";

interface BetaCode {
  id: string;
  code: string;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  created_at: string;
  expired_at: string | null;
}

interface Redemption {
  id: string;
  user_id: string;
  redeemed_at: string;
  user_email?: string;
}

export function BetaAccessPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeCode, setActiveCode] = useState<BetaCode | null>(null);
  const [recentRedemptions, setRecentRedemptions] = useState<Redemption[]>([]);
  const [newCode, setNewCode] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchBetaData();
  }, []);

  const fetchBetaData = async () => {
    setLoading(true);

    // Fetch active code
    const { data: codeData, error: codeError } = await supabase
      .from("beta_access_codes")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (codeError) {
      console.error("[BetaAccessPanel] Error fetching code:", codeError);
    } else {
      setActiveCode(codeData);
    }

    // Fetch recent redemptions with user emails
    if (codeData) {
      const { data: redemptionData, error: redemptionError } = await supabase
        .from("beta_access_redemptions")
        .select("id, user_id, redeemed_at")
        .eq("code_id", codeData.id)
        .order("redeemed_at", { ascending: false })
        .limit(10);

      if (!redemptionError && redemptionData) {
        // Fetch emails for each user
        const enrichedRedemptions = await Promise.all(
          redemptionData.map(async (r) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("user_id", r.user_id)
              .single();
            return {
              ...r,
              user_email: profile?.email || "Unknown",
            };
          })
        );
        setRecentRedemptions(enrichedRedemptions);
      }
    } else {
      setRecentRedemptions([]);
    }

    setLoading(false);
  };

  const handleCreateCode = async () => {
    if (!newCode.trim()) {
      toast({
        title: "Enter a code",
        description: "Please enter a secret word.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    // First, expire any existing active code
    if (activeCode) {
      const { error: expireError } = await supabase
        .from("beta_access_codes")
        .update({
          is_active: false,
          expired_at: new Date().toISOString(),
        })
        .eq("id", activeCode.id);

      if (expireError) {
        console.error("[BetaAccessPanel] Error expiring old code:", expireError);
        toast({
          title: "Error",
          description: "Failed to expire old code.",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }
    }

    // Create new code
    const { data, error } = await supabase
      .from("beta_access_codes")
      .insert({
        code: newCode.trim().toUpperCase(),
        max_uses: 10,
        current_uses: 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("[BetaAccessPanel] Error creating code:", error);
      toast({
        title: "Error",
        description: "Failed to create code.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Code created",
        description: `New beta code "${data.code}" is now active.`,
      });
      setNewCode("");
      setActiveCode(data);
      setRecentRedemptions([]);
    }

    setCreating(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Beta Access Control
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Beta Access Control
        </CardTitle>
        <CardDescription>
          Manage beta access codes for Call Sheets & Crew Contacts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active Code Display */}
        {activeCode ? (
          <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Word</span>
              <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                {activeCode.code}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Redemptions</span>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">
                  {activeCode.current_uses} / {activeCode.max_uses}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-muted/50 border text-center text-muted-foreground">
            No active beta code. Create one below.
          </div>
        )}

        {/* Recent Redemptions */}
        {recentRedemptions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Recent Redemptions</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {recentRedemptions.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm py-1">
                  <span className="truncate max-w-[200px]">{r.user_email}</span>
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(r.redeemed_at), "MMM d, h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create New Code */}
        <div className="space-y-3 pt-4 border-t">
          <Label htmlFor="newCode">
            {activeCode ? "Replace Active Code" : "Create First Code"}
          </Label>
          <div className="flex gap-2">
            <Input
              id="newCode"
              placeholder="Enter secret word..."
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              className="font-mono"
              disabled={creating}
            />
            <Button onClick={handleCreateCode} disabled={creating || !newCode.trim()}>
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Activate
                </>
              )}
            </Button>
          </div>
          {activeCode && (
            <p className="text-xs text-muted-foreground">
              This will expire the current code and create a new one.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
