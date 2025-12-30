import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, CheckCircle, Clock, AlertTriangle, User, Building2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { getStripeInstance, isStripeAvailable, validateStripeConfig } from "@/lib/stripeHelpers";

interface Producer {
  id: string;
  name: string;
  company: string | null;
  is_placeholder: boolean | null;
  has_claimed_account: boolean | null;
  stripe_verification_status: string | null;
  claimed_by_user_id: string | null;
}

export default function ClaimProducer() {
  const { producerId } = useParams<{ producerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [producer, setProducer] = useState<Producer | null>(null);
  const [user, setUser] = useState<any>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [stripeAvailable, setStripeAvailable] = useState(true);
  const [stripeError, setStripeError] = useState<string | null>(null);

  // Check Stripe availability on mount
  useEffect(() => {
    const available = isStripeAvailable();
    setStripeAvailable(available);
    
    if (!available) {
      const config = validateStripeConfig();
      const issues = config.issues?.join(", ") || "Configuration error";
      setStripeError(`Payment system error: ${issues}`);
      console.error("[ClaimProducer] Stripe not available:", issues);
    }
  }, []);

  useEffect(() => {
    checkAuthAndLoadProducer();
  }, [producerId]);

  const checkAuthAndLoadProducer = async () => {
    try {
      // Check authentication
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        // Redirect to auth with return URL
        navigate(`/auth?redirect=/claim/${producerId}`);
        return;
      }
      
      setUser(currentUser);

      // Load producer details
      const { data: producerData, error: producerError } = await supabase
        .from("producers")
        .select("id, name, company, is_placeholder, has_claimed_account, stripe_verification_status, claimed_by_user_id")
        .eq("id", producerId)
        .single();

      if (producerError || !producerData) {
        toast({
          title: "Producer Not Found",
          description: "This producer profile doesn't exist.",
          variant: "destructive",
        });
        navigate("/leaderboard");
        return;
      }

      setProducer(producerData);

      // Check subscription status
      setCheckingSubscription(true);
      const { data: entitlement } = await supabase
        .from("user_entitlements")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("status", "active")
        .in("subscription_tier", ["producer_t1", "producer_t2"])
        .maybeSingle();

      setHasSubscription(!!entitlement);
      setCheckingSubscription(false);

    } catch (error: any) {
      console.error("Error loading claim page:", error);
      toast({
        title: "Error",
        description: "Failed to load producer profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartVerification = async () => {
    if (!producer || !user) return;

    // Check Stripe availability before proceeding
    if (!isStripeAvailable()) {
      toast({
        title: "Payment System Unavailable",
        description: "Stripe is not configured. Payment and verification features are currently unavailable.",
        variant: "destructive",
      });
      console.error("[ClaimProducer] Stripe not available - cannot start verification");
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-identity-verification-session", {
        body: { producer_id: producer.id },
      });

      if (error) throw error;

      if (data.error) {
        if (data.redirect_url) {
          // Need subscription first
          toast({
            title: "Subscription Required",
            description: "Please subscribe to a producer plan before verifying your identity.",
          });
          navigate(data.redirect_url);
          return;
        }
        throw new Error(data.error);
      }

      // Load Stripe and start identity verification
      const { stripe, error: stripeError } = await getStripeInstance();
      
      if (!stripe || stripeError) {
        toast({
          title: "Payment System Error",
          description: stripeError || "Failed to initialize payment system. Please try again later.",
          variant: "destructive",
        });
        console.error("[ClaimProducer] Stripe initialization failed:", stripeError);
        return;
      }

      const { error: verifyError } = await stripe.verifyIdentity(data.client_secret);
      
      if (verifyError) {
        console.error("Stripe verification error:", verifyError);
        toast({
          title: "Verification Cancelled",
          description: "Identity verification was cancelled or failed.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Verification Submitted",
          description: "Your identity verification is being processed. This may take a few minutes.",
        });
        // Reload producer data to get updated status
        await checkAuthAndLoadProducer();
      }

    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start identity verification.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const getStatusDisplay = () => {
    if (!producer) return null;

    if (producer.has_claimed_account && producer.stripe_verification_status === "verified") {
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-green-500">Profile Verified</h3>
            {producer.claimed_by_user_id === user?.id ? (
              <p className="text-muted-foreground mt-2">
                You own this profile. Manage it from your producer dashboard.
              </p>
            ) : (
              <p className="text-muted-foreground mt-2">
                This profile has already been claimed by another user.
              </p>
            )}
          </div>
          {producer.claimed_by_user_id === user?.id && (
            <Button onClick={() => navigate("/producer-dashboard")}>
              Go to Dashboard
            </Button>
          )}
        </div>
      );
    }

    if (producer.stripe_verification_status === "pending") {
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-orange-500/20 flex items-center justify-center">
            <Clock className="h-8 w-8 text-orange-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-orange-500">Verification In Progress</h3>
            <p className="text-muted-foreground mt-2">
              Your identity verification is being processed. This usually takes a few minutes.
            </p>
          </div>
          <Button variant="outline" onClick={() => checkAuthAndLoadProducer()}>
            <Loader2 className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </div>
      );
    }

    if (producer.stripe_verification_status === "pending_admin") {
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-yellow-500">Pending Admin Review</h3>
            <p className="text-muted-foreground mt-2">
              Your identity has been verified but requires manual review. Our team will process this within 24-48 hours.
            </p>
          </div>
        </div>
      );
    }

    if (producer.stripe_verification_status === "rejected") {
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-red-500">Verification Rejected</h3>
            <p className="text-muted-foreground mt-2">
              Your identity verification was not approved. You may try again with valid identification.
            </p>
          </div>
          <Button onClick={handleStartVerification} disabled={verifying}>
            {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
            Try Again
          </Button>
        </div>
      );
    }

    // Unverified - show claim button
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Claim This Profile</h3>
          <p className="text-muted-foreground mt-2">
            Verify your identity to claim ownership of this producer profile. You'll need a valid government-issued ID.
          </p>
        </div>
        
        {!hasSubscription ? (
          <div className="space-y-3">
            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
              Producer Subscription Required
            </Badge>
            <Button onClick={() => navigate(`/subscribe?returnTo=/claim/${producerId}`)}>
              Subscribe to Claim
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button 
              onClick={handleStartVerification} 
              disabled={verifying || !stripeAvailable}
              size="lg"
              className="gap-2"
            >
              {verifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              {!stripeAvailable ? "Verification Unavailable" : "Start Identity Verification"}
            </Button>
            {!stripeAvailable && (
              <p className="text-sm text-muted-foreground text-center">
                Payment system configuration required for identity verification.
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading || checkingSubscription) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </>
    );
  }

  if (!producer) {
    return null;
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card className="p-8">
          {/* Stripe Configuration Warning */}
          {!stripeAvailable && (
            <Card className="mb-6 border-status-warning/50 bg-status-warning/10">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-status-warning flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2">
                      Payment System Unavailable
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {stripeError || "Stripe payment processing is not configured. Identity verification is currently unavailable."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Producer Info Header */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              {producer.company ? (
                <Building2 className="h-7 w-7 text-muted-foreground" />
              ) : (
                <User className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{producer.name}</h1>
              {producer.company && (
                <p className="text-muted-foreground">{producer.company}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {producer.is_placeholder && (
                  <Badge variant="outline" className="text-xs">Unclaimed Profile</Badge>
                )}
                {producer.stripe_verification_status && producer.stripe_verification_status !== "unverified" && (
                  <Badge 
                    variant="outline" 
                    className={
                      producer.stripe_verification_status === "verified" 
                        ? "text-green-500 border-green-500" 
                        : producer.stripe_verification_status === "pending"
                        ? "text-orange-500 border-orange-500"
                        : producer.stripe_verification_status === "pending_admin"
                        ? "text-yellow-500 border-yellow-500"
                        : "text-red-500 border-red-500"
                    }
                  >
                    {producer.stripe_verification_status === "verified" && "✓ Verified"}
                    {producer.stripe_verification_status === "pending" && "Verifying..."}
                    {producer.stripe_verification_status === "pending_admin" && "Pending Review"}
                    {producer.stripe_verification_status === "rejected" && "Rejected"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Status / Action Area */}
          {getStatusDisplay()}
        </Card>
      </div>
      <Footer />
    </>
  );
}
