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
import { Loader2, LogOut, User as UserIcon, Shield, CheckCircle, Clock, Search } from "lucide-react";
import { LeaderboardAccessStatus } from "@/components/LeaderboardAccessStatus";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { ProducerSearchAutocomplete } from "@/components/ProducerSearchAutocomplete";

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

interface ClaimedProducer {
  id: string;
  name: string;
  company: string | null;
  stripe_verification_status: string | null;
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
  const [claimedProducer, setClaimedProducer] = useState<ClaimedProducer | null>(null);
  const [loadingClaim, setLoadingClaim] = useState(false);

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
      await fetchClaimedProducer(session.user.id);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const fetchClaimedProducer = async (userId: string) => {
    setLoadingClaim(true);
    const { data, error } = await supabase
      .from("producers")
      .select("id, name, company, stripe_verification_status")
      .eq("claimed_by_user_id", userId)
      .maybeSingle();

    if (!error && data) {
      setClaimedProducer(data);
    }
    setLoadingClaim(false);
  };

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
    const { data: submissionsData, error: submissionsError } = await supabase
      .from("submissions")
      .select("submission_type")
      .eq("user_id", userId);

    if (submissionsError) {
      console.error("Failed to load submission stats:", submissionsError);
      return;
    }

    // Query payment_confirmations table
    const { data: confirmationsData, error: confirmationsError } = await supabase
      .from("payment_confirmations")
      .select("id")
      .eq("confirmer_id", userId);

    if (confirmationsError) {
      console.error("Failed to load payment confirmations:", confirmationsError);
    }

    const counts: SubmissionStats = {
      crew_report: 0,
      payment_confirmation: confirmationsData?.length || 0,
      counter_dispute: 0,
      payment_documentation: 0,
      report_explanation: 0,
      report_dispute: 0,
    };

    // Count other submission types from submissions table
    submissionsData?.forEach((submission) => {
      const type = submission.submission_type as keyof SubmissionStats;
      if (type in counts && type !== 'payment_confirmation') {
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

          {/* Claim Producer Profile Card - Only for producer/production_company accounts */}
          {(profile?.account_type === 'producer' || profile?.account_type === 'production_company') && (
            <Card className="mt-6 border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Claim Your Producer Profile</CardTitle>
                    <CardDescription>
                      Verify your identity to claim ownership of your official leaderboard profile
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingClaim ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : claimedProducer ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{claimedProducer.name}</p>
                          {claimedProducer.company && (
                            <p className="text-sm text-muted-foreground">{claimedProducer.company}</p>
                          )}
                        </div>
                        {claimedProducer.stripe_verification_status === 'verified' ? (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified Owner
                          </Badge>
                        ) : claimedProducer.stripe_verification_status === 'pending' ? (
                          <Badge variant="outline" className="text-orange-500 border-orange-500/20">
                            <Clock className="h-3 w-3 mr-1" />
                            Verification in Progress
                          </Badge>
                        ) : claimedProducer.stripe_verification_status === 'pending_admin' ? (
                          <Badge variant="outline" className="text-yellow-500 border-yellow-500/20">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending Admin Review
                          </Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => navigate(`/claim/${claimedProducer.id}`)}
                          >
                            Complete Verification
                          </Button>
                        )}
                      </div>
                    </div>
                    {claimedProducer.stripe_verification_status === 'verified' && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate('/producer-dashboard')}
                      >
                        Go to Producer Dashboard
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Search for your name or company to find your profile and start the verification process.
                    </p>
                    <ProducerSearchAutocomplete 
                      placeholder="Search for your name or company..."
                      source="profile_claim"
                    />
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
                      <Search className="h-4 w-4 mt-0.5 shrink-0" />
                      <p>
                        Identity verification requires a valid government ID and a matching selfie. 
                        This helps protect your reputation on the leaderboard.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
      
      <Footer />
    </div>
  );
};

export default Profile;
