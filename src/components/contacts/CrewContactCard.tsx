import { Star, Mail, Phone, Instagram, Pencil, Trash2, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, censorEmail, censorPhone } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { CrewContact } from "@/pages/CrewContacts";

interface CrewContactCardProps {
  contact: CrewContact;
  callSheetCount: number;
  onToggleFavorite: (contact: CrewContact) => void;
  onEdit: (contact: CrewContact) => void;
  onDelete: (contact: CrewContact) => void;
  isTogglingFavorite: boolean;
  showContactInfo: boolean;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function CrewContactCard({
  contact,
  callSheetCount,
  onToggleFavorite,
  onEdit,
  onDelete,
  isTogglingFavorite,
  showContactInfo,
  selectMode = false,
  isSelected = false,
  onToggleSelect
}: CrewContactCardProps) {
  const navigate = useNavigate();
  const maxRoles = 2;
  const displayedRoles = contact.roles?.slice(0, maxRoles) || [];
  const extraRolesCount = (contact.roles?.length || 0) - maxRoles;

  const handleCallSheetClick = () => {
    if (callSheetCount > 0) {
      navigate(`/call-sheets?contact_id=${contact.id}&contact_name=${encodeURIComponent(contact.name)}`);
    }
  };

  const handleCardClick = () => {
    if (selectMode && onToggleSelect) {
      onToggleSelect();
    }
  };

  return (
    <Card 
      className={cn(
        "group relative hover:shadow-md transition-shadow",
        selectMode && "cursor-pointer",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Select checkbox */}
        {selectMode && (
          <div className="absolute top-3 left-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Header with name, favorite, and actions */}
        <div className={cn("flex items-start justify-between gap-2 mb-2", selectMode && "pl-8")}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(contact);
              }}
              disabled={isTogglingFavorite}
              aria-label={contact.is_favorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star
                className={cn(
                  "h-4 w-4 transition-colors",
                  contact.is_favorite
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground hover:text-yellow-400"
                )}
              />
            </Button>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{contact.name}</h3>
              {contact.ig_handle && (
                <a 
                  href={`https://instagram.com/${contact.ig_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Instagram className="h-3.5 w-3.5" />
                  @{contact.ig_handle}
                </a>
              )}
            </div>
          </div>
          
          {/* Action buttons - visible on hover */}
          {!selectMode && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(contact);
                }}
                aria-label="Edit contact"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(contact);
                }}
                aria-label="Delete contact"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Roles */}
        {displayedRoles.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {displayedRoles.map((role, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {role}
              </Badge>
            ))}
            {extraRolesCount > 0 && (
              <Badge variant="outline" className="text-xs">
                +{extraRolesCount}
              </Badge>
            )}
          </div>
        )}

        {/* Department */}
        {contact.departments && contact.departments.length > 0 && (
          <p className="text-sm text-muted-foreground mb-3">
            {contact.departments.join(", ")}
          </p>
        )}

        {/* Contact info */}
        <div className="space-y-1 mb-3">
          {contact.emails && contact.emails.length > 0 && (
            <p className="text-sm flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {showContactInfo ? contact.emails[0] : censorEmail(contact.emails[0])}
              </span>
              {contact.emails.length > 1 && (
                <span className="text-xs">+{contact.emails.length - 1}</span>
              )}
            </p>
          )}
          {contact.phones && contact.phones.length > 0 && (
            <p className="text-sm flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>
                {showContactInfo ? contact.phones[0] : censorPhone(contact.phones[0])}
              </span>
              {contact.phones.length > 1 && (
                <span className="text-xs">+{contact.phones.length - 1}</span>
              )}
            </p>
          )}
        </div>

        {/* Call sheet count badge */}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full text-xs h-8",
            callSheetCount === 0 && "opacity-50 cursor-default"
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleCallSheetClick();
          }}
          disabled={callSheetCount === 0}
        >
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          Appears on {callSheetCount} call sheet{callSheetCount !== 1 ? 's' : ''}
        </Button>
      </CardContent>
    </Card>
  );
}
