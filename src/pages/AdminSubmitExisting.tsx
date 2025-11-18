import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function AdminSubmitExisting() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.rpc('has_role', { 
        _user_id: user.id, 
        _role: 'admin' 
      });

      if (error || !data) {
        toast({
          title: "Access Denied",
          description: "Admin privileges required.",
          variant: "destructive",
        });
        navigate("/");
      }
    };

    checkAdmin();
  }, [navigate, toast]);

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="p-8">
            <h1 className="text-2xl font-bold mb-4">Submit for Existing User</h1>
            <p className="text-muted-foreground">
              Admin proxy submission for existing users - coming soon.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
