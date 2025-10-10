import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CrewIdentificationProps {
  value: { firstName: string; lastName: string; email: string; role: string };
  onChange: (value: any) => void;
  onContinue: () => void;
  onBack: () => void;
}

const crewRoles = [
  "Art Department",
  "Assistant Director",
  "Camera Department",
  "Casting",
  "Color / Finishing",
  "Costume / Wardrobe",
  "Craft Services / Catering",
  "Director",
  "Development / Writing",
  "Editor / Editorial",
  "Electric Department",
  "Grip Department",
  "Hair & Makeup",
  "Locations",
  "Music / Scoring",
  "Medic",
  "Office Staff",
  "Post Supervisors",
  "Producer (reporting ANOTHER producer/production company)",
  "Production Assistant",
  "Production Manager",
  "Production Coordinator",
  "Scripty / Continuity",
  "Security",
  "Sound (Production)",
  "Sound (Post-production)",
  "Special Effects (SFX)",
  "Stunts / Safety",
  "Transportation",
  "VFX"
];

export function CrewIdentification({ value, onChange, onContinue, onBack }: CrewIdentificationProps) {
  const isValid = value.firstName && value.lastName && value.email && value.role;

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold mb-4">Crew Member Identification</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Legal names ONLY and reachable EMAIL address ONLY
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={value.firstName}
            onChange={(e) => onChange({ ...value, firstName: e.target.value })}
            placeholder="Enter your legal first name"
          />
        </div>

        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={value.lastName}
            onChange={(e) => onChange({ ...value, lastName: e.target.value })}
            placeholder="Enter your legal last name"
          />
        </div>

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

        <div>
          <Label htmlFor="role">Your Role/Department *</Label>
          <Select value={value.role} onValueChange={(role) => onChange({ ...value, role })}>
            <SelectTrigger>
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              {crewRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            It's okay if you are reporting for a job/role you don't typically do
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onContinue} disabled={!isValid}>
          Continue
        </Button>
      </div>
    </Card>
  );
}
