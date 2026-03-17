import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Check, Zap, DollarSign, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { isStripeAvailable, getStripeInstance } from "@/lib/stripeHelpers";
import { validateStripeConfig } from "@/config/env";
import { checkStripeHealth } from "@/lib/stripeHealthCheck";
import { WageShieldPreview } from "@/components/WageShieldPreview";

type UserRole = "crew" | "producer";
type BillingFrequency = "monthly" | "annual";

const Subscribe = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole>("crew");
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [stripeAvailable, setStripeAvailable] = useState(true);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminStripeErrors, setAdminStripeErrors] = useState<string[]>([]);
  const [healthCheckComplete, setHealthCheckComplete] = useState(false);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase.rpc('has_role', {
            _user_id: user.id,
            _role: 'admin'
          });
          if (!error && data) {
            setIsAdmin(true);
          }
        }
      } catch (error) {
        console.error("[Subscribe] Admin check failed:", error);
      }
    };
    checkAdmin();
  }, []);

  // Comprehensive Stripe self-test on mount
  useEffect(() => {
    const runStripeSelfTest = async () => {
      const errors: string[] = [];
      
      try {
        // 1. Check publishable key
        const config = validateStripeConfig();
        if (!config.configured) {
          const issues = config.issues?.join(", ") || "Configuration error";
          const errorMsg = `VITE_STRIPE_PUBLISHABLE_KEY: ${issues}`;
          errors.push(errorMsg);
          setStripeError(errorMsg);
          setStripeAvailable(false);
          if (isAdmin) {
            setAdminStripeErrors([...errors]);
          }
          setHealthCheckComplete(true);
          return;
        }

        // 2. Test Stripe initialization
        const { stripe, error: initError, configured } = await getStripeInstance();
        if (!configured || !stripe || initError) {
          const errorMsg = `Stripe initialization failed: ${initError || "Unknown error"}`;
          errors.push(errorMsg);
          setStripeError(errorMsg);
          setStripeAvailable(false);
          if (isAdmin) {
            setAdminStripeErrors([...errors]);
          }
          setHealthCheckComplete(true);
          return;
        }

        // 3. Stripe instance is valid if we got here
        // The Stripe.js API has changed - publishableKey and redirectToCheckout
        // are not directly accessible properties on the Stripe instance
        // The fact that we got a stripe instance means it's properly initialized

        // 5. Run comprehensive health check
        const health = await checkStripeHealth();
        if (!health.healthy) {
          errors.push(...health.errors);
          if (isAdmin) {
            setAdminStripeErrors([...errors]);
          }
        }

        // 6. Test server-side health check endpoint
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data: healthData, error: healthError } = await supabase.functions.invoke('stripe-health-check', {
              headers: { Authorization: `Bearer ${session.access_token}` }
            });
            
            if (healthError) {
              const errorMsg = `Server health check failed: ${healthError.message}`;
              errors.push(errorMsg);
              if (isAdmin) {
                setAdminStripeErrors(prev => [...prev, errorMsg]);
              }
            } else if (healthData && !healthData.healthy) {
              const serverErrors = healthData.errors || [];
              errors.push(...serverErrors);
              if (isAdmin) {
                setAdminStripeErrors(prev => [...prev, ...serverErrors]);
              }
            }
          }
        } catch (healthCheckError: any) {
          const errorMsg = `Health check endpoint error: ${healthCheckError?.message || "Unknown error"}`;
          errors.push(errorMsg);
          if (isAdmin) {
            setAdminStripeErrors(prev => [...prev, errorMsg]);
          }
        }

        // Set final state
        if (errors.length > 0) {
          setStripeAvailable(false);
          setStripeError(errors[0]); // Show first error to all users
          if (isAdmin) {
            setAdminStripeErrors(errors);
          }
        } else {
          setStripeAvailable(true);
          setStripeError(null);
        }
      } catch (error: any) {
        const errorMsg = `Stripe self-test exception: ${error?.message || "Unknown error"}`;
        console.error("[Subscribe] Stripe self-test failed:", error);
        setStripeAvailable(false);
        setStripeError(errorMsg);
        if (isAdmin) {
          setAdminStripeErrors([errorMsg]);
        }
      } finally {
        setHealthCheckComplete(true);
      }
    };

    runStripeSelfTest();
  }, [isAdmin]);

  const handleSubscribe = async (tier: string) => {
    // Check Stripe before proceeding
    if (!stripeAvailable) {
      toast.error("Payment system is currently unavailable. Please contact support.");
      return;
    }

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
          {/* Admin-Only Stripe Misconfiguration Alert */}
          {isAdmin && adminStripeErrors.length > 0 && (
            <Card className="mb-8 border-2 border-red-600 bg-red-950/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2 text-red-600">
                      ⚠️ STRIPE IS MISCONFIGURED — INVESTIGATE IMMEDIATELY
                    </h3>
                    <p className="text-sm text-red-400 mb-3 font-semibold">
                      The following Stripe checks failed:
                    </p>
                    <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-red-300">
                      {adminStripeErrors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-red-400 italic">
                      This alert is only visible to admin accounts. Payment features are blocked until resolved.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Public Stripe Configuration Warning */}
          {!stripeAvailable && healthCheckComplete && (
            <Card className="mb-8 border-status-warning/50 bg-status-warning/10">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-status-warning flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2 text-foreground">
                      Payment System Unavailable
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {stripeError || "Stripe payment processing is not configured."}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Subscription purchases are currently unavailable. Please contact support or try again later.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Active payment protection + full leaderboard access
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
            {/* Crew/Vendor Tier 1 + Wage Shield */}
            {selectedRole === "crew" && (
              <>
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-2xl">Crew/Vendor Access</CardTitle>
                    <CardDescription className="text-gray-400">
                      Active payment protection + full leaderboard access
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
                      disabled={loading === "crew_t1" || !stripeAvailable}
                    >
                      {loading === "crew_t1"
                        ? "Loading..."
                        : !stripeAvailable
                          ? "Unavailable"
                          : "Activate Wage Shield"}
                    </Button>
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      Most crew wait months before taking action. Producers count on that.
                    </p>
                  </CardFooter>
                </Card>

                <WageShieldPreview />
              </>
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
                    disabled={loading === "producer_t1" || !stripeAvailable}
                  >
                    {loading === "producer_t1" ? "Loading..." : !stripeAvailable ? "Unavailable" : "Subscribe Now"}
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
                    disabled={loading === "producer_t2" || !stripeAvailable}
                  >
                    {loading === "producer_t2" ? "Loading..." : !stripeAvailable ? "Unavailable" : "Subscribe Now"}
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
