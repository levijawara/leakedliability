import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Power, PowerOff, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [blurNamesForPublic, setBlurNamesForPublic] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user has admin role via secure function
      const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (error || !data) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadAdminData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    // Load site settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("*")
      .single();
    
    if (settings) {
      setMaintenanceMode(settings.maintenance_mode);
      setMaintenanceMessage(settings.maintenance_message || "");
      setBlurNamesForPublic(settings.blur_names_for_public ?? true);
      setSettingsId(settings.id);
    }
  };

  const toggleMaintenanceMode = async () => {
    if (!settingsId) return;

    const newMode = !maintenanceMode;
    const { error } = await supabase
      .from("site_settings")
      .update({ 
        maintenance_mode: newMode,
        maintenance_message: maintenanceMessage || "We're making improvements! Check back soon 🛠️"
      })
      .eq("id", settingsId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setMaintenanceMode(newMode);
    toast({
      title: "Maintenance Mode " + (newMode ? "Enabled" : "Disabled"),
      description: newMode 
        ? "Site is now in maintenance mode. Only admins can access it." 
        : "Site is now accessible to everyone.",
    });
  };

  const toggleBlurNames = async () => {
    if (!settingsId) return;

    const newBlur = !blurNamesForPublic;
    const { error } = await supabase
      .from("site_settings")
      .update({ blur_names_for_public: newBlur })
      .eq("id", settingsId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setBlurNamesForPublic(newBlur);
    toast({
      title: "Name Blur " + (newBlur ? "Enabled" : "Disabled"),
      description: newBlur 
        ? "Producer names are now blurred for non-admin users on the leaderboard." 
        : "Producer names are now visible to everyone on the leaderboard.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      {maintenanceMode && (
        <Card className="p-4 mb-6 bg-warning/10 border-warning">
          <div className="flex items-center gap-2">
            <PowerOff className="h-5 w-5 text-warning" />
            <span className="font-medium">Maintenance Mode Active</span>
          </div>
        </Card>
      )}

      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="maintenance-mode" className="text-base flex items-center gap-2">
                {maintenanceMode ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                Maintenance Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Restrict site access to admins only
              </p>
            </div>
            <Switch
              id="maintenance-mode"
              checked={maintenanceMode}
              onCheckedChange={toggleMaintenanceMode}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="blur-names" className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Blur Names for Non-Admins
              </Label>
              <p className="text-sm text-muted-foreground">
                Hide producer names on the leaderboard for non-admin users
              </p>
            </div>
            <Switch
              id="blur-names"
              checked={blurNamesForPublic}
              onCheckedChange={toggleBlurNames}
            />
          </div>
        </div>
      </Card>

      <Tabs defaultValue="crew_report" className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="crew_report" className="text-xs sm:text-sm">
            ⚠️ <span className="hidden sm:inline ml-1">Crew Report</span>
          </TabsTrigger>
          <TabsTrigger value="payment_confirmation" className="text-xs sm:text-sm">
            ✅ <span className="hidden sm:inline ml-1">Payment</span>
          </TabsTrigger>
          <TabsTrigger value="counter_dispute" className="text-xs sm:text-sm">
            ‼️ <span className="hidden sm:inline ml-1">Counter</span>
          </TabsTrigger>
          <TabsTrigger value="payment_documentation" className="text-xs sm:text-sm">
            🧾 <span className="hidden sm:inline ml-1">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="report_explanation" className="text-xs sm:text-sm">
            ☮️ <span className="hidden sm:inline ml-1">Explain</span>
          </TabsTrigger>
          <TabsTrigger value="report_dispute" className="text-xs sm:text-sm">
            ⁉️ <span className="hidden sm:inline ml-1">Dispute</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crew_report">
          <Card className="p-6">
            <p className="text-muted-foreground">Crew Report submissions will appear here</p>
          </Card>
        </TabsContent>

        <TabsContent value="payment_confirmation">
          <Card className="p-6">
            <p className="text-muted-foreground">Payment confirmations will appear here</p>
          </Card>
        </TabsContent>

        <TabsContent value="counter_dispute">
          <Card className="p-6">
            <p className="text-muted-foreground">Counter disputes will appear here</p>
          </Card>
        </TabsContent>

        <TabsContent value="payment_documentation">
          <Card className="p-6">
            <p className="text-muted-foreground">Payment documentation will appear here</p>
          </Card>
        </TabsContent>

        <TabsContent value="report_explanation">
          <Card className="p-6">
            <p className="text-muted-foreground">Report explanations will appear here</p>
          </Card>
        </TabsContent>

        <TabsContent value="report_dispute">
          <Card className="p-6">
            <p className="text-muted-foreground">Report disputes will appear here</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
