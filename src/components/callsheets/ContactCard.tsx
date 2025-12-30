import { Phone, Mail, Instagram, Briefcase, Building2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Contact {
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
  confidence: number;
}

interface ContactCardProps {
  contact: Contact;
  selected: boolean;
  onSelect: () => void;
  confidenceBadge: React.ReactNode;
}

export function ContactCard({ contact, selected, onSelect, confidenceBadge }: ContactCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all ${
        selected 
          ? "ring-2 ring-primary bg-primary/5" 
          : "hover:bg-muted/50"
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox 
            checked={selected} 
            onCheckedChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0 space-y-2">
            {/* Name and Confidence */}
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-medium truncate">{contact.name}</h4>
              {confidenceBadge}
            </div>

            {/* Roles */}
            {contact.roles.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{contact.roles.join(', ')}</span>
              </div>
            )}

            {/* Departments */}
            {contact.departments.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <div className="flex flex-wrap gap-1">
                  {contact.departments.map((dept, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {dept}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="flex flex-wrap gap-3 text-xs">
              {contact.phones.length > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{contact.phones[0]}</span>
                  {contact.phones.length > 1 && (
                    <span className="text-muted-foreground/60">
                      +{contact.phones.length - 1}
                    </span>
                  )}
                </div>
              )}

              {contact.emails.length > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate max-w-[150px]">{contact.emails[0]}</span>
                  {contact.emails.length > 1 && (
                    <span className="text-muted-foreground/60">
                      +{contact.emails.length - 1}
                    </span>
                  )}
                </div>
              )}

              {contact.ig_handle && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Instagram className="h-3 w-3" />
                  <span>@{contact.ig_handle.replace('@', '')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
