import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VendorIdentificationProps {
  value: { 
    vendorCompany: string;
    vendorDBA: string;
    vendorWebsite: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    vendorType: string;
    vendorTypeOther: string;
  };
  onChange: (value: any) => void;
  onContinue: () => void;
  onBack: () => void;
}

const vendorTypes = [
  "Camera & Lens Rental",
  "Grip & Electric Rental",
  "Location Provider",
  "Transportation & Vehicles",
  "Props & Set Dressing",
  "Wardrobe & Costumes",
  "Catering & Craft Services",
  "Equipment & Supplies",
  "Post-Production Services",
  "Other"
];

export function VendorIdentification({ value, onChange, onContinue, onBack }: VendorIdentificationProps) {
  const isValid = value.vendorCompany && value.contactName && value.contactEmail && value.vendorType && 
    (value.vendorType !== "Other" || value.vendorTypeOther);

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold mb-4">Vendor / Service Provider Identification</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Business information + primary contact details
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="vendorCompany">Company Legal Name *</Label>
          <Input
            id="vendorCompany"
            value={value.vendorCompany}
            onChange={(e) => onChange({ ...value, vendorCompany: e.target.value })}
            placeholder="Enter legal business name"
          />
        </div>

        <div>
          <Label htmlFor="vendorDBA">DBA / Operating Name (Optional)</Label>
          <Input
            id="vendorDBA"
            value={value.vendorDBA}
            onChange={(e) => onChange({ ...value, vendorDBA: e.target.value })}
            placeholder="Doing Business As name, if different"
          />
        </div>

        <div>
          <Label htmlFor="vendorWebsite">Website (Optional)</Label>
          <Input
            id="vendorWebsite"
            type="url"
            value={value.vendorWebsite}
            onChange={(e) => onChange({ ...value, vendorWebsite: e.target.value })}
            placeholder="https://yourcompany.com"
          />
        </div>

        <div>
          <Label htmlFor="vendorType">Vendor Type *</Label>
          <Select value={value.vendorType} onValueChange={(type) => onChange({ ...value, vendorType: type })}>
            <SelectTrigger>
              <SelectValue placeholder="Select vendor type" />
            </SelectTrigger>
            <SelectContent>
              {vendorTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {value.vendorType === "Other" && (
          <div>
            <Label htmlFor="vendorTypeOther">Specify Vendor Type *</Label>
            <Input
              id="vendorTypeOther"
              value={value.vendorTypeOther}
              onChange={(e) => onChange({ ...value, vendorTypeOther: e.target.value })}
              placeholder="Specify your service type"
            />
          </div>
        )}

        <div>
          <Label htmlFor="contactName">Primary Contact Name *</Label>
          <Input
            id="contactName"
            value={value.contactName}
            onChange={(e) => onChange({ ...value, contactName: e.target.value })}
            placeholder="Contact person's full name"
          />
        </div>

        <div>
          <Label htmlFor="contactEmail">Contact Email *</Label>
          <Input
            id="contactEmail"
            type="email"
            value={value.contactEmail}
            onChange={(e) => onChange({ ...value, contactEmail: e.target.value })}
            placeholder="contact@company.com"
          />
        </div>

        <div>
          <Label htmlFor="contactPhone">Contact Phone (Optional)</Label>
          <Input
            id="contactPhone"
            type="tel"
            value={value.contactPhone}
            onChange={(e) => onChange({ ...value, contactPhone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
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
