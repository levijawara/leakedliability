import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ParticipantTypeSelectorProps {
  value: "crew" | "producer" | "production_company" | "vendor" | null;
  onChange: (type: "crew" | "producer" | "production_company" | "vendor") => void;
  onBack: () => void;
  isAdmin?: boolean;
}

export function ParticipantTypeSelector({ value, onChange, onBack, isAdmin = false }: ParticipantTypeSelectorProps) {
  const navigate = useNavigate();
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
            <RadioGroupItem value="vendor" id="vendor" />
            <Label htmlFor="vendor" className="flex-1 cursor-pointer">
              <div className="font-semibold">Vendor / Service Provider</div>
              <div className="text-sm text-muted-foreground">
                Report unpaid invoices for rentals, locations, services, or supplies
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

      {isAdmin && (
        <div className="mt-8 border-t pt-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Admin Tools
          </h3>

          <div
            className="flex flex-col p-4 border rounded-lg cursor-pointer hover:bg-muted/30 mb-3"
            onClick={() => navigate("/admin-submit-existing")}
          >
            <span className="font-medium">Submit for Existing User</span>
            <span className="text-sm text-muted-foreground">
              Search for an existing LL user and file a report on their behalf
            </span>
          </div>

          <div
            className="flex flex-col p-4 border rounded-lg cursor-pointer hover:bg-muted/30"
            onClick={() => navigate("/admin-submit-new")}
          >
            <span className="font-medium">Submit for New User</span>
            <span className="text-sm text-muted-foreground">
              Create a new LL account and immediately file a report for them
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>
    </Card>
  );
}
