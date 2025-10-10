import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ParticipantTypeSelectorProps {
  value: "crew" | "producer" | "production_company" | null;
  onChange: (type: "crew" | "producer" | "production_company") => void;
  onBack: () => void;
}

export function ParticipantTypeSelector({ value, onChange, onBack }: ParticipantTypeSelectorProps) {
  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold mb-4">Select Participant Type</h2>
      <p className="text-muted-foreground mb-6">
        Are you a Crew Member, Producer, or Production Company?
      </p>

      <RadioGroup value={value || ""} onValueChange={(v) => onChange(v as any)}>
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="crew" id="crew" />
            <Label htmlFor="crew" className="flex-1 cursor-pointer">
              <div className="font-semibold">Crew Member</div>
              <div className="text-sm text-muted-foreground">
                Report unpaid invoices, confirm payments, or counter-dispute
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="producer" id="producer" />
            <Label htmlFor="producer" className="flex-1 cursor-pointer">
              <div className="font-semibold">Producer</div>
              <div className="text-sm text-muted-foreground">
                Submit payment documentation, explanations, or disputes
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="production_company" id="production_company" />
            <Label htmlFor="production_company" className="flex-1 cursor-pointer">
              <div className="font-semibold">Production Company</div>
              <div className="text-sm text-muted-foreground">
                Submit payment documentation, explanations, or disputes
              </div>
            </Label>
          </div>
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
