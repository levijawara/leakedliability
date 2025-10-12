import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogOut, User as UserIcon } from "lucide-react";
import { LeaderboardAccessStatus } from "@/components/LeaderboardAccessStatus";

interface Profile {
  account_type: string;
  legal_first_name: string;
  legal_last_name: string;
  business_name: string | null;
}

interface SubmissionStats {
  crew_report: number;
  payment_confirmation: number;
  counter_dispute: number;
  payment_documentation: number;
  report_explanation: number;
  report_dispute: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submissionStats, setSubmissionStats] = useState<SubmissionStats>({
    crew_report: 0,
    payment_confirmation: 0,
    counter_dispute: 0,
    payment_documentation: 0,
    report_explanation: 0,
    report_dispute: 0,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      await fetchProfile(session.user.id);
      await fetchSubmissionStats(session.user.id);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
      return;
    }

    setProfile(data);
  };

  const fetchSubmissionStats = async (userId: string) => {
    const { data, error } = await supabase
      .from("submissions")
      .select("submission_type")
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to load submission stats:", error);
      return;
    }

    const counts: SubmissionStats = {
      crew_report: 0,
      payment_confirmation: 0,
      counter_dispute: 0,
      payment_documentation: 0,
      report_explanation: 0,
      report_dispute: 0,
    };

    data?.forEach((submission) => {
      const type = submission.submission_type as keyof SubmissionStats;
      if (type in counts) {
        counts[type]++;
      }
    });

    setSubmissionStats(counts);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setSaving(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({
        legal_first_name: profile.legal_first_name,
        legal_last_name: profile.legal_last_name,
        business_name: profile.business_name,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Profile updated successfully",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>{user?.email}</CardDescription>
                  </div>
                </div>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Input
                    value={profile?.account_type.replace(/_/g, ' ').toUpperCase() || ""}
                    disabled
                    className="capitalize"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Legal First Name</Label>
                    <Input
                      id="firstName"
                      value={profile?.legal_first_name || ""}
                      onChange={(e) => setProfile(prev => prev ? {...prev, legal_first_name: e.target.value} : null)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Legal Last Name</Label>
                    <Input
                      id="lastName"
                      value={profile?.legal_last_name || ""}
                      onChange={(e) => setProfile(prev => prev ? {...prev, legal_last_name: e.target.value} : null)}
                      required
                    />
                  </div>
                </div>

                {profile?.account_type === 'production_company' && (
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Official Business Name</Label>
                    <Input
                      id="businessName"
                      value={profile?.business_name || ""}
                      onChange={(e) => setProfile(prev => prev ? {...prev, business_name: e.target.value} : null)}
                    />
                  </div>
                )}

                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Leaderboard Access</CardTitle>
              <CardDescription>Your current access status</CardDescription>
            </CardHeader>
            <CardContent>
              <LeaderboardAccessStatus />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Submission Statistics</CardTitle>
              <CardDescription>Your submission counts across all types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Crew Member Reports ⚠️</div>
                  <div className="text-2xl font-bold">{submissionStats.crew_report}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Payment Documentations 🧾</div>
                  <div className="text-2xl font-bold">{submissionStats.payment_documentation}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Payment Confirmations ✅</div>
                  <div className="text-2xl font-bold">{submissionStats.payment_confirmation}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Report Explanations ☮️</div>
                  <div className="text-2xl font-bold">{submissionStats.report_explanation}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Counter-Disputes ‼️</div>
                  <div className="text-2xl font-bold">{submissionStats.counter_dispute}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Report Disputes ⁉️</div>
                  <div className="text-2xl font-bold">{submissionStats.report_dispute}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
