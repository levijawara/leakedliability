import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Star, Mail, Phone, Instagram, FileText, Pencil, Trash2, Youtube } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn, censorEmail, censorPhone } from "@/lib/utils";
import { formatViewCount } from "@/lib/youtubeHelpers";
import type { CrewContact } from "@/pages/CrewContacts";

interface CrewContactCardProps {
  contact: CrewContact;
  callSheetCount: number;
  youtubeViewCount?: number;
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
  youtubeViewCount = 0,
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

  // Get display data
  const roles = contact.roles || [];
  const departments = contact.departments || [];
  const emails = contact.emails || [];
  const phones = contact.phones || [];
  
  const primaryRole = roles[0];
  const primaryEmail = emails[0];
  const primaryPhone = phones[0];
  
  // Count extras for "+N more" indicators (roles only, departments hidden)
  const extraRoles = roles.length > 1 ? roles.length - 1 : 0;
  const extraEmails = emails.length > 1 ? emails.length - 1 : 0;
  const extraPhones = phones.length > 1 ? phones.length - 1 : 0;
  const totalContactExtras = extraEmails + extraPhones;

  return (
    <TooltipProvider>
      <Card 
        className={cn(
          "group relative hover:shadow-md transition-shadow",
          selectMode && "cursor-pointer",
          isSelected && "ring-2 ring-primary"
        )}
        onClick={handleCardClick}
      >
        <CardContent className="p-3">
          {/* Select mode checkbox */}
          {selectMode && (
            <div className="absolute top-3 right-3 z-10">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect?.()}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Horizontal-first flexbox layout */}
          <div className="flex flex-col gap-2">
            
            {/* Row 1: NOVA icon + Name + IG handle (stacked) */}
            <div className={cn(
              "flex items-center gap-2",
              selectMode && "pr-8"
            )}>
              {/* NOVA icon on the left (where star used to be) */}
              {contact.nova_profile_url ? (
                <a
                  href={contact.nova_profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  title="View NOVA Profile"
                >
                  <img 
                    src="/images/nova-icon.png" 
                    alt="NOVA" 
                    className="h-5 w-5 rounded hover:opacity-80 transition-opacity"
                  />
                </a>
              ) : (
                <div className="w-5 h-5 shrink-0" /> 
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate">{contact.name}</h3>
                {contact.ig_handle && (
                  <a
                    href={`https://instagram.com/${contact.ig_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Instagram className="h-3 w-3" />
                    <span className="truncate">@{contact.ig_handle}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Row 2: Role only */}
            <div className="flex items-center flex-wrap gap-1.5">
              {primaryRole && (
                <Badge variant="secondary" className="text-xs">
                  {primaryRole}
                </Badge>
              )}
              {extraRoles > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs cursor-help">
                      +{extraRoles}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Roles: {roles.join(', ')}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Row 3: Email + Phone share one flex row, wrap allowed */}
            {(primaryEmail || primaryPhone) && (
              <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {primaryEmail && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="break-all">
                      {showContactInfo ? primaryEmail : censorEmail(primaryEmail)}
                    </span>
                  </span>
                )}
                {primaryPhone && (
                  <span className="flex items-center gap-1 shrink-0">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{showContactInfo ? primaryPhone : censorPhone(primaryPhone)}</span>
                  </span>
                )}
                {totalContactExtras > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">+{totalContactExtras}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1 text-xs">
                        {emails.length > 0 && <p>Emails: {showContactInfo ? emails.join(', ') : emails.map(censorEmail).join(', ')}</p>}
                        {phones.length > 0 && <p>Phones: {showContactInfo ? phones.join(', ') : phones.map(censorPhone).join(', ')}</p>}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}

            {/* Row 4: YouTube views (if any) */}
            {youtubeViewCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Youtube className="h-3.5 w-3.5 text-destructive" />
                <span className="font-medium">{formatViewCount(youtubeViewCount)}</span>
                <span>total views</span>
              </div>
            )}

            {/* Row 5: Call sheet button - full width */}
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full text-xs h-8 mt-1",
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
          </div>

          {/* Action buttons - visible on hover (non-select mode) */}
          {!selectMode && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(contact);
                }}
                disabled={isTogglingFavorite}
              >
                <Star 
                  className={cn(
                    "h-3.5 w-3.5",
                    contact.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  )} 
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(contact);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(contact);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
