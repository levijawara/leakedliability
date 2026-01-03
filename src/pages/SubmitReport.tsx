import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, ArrowLeft, ArrowRight, TrendingUp, CheckCircle2, Building2, Scale, Trophy, Shield } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { SubmissionWalkthrough } from "@/components/submission/SubmissionWalkthrough";
import { ParticipantTypeSelector } from "@/components/submission/ParticipantTypeSelector";
import { CrewIdentification } from "@/components/submission/CrewIdentification";
import { ProducerIdentification } from "@/components/submission/ProducerIdentification";
import { SubmissionTypeSelector } from "@/components/submission/SubmissionTypeSelector";
import { CrewReportForm } from "@/components/submission/CrewReportForm";
import { PaymentConfirmationForm } from "@/components/submission/PaymentConfirmationForm";
import { CounterDisputeForm } from "@/components/submission/CounterDisputeForm";
import { ProducerSubmissionForm } from "@/components/submission/ProducerSubmissionForm";
import { VendorIdentification } from "@/components/submission/VendorIdentification";
import { VendorReportForm } from "@/components/submission/VendorReportForm";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import { useAdminProxy } from "@/contexts/AdminProxyContext";

export default function SubmitReport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { adminMode, adminId, actingAsUserId, actingAsUserEmail, actingAsUserName, clearAdminProxy } = useAdminProxy();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [participantType, setParticipantType] = useState<"crew" | "producer" | "production_company" | "vendor" | null>(null);
  const [submissionType, setSubmissionType] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>({ firstName: "", lastName: "", email: "", role: "" });
  const [prefilledReportId, setPrefilledReportId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Check admin status
        const { data: adminData } = await supabase.rpc('has_role', { 
          _user_id: session.user.id, 
          _role: 'admin' 
        });
        setIsAdmin(Boolean(adminData));
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
      
      setLoading(false);
    };

    checkAuth();

    // Check for reportId URL parameter
    const searchParams = new URLSearchParams(window.location.search);
    const reportIdParam = searchParams.get('reportId');
    if (reportIdParam) {
      setPrefilledReportId(reportIdParam);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        checkAuth();
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  // Pre-fill user info when in admin mode
  useEffect(() => {
    if (adminMode && actingAsUserEmail && actingAsUserName) {
      const [firstName, ...lastNameParts] = actingAsUserName.split(' ');
      setUserInfo({
        firstName: firstName || "",
        lastName: lastNameParts.join(' ') || "",
        email: actingAsUserEmail,
        role: ""
      });
    }
  }, [adminMode, actingAsUserEmail, actingAsUserName]);

  const handleBack = () => setStep(Math.max(1, step - 1));
  const handleNext = () => setStep(step + 1);

  const resetForm = () => {
    setStep(1);
    setParticipantType(null);
    setSubmissionType(null);
    setUserInfo(participantType === "vendor" 
      ? { vendorCompany: "", vendorDBA: "", vendorWebsite: "", contactName: "", contactEmail: "", contactPhone: "", vendorType: "", vendorTypeOther: "" }
      : { firstName: "", lastName: "", email: "", role: "" }
    );
    clearAdminProxy();
  };

  // Generate admin metadata for form submissions
  const getAdminMetadata = () => {
    if (!adminMode || !adminId || !actingAsUserId) return undefined;
    return {
      createdByAdmin: true,
      adminCreatorId: adminId,
      reporterId: actingAsUserId
    };
  };

  // Check if user needs to be authenticated for current step
  const requiresAuthForStep = (currentStep: number): boolean => {
    // Steps 1-2 (walkthrough and participant type) don't require auth
    // Step 3+ (identification and submission) require auth
    return currentStep >= 3;
  };

  // Handle navigation with auth check
  const handleNextWithAuthCheck = async () => {
    if (requiresAuthForStep(step + 1) && !isAuthenticated) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to continue with your submission",
        variant: "destructive",
      });
      // Redirect to auth with return path
      // Use helper to create redirect URL with context
      const { createRedirectUrl } = await import("@/lib/authRedirectHelpers");
      const currentPath = window.location.pathname + window.location.search;
      navigate(createRedirectUrl(currentPath));
      return;
    }
    handleNext();
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {adminMode && (
            <Card className="p-4 mb-6 bg-primary/10 border-primary">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="font-semibold text-primary">Admin Mode Active</p>
                  <p className="text-sm text-muted-foreground">
                    Submitting on behalf of: <span className="font-medium">{actingAsUserName}</span> ({actingAsUserEmail})
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-black mb-3">Submission Forms</h1>
            <p className="text-muted-foreground">
              Report | Document | Dispute | Explain | Confirm
            </p>
          </div>

          <Accordion type="multiple" className="space-y-4 mb-6">
            <AccordionItem value="identity" className="border-l-4 border-status-warning bg-status-warning/10 rounded-lg overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-status-warning flex-shrink-0" />
                  <h3 className="text-lg font-bold">Identity Protection</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="text-sm space-y-2">
                  <p className="text-muted-foreground">
                    <strong>Crew members:</strong> your identity is well-protected unless you choose to reveal it. <strong>Vendors:</strong> your business contact info is required and will appear on verified reports (standard B2B accountability).
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Reports filed under fake names will be rejected.</strong> Crew identities are private unless you choose to reveal them. Vendors must include business info. Leaked Liability™ is a legal-grade platform, not a gossip hotline.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pscs" className="border-l-4 border-blue-500 bg-blue-500/10 rounded-lg overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-blue-500 flex-shrink-0" />
                  <h3 className="text-lg font-bold">Producing Social Credit Score (PSCS)</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-sm text-muted-foreground">
                  Every confirmed debt affects the producer's <strong>PSCS</strong>. Paid debts start a 30-day recovery window. A producer's score affects how they appear on the leaderboard, and multiple debts accumulate heavier penalties.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="verification" className="border-l-4 border-green-500 bg-green-500/10 rounded-lg overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <h3 className="text-lg font-bold">Verification & Timeline</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-sm text-muted-foreground">
                  <strong>All reports undergo verification.</strong> All disputes undergo review. All outcomes are logged permanently with date-stamped trails that protect both parties.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="vendor" className="border-l-4 border-purple-500 bg-purple-500/10 rounded-lg overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-purple-500 flex-shrink-0" />
                  <h3 className="text-lg font-bold">Vendor Categories</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-sm text-muted-foreground">
                  Vendors include <strong>equipment rentals, studios, trucking, grip/lighting suppliers, post houses, and any B2B service</strong>. If you provide services to productions, you belong here.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="dispute" className="border-l-4 border-orange-500 bg-orange-500/10 rounded-lg overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <Scale className="h-6 w-6 text-orange-500 flex-shrink-0" />
                  <h3 className="text-lg font-bold">Dispute Resolution Process</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-sm text-muted-foreground">
                  Producers may <strong>dispute reports</strong> through a guided resolution process, including document uploads, explanation statements, and evidence review. All resolutions are tracked and logged.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="leaderboard" className="border-l-4 border-pink-500 bg-pink-500/10 rounded-lg overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <Trophy className="h-6 w-6 text-pink-500 flex-shrink-0" />
                  <h3 className="text-lg font-bold">Leaderboard Access</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Leaderboard access is available to crew, vendors, producers, and companies for $5.99/month.</strong> View PSCS scores, debt histories, and payment timelines for all verified producers.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Step 1: Walkthrough */}
          {step === 1 && (
            <SubmissionWalkthrough onContinue={handleNextWithAuthCheck} />
          )}

          {/* Step 2: Participant Type */}
          {step === 2 && (
            <ParticipantTypeSelector
              value={participantType}
              onChange={(type) => {
                setParticipantType(type);
                handleNextWithAuthCheck();
              }}
              onBack={handleBack}
              isAdmin={isAdmin}
            />
          )}

          {/* Step 3: Identification - Block if not authenticated */}
          {step === 3 && !isAuthenticated && (
            <Card className="p-6">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">Sign In Required</h2>
                <p className="text-muted-foreground">
                  You need to be signed in to continue with your submission.
                </p>
                <Button
                  onClick={() => {
                    const currentPath = window.location.pathname + window.location.search;
                    navigate(`/auth?redirect=${encodeURIComponent(currentPath)}`);
                  }}
                  size="lg"
                >
                  Sign In to Continue
                </Button>
              </div>
            </Card>
          )}

          {step === 3 && isAuthenticated && participantType === "crew" && (
            <CrewIdentification
              value={userInfo}
              onChange={setUserInfo}
              onContinue={handleNext}
              onBack={handleBack}
              onNext={handleNext}
              showNextButton={true}
            />
          )}

          {step === 3 && isAuthenticated && (participantType === "producer" || participantType === "production_company") && (
            <ProducerIdentification
              type={participantType}
              value={userInfo}
              onChange={setUserInfo}
              onContinue={handleNext}
              onBack={handleBack}
              onNext={handleNext}
              showNextButton={true}
            />
          )}

          {step === 3 && isAuthenticated && participantType === "vendor" && (
            <VendorIdentification
              value={userInfo}
              onChange={setUserInfo}
              onContinue={handleNext}
              onBack={handleBack}
              onNext={handleNext}
              showNextButton={true}
            />
          )}

          {/* Step 4: Submission Type Selection (skip for vendors) */}
          {step === 4 && !isAuthenticated && (
            <Card className="p-6">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">Sign In Required</h2>
                <p className="text-muted-foreground">
                  You need to be signed in to continue with your submission.
                </p>
                <Button
                  onClick={() => {
                    const currentPath = window.location.pathname + window.location.search;
                    navigate(`/auth?redirect=${encodeURIComponent(currentPath)}`);
                  }}
                  size="lg"
                >
                  Sign In to Continue
                </Button>
              </div>
            </Card>
          )}

          {step === 4 && isAuthenticated && participantType === "vendor" && (
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-4">Vendor Report Submission</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Vendors submit vendor reports. Click Continue to proceed to the vendor report form.
              </p>
              <div className="flex gap-3 mt-6 justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button variant="outline" onClick={() => {
                  setSubmissionType("vendor_report");
                  handleNext();
                }}>
                  Next
                </Button>
                <Button onClick={() => {
                  setSubmissionType("vendor_report");
                  handleNext();
                }}>
                  Continue
                </Button>
              </div>
            </Card>
          )}

          {step === 4 && isAuthenticated && participantType !== "vendor" && (
            <SubmissionTypeSelector
              participantType={participantType!}
              value={submissionType}
              onChange={(type) => {
                setSubmissionType(type);
                handleNext();
              }}
              onBack={handleBack}
              onNext={handleNext}
              showNextButton={true}
            />
          )}

          {/* Step 5: Actual Form */}
          {step === 5 && !submissionType && (
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-4">Preview Submission Form</h2>
              <p className="text-muted-foreground mb-6">
                Please go back and select a submission type to continue, or use the Next button to preview the form structure.
              </p>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
              </div>
            </Card>
          )}

          {step === 5 && submissionType === "crew_report" && (
            <CrewReportForm
              userInfo={userInfo}
              onBack={handleBack}
              onSuccess={resetForm}
              adminMetadata={getAdminMetadata()}
            />
          )}

          {step === 5 && submissionType === "payment_confirmation" && (
            <PaymentConfirmationForm
              userInfo={userInfo}
              onBack={handleBack}
              onSuccess={resetForm}
            />
          )}

          {step === 5 && submissionType === "counter_dispute" && (
            <CounterDisputeForm
              userInfo={userInfo}
              onBack={handleBack}
              onSuccess={resetForm}
            />
          )}

          {step === 5 && (submissionType === "payment_documentation" || 
                          submissionType === "report_explanation" || 
                          submissionType === "report_dispute") && 
           participantType !== "crew" && participantType !== "vendor" && (
          <ProducerSubmissionForm
            userInfo={userInfo}
            submissionType={submissionType}
            participantType={participantType}
            prefilledReportId={prefilledReportId}
            onBack={handleBack}
            onSuccess={resetForm}
          />
          )}

          {step === 5 && submissionType === "vendor_report" && (
            <VendorReportForm
              userInfo={userInfo}
              onBack={handleBack}
              onSuccess={resetForm}
              adminMetadata={getAdminMetadata()}
            />
          )}

          {/* Navigation Buttons */}
          {step > 1 && step < 5 && (
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </>
  );
}
