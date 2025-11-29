import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, User, Mail, Loader2 } from "lucide-react";
import { useAdminProxy } from "@/contexts/AdminProxyContext";

export default function AdminSubmitExisting() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setAdminProxy } = useAdminProxy();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

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

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Search term required",
        description: "Please enter an email to search for users",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, legal_first_name, legal_last_name, account_type')
        .ilike('email', `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      setUsers(data || []);

      if (!data || data.length === 0) {
        toast({
          title: "No users found",
          description: "Try a different search term",
        });
      }
    } catch (error: any) {
      console.error("[ADMIN_SEARCH_USER] error", error);
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: any) => {
    const fullName = `${user.legal_first_name} ${user.legal_last_name}`;
    setAdminProxy(user.user_id, user.email, fullName);
    
    toast({
      title: "User selected",
      description: `Now submitting as ${fullName}`,
    });

    navigate("/submit");
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="p-8">
            <h1 className="text-2xl font-bold mb-2">Submit for Existing User</h1>
            <p className="text-muted-foreground mb-6">
              Search for an existing user to submit a report on their behalf
            </p>

            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="search">Search by Email</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="search"
                      placeholder="user@example.com"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {users.length > 0 && (
                <div className="space-y-2 mt-6">
                  <Label>Search Results</Label>
                  {users.map((user) => (
                    <Card key={user.user_id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {user.legal_first_name} {user.legal_last_name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-4">
                          {user.account_type}
                        </Badge>
                      </div>
                      <Button onClick={() => handleSelectUser(user)}>
                        Select User
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <Button variant="outline" onClick={() => navigate("/submit")}>
                Back to Submission
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
}
