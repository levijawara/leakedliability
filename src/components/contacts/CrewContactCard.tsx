import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Star, Mail, Phone, Instagram, FileText, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn, censorEmail, censorPhone } from "@/lib/utils";
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
  const primaryDepartment = departments[0];
  const primaryEmail = emails[0];
  const primaryPhone = phones[0];
  
  // Count extras for "+N more" indicators
  const extraRoles = roles.length > 1 ? roles.length - 1 : 0;
  const extraDepts = departments.length > 1 ? departments.length - 1 : 0;
  const totalExtras = extraRoles + extraDepts;
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
        <CardContent className="p-4">
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

          {/* 2-column mini-table layout */}
          <div className="grid grid-cols-1 sm:grid-cols-[1.6fr_1fr] gap-x-4 gap-y-2">
            
            {/* Row 1: Name + star | IG handle */}
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(contact);
                }}
                disabled={isTogglingFavorite}
              >
                <Star 
                  className={cn(
                    "h-4 w-4",
                    contact.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  )} 
                />
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="font-semibold truncate text-sm">{contact.name}</h3>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{contact.name}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center justify-end">
              {contact.ig_handle && (
                <a
                  href={`https://instagram.com/${contact.ig_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Instagram className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate max-w-[80px]">@{contact.ig_handle}</span>
                </a>
              )}
            </div>

            {/* Row 2: Role/Department | Project tag */}
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              {primaryRole && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {primaryRole}
                </Badge>
              )}
              {primaryDepartment && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {primaryDepartment}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{departments.join(', ')}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {totalExtras > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs shrink-0 cursor-help">
                      +{totalExtras}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1 text-xs">
                      {roles.length > 1 && <p>Roles: {roles.join(', ')}</p>}
                      {departments.length > 1 && <p>Depts: {departments.join(', ')}</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="flex items-center justify-end">
              {contact.project_title && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs truncate max-w-[100px]">
                      {contact.project_title}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{contact.project_title}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Row 3: Email | Phone (only if showContactInfo or has data) */}
            {(primaryEmail || primaryPhone) && (
              <>
                <div className="flex items-center gap-1.5 min-w-0">
                  {primaryEmail && (
                    <>
                      <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground truncate">
                            {showContactInfo ? primaryEmail : censorEmail(primaryEmail)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{showContactInfo ? emails.join(', ') : emails.map(censorEmail).join(', ')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5 justify-end min-w-0">
                  {primaryPhone && (
                    <>
                      <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">
                        {showContactInfo ? primaryPhone : censorPhone(primaryPhone)}
                      </span>
                    </>
                  )}
                  {totalContactExtras > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground shrink-0 cursor-help">
                          +{totalContactExtras}
                        </span>
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
              </>
            )}

            {/* Row 4: Call sheet button - full width */}
            <div className="col-span-1 sm:col-span-2 mt-2">
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
            </div>
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
