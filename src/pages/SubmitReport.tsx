import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

export default function SubmitReport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [participantType, setParticipantType] = useState<"crew" | "producer" | "production_company" | null>(null);
  const [submissionType, setSubmissionType] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState({ firstName: "", lastName: "", email: "", role: "" });
  const [prefilledReportId, setPrefilledReportId] = useState<string>("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to submit a report",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }
      
      setIsAuthenticated(true);
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
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleBack = () => setStep(Math.max(1, step - 1));
  const handleNext = () => setStep(step + 1);

  const resetForm = () => {
    setStep(1);
    setParticipantType(null);
    setSubmissionType(null);
    setUserInfo({ firstName: "", lastName: "", email: "", role: "" });
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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-black mb-3">Submission Forms</h1>
            <p className="text-muted-foreground">
              Report | Document | Dispute | Explain | Confirm
            </p>
          </div>

          <Card className="p-6 mb-6 border-l-4 border-status-warning bg-status-warning/10">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-status-warning mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold mb-1">Crew members, your identity is well-protected</p>
                <p className="text-muted-foreground">
                  Legal name + email required. Your identity stays hidden from the producers you're reporting, as well as the general public.
                </p>
              </div>
            </div>
          </Card>

          {/* Step 1: Walkthrough */}
          {step === 1 && (
            <SubmissionWalkthrough onContinue={handleNext} />
          )}

          {/* Step 2: Participant Type */}
          {step === 2 && (
            <ParticipantTypeSelector
              value={participantType}
              onChange={(type) => {
                setParticipantType(type);
                handleNext();
              }}
              onBack={handleBack}
            />
          )}

          {/* Step 3: Identification */}
          {step === 3 && participantType === "crew" && (
            <CrewIdentification
              value={userInfo}
              onChange={setUserInfo}
              onContinue={handleNext}
              onBack={handleBack}
            />
          )}

          {step === 3 && (participantType === "producer" || participantType === "production_company") && (
            <ProducerIdentification
              type={participantType}
              value={userInfo}
              onChange={setUserInfo}
              onContinue={handleNext}
              onBack={handleBack}
            />
          )}

          {/* Step 4: Submission Type Selection */}
          {step === 4 && (
            <SubmissionTypeSelector
              participantType={participantType!}
              value={submissionType}
              onChange={(type) => {
                setSubmissionType(type);
                handleNext();
              }}
              onBack={handleBack}
            />
          )}

          {/* Step 5: Actual Form */}
          {step === 5 && submissionType === "crew_report" && (
            <CrewReportForm
              userInfo={userInfo}
              onBack={handleBack}
              onSuccess={resetForm}
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
           participantType !== "crew" && (
          <ProducerSubmissionForm
            userInfo={userInfo}
            submissionType={submissionType}
            participantType={participantType}
            prefilledReportId={prefilledReportId}
            onBack={handleBack}
            onSuccess={resetForm}
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
    </>
  );
}
