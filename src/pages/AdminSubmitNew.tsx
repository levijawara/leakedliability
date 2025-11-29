import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAdminProxy } from "@/contexts/AdminProxyContext";

export default function AdminSubmitNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setAdminProxy } = useAdminProxy();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    accountType: "crew" as "crew" | "vendor",
  });

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

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Generate temporary password
      const tempPassword = `Crew${Math.floor(100000 + Math.random() * 900000)}!`;

      // Create user via Supabase Admin API
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          legal_first_name: formData.firstName,
          legal_last_name: formData.lastName,
          account_type: formData.accountType,
        },
      });

      if (createError) throw createError;
      if (!newUser.user) throw new Error("Failed to create user");

      // Create profile entry
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: newUser.user.id,
        email: formData.email,
        legal_first_name: formData.firstName,
        legal_last_name: formData.lastName,
        account_type: formData.accountType,
        created_by_admin: true,
      });

      if (profileError) throw profileError;

      // Set admin proxy mode
      const fullName = `${formData.firstName} ${formData.lastName}`;
      setAdminProxy(newUser.user.id, formData.email, fullName);

      toast({
        title: "User created",
        description: `Now submitting as ${fullName}`,
      });

      navigate("/submit");
    } catch (error: any) {
      console.error("[ADMIN_CREATE_USER] error", error);
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="p-8">
            <h1 className="text-2xl font-bold mb-2">Submit for New User</h1>
            <p className="text-muted-foreground mb-6">
              Create a new user account and submit a report on their behalf
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="firstName">Legal First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>

              <div>
                <Label htmlFor="lastName">Legal Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john.doe@example.com"
                />
              </div>

              <div>
                <Label>Account Type *</Label>
                <RadioGroup
                  value={formData.accountType}
                  onValueChange={(value) => setFormData({ ...formData, accountType: value as "crew" | "vendor" })}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="crew" id="crew" />
                    <Label htmlFor="crew" className="font-normal cursor-pointer">
                      Crew Member
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vendor" id="vendor" />
                    <Label htmlFor="vendor" className="font-normal cursor-pointer">
                      Vendor
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button variant="outline" onClick={() => navigate("/submit")}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating User...
                  </>
                ) : (
                  "Create User & Continue"
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
}
