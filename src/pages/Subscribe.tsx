import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Check, Zap, DollarSign } from "lucide-react";
import { toast } from "sonner";

type UserRole = "crew" | "producer";
type BillingFrequency = "monthly" | "annual";

const Subscribe = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole>("crew");
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (tier: string) => {
    try {
      setLoading(tier);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please sign in to subscribe");
        navigate("/auth");
        return;
      }

      // Get returnTo param for post-checkout redirect (e.g., from ClaimProducer)
      const searchParams = new URLSearchParams(window.location.search);
      const returnTo = searchParams.get('returnTo');

      const { data, error } = await supabase.functions.invoke('create-leaderboard-checkout', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          tier,
          billing_frequency: billingFrequency,
          return_to: returnTo // Pass to checkout for success URL
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success("Checkout opened in new tab");
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error("Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  const getPrice = (tier: string) => {
    const prices: Record<string, { monthly: string; annual: string }> = {
      crew_t1: { monthly: "$5.99", annual: "$50.00" },
      producer_t1: { monthly: "$5.99", annual: "$50.00" },
      producer_t2: { monthly: "$9.99", annual: "$80.00" },
    };
    return prices[tier][billingFrequency];
  };

  const getAnnualSavings = (tier: string) => {
    const monthlyCosts: Record<string, number> = {
      crew_t1: 5.99 * 12,
      producer_t1: 5.99 * 12,
      producer_t2: 9.99 * 12,
    };
    const annualCosts: Record<string, number> = {
      crew_t1: 50.00,
      producer_t1: 50.00,
      producer_t2: 80.00,
    };
    const savings = monthlyCosts[tier] - annualCosts[tier];
    return savings.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Navigation />
      
      <div className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Get full access to the leaderboard, PSCS scores, and payment histories
            </p>

            {/* Role Selection */}
            <div className="flex justify-center gap-4 mb-8">
              <Button
                variant={selectedRole === "crew" ? "default" : "outline"}
                onClick={() => setSelectedRole("crew")}
                className="px-8 py-6 text-lg"
              >
                Crew / Vendor
              </Button>
              <Button
                variant={selectedRole === "producer" ? "default" : "outline"}
                onClick={() => setSelectedRole("producer")}
                className="px-8 py-6 text-lg"
              >
                Producer / Company
              </Button>
            </div>

            {/* Billing Frequency Toggle */}
            <div className="flex justify-center items-center gap-4 mb-8">
              <Button
                variant={billingFrequency === "monthly" ? "default" : "ghost"}
                onClick={() => setBillingFrequency("monthly")}
                size="lg"
              >
                Monthly
              </Button>
              <Button
                variant={billingFrequency === "annual" ? "default" : "ghost"}
                onClick={() => setBillingFrequency("annual")}
                size="lg"
              >
                Annual
                <Badge variant="secondary" className="ml-2 bg-green-600">
                  Save up to 33%
                </Badge>
              </Button>
            </div>
          </div>

          {/* Tier Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Crew/Vendor Tier 1 */}
            {selectedRole === "crew" && (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-2xl">Crew/Vendor Access</CardTitle>
                  <CardDescription className="text-gray-400">
                    Full leaderboard access for industry professionals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{getPrice("crew_t1")}</span>
                    <span className="text-gray-400">/{billingFrequency === "monthly" ? "mo" : "yr"}</span>
                    {billingFrequency === "annual" && (
                      <p className="text-sm text-green-500 mt-2">
                        Save ${getAnnualSavings("crew_t1")} per year
                      </p>
                    )}
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Full leaderboard access</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>View all PSCS scores</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Payment timelines & histories</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Producer profiles & analytics</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe("crew_t1")}
                    disabled={loading === "crew_t1"}
                  >
                    {loading === "crew_t1" ? "Loading..." : "Subscribe Now"}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Producer Tier 1 */}
            {selectedRole === "producer" && (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">Producer Tier 1</CardTitle>
                    <DollarSign className="w-6 h-6 text-gray-400" />
                  </div>
                  <CardDescription className="text-gray-400">
                    NET30 PSCS updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{getPrice("producer_t1")}</span>
                    <span className="text-gray-400">/{billingFrequency === "monthly" ? "mo" : "yr"}</span>
                    {billingFrequency === "annual" && (
                      <p className="text-sm text-green-500 mt-2">
                        Save ${getAnnualSavings("producer_t1")} per year
                      </p>
                    )}
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Full leaderboard access</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>View all PSCS scores</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>NET30 score updates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Producer dashboard access</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe("producer_t1")}
                    disabled={loading === "producer_t1"}
                  >
                    {loading === "producer_t1" ? "Loading..." : "Subscribe Now"}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Producer Tier 2 */}
            {selectedRole === "producer" && (
              <Card className="bg-gray-900 border-green-600 border-2 relative">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600">
                  RECOMMENDED
                </Badge>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">Producer Tier 2</CardTitle>
                    <Zap className="w-6 h-6 text-green-500" />
                  </div>
                  <CardDescription className="text-gray-400">
                    Instant PSCS updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{getPrice("producer_t2")}</span>
                    <span className="text-gray-400">/{billingFrequency === "monthly" ? "mo" : "yr"}</span>
                    {billingFrequency === "annual" && (
                      <p className="text-sm text-green-500 mt-2">
                        Save ${getAnnualSavings("producer_t2")} per year
                      </p>
                    )}
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Everything in Tier 1</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Zap className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="font-semibold">Instant PSCS updates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Priority support</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Advanced analytics</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => handleSubscribe("producer_t2")}
                    disabled={loading === "producer_t2"}
                  >
                    {loading === "producer_t2" ? "Loading..." : "Subscribe Now"}
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>

          {/* Trust Badges */}
          <div className="mt-12 text-center text-gray-400">
            <p className="mb-4 text-sm">
              ✓ Cancel anytime • ✓ No long-term contracts • ✓ Secure payments via Stripe
            </p>
            <p className="text-xs">
              By subscribing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Subscribe;
