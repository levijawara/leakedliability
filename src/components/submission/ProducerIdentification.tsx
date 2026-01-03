import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProducerIdentificationProps {
  type: "producer" | "production_company";
  value: { firstName: string; lastName: string; email: string };
  onChange: (value: any) => void;
  onContinue: () => void;
  onBack: () => void;
  onNext?: () => void; // Optional: allows navigation without validation
  showNextButton?: boolean; // Whether to show Next button for preview
}

export function ProducerIdentification({ type, value, onChange, onContinue, onBack, onNext, showNextButton = false }: ProducerIdentificationProps) {
  const isValid = value.firstName && value.lastName && value.email;

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold mb-4">
        {type === "producer" ? "Producer" : "Production Company"} Identification
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Legal {type === "producer" ? "name" : "business name"} + email required
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="firstName">
            {type === "producer" ? "First Name" : "Company/Business Name"} *
          </Label>
          <Input
            id="firstName"
            value={value.firstName}
            onChange={(e) => onChange({ ...value, firstName: e.target.value })}
            placeholder={type === "producer" ? "Enter your legal first name" : "Enter company/business name"}
          />
        </div>

        {type === "producer" && (
          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={value.lastName}
              onChange={(e) => onChange({ ...value, lastName: e.target.value })}
              placeholder="Enter your legal last name"
            />
          </div>
        )}

        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={value.email}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
            placeholder="your.email@example.com"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6 justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-3">
          {showNextButton && onNext && (
            <Button variant="outline" onClick={onNext}>
              Next
            </Button>
          )}
          <Button onClick={onContinue} disabled={!isValid}>
            Continue
          </Button>
        </div>
      </div>
    </Card>
  );
}
