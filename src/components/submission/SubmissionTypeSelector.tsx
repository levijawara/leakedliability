import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SubmissionTypeSelectorProps {
  participantType: "crew" | "producer" | "production_company";
  value: string | null;
  onChange: (type: string) => void;
  onBack: () => void;
}

export function SubmissionTypeSelector({ participantType, value, onChange, onBack }: SubmissionTypeSelectorProps) {
  const crewOptions = [
    { value: "crew_report", label: "Crew Member Report", description: "Sworn statement of unpaid invoice" },
    { value: "payment_confirmation", label: "Payment Confirmation", description: "Verify a producer paid you" },
    { value: "counter_dispute", label: "Counter-Dispute", description: "Challenge a producer's dispute" }
  ];

  const producerOptions = [
    { value: "payment_documentation", label: "Payment Documentation", description: "Submit payment receipts/proof" },
    { value: "report_explanation", label: "Report Explanation", description: "Explain payment delay" },
    { value: "report_dispute", label: "Report Dispute", description: "Challenge a crew member's report" }
  ];

  const options = participantType === "crew" ? crewOptions : producerOptions;

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold mb-4">What would you like to submit?</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {participantType === "crew" 
          ? "REMINDER: Only ONE invoice is permitted per report submission"
          : "Select the type of documentation you're submitting"}
      </p>

      <RadioGroup value={value || ""} onValueChange={onChange}>
        <div className="space-y-4">
          {options.map((option) => (
            <div key={option.value} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value={option.value} id={option.value} />
              <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                <div className="font-semibold">{option.label}</div>
                <div className="text-sm text-muted-foreground">{option.description}</div>
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>
    </Card>
  );
}
