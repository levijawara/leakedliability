import { useState } from "react";
import { Star, Mail, Phone, Instagram, Pencil, Trash2, FileText, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const [showAllContact, setShowAllContact] = useState(false);
  
  // Reduced from 2 to 1 for cleaner display
  const maxRoles = 1;
  const displayedRoles = contact.roles?.slice(0, maxRoles) || [];
  const extraRolesCount = (contact.roles?.length || 0) - maxRoles;
  
  // Only show first department, truncated
  const primaryDepartment = contact.departments?.[0];
  const extraDeptCount = (contact.departments?.length || 0) - 1;

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

  // Determine which contact info to show
  const hasEmail = contact.emails && contact.emails.length > 0;
  const hasPhone = contact.phones && contact.phones.length > 0;
  const hasBothContactTypes = hasEmail && hasPhone;

  // Build full contact info for tooltip
  const allContactInfo = [
    ...(contact.emails || []).map(e => ({ type: 'email', value: e })),
    ...(contact.phones || []).map(p => ({ type: 'phone', value: p })),
  ];

  return (
    <TooltipProvider>
      <Card 
        className={cn(
          "group relative hover:shadow-md transition-shadow min-h-[200px]",
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
                    <span className="truncate max-w-[120px]">@{contact.ig_handle}</span>
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

          {/* Roles - show only 1 with tooltip for more */}
          {displayedRoles.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {displayedRoles.map((role, index) => (
                <Badge key={index} variant="secondary" className="text-xs truncate max-w-[140px]">
                  {role}
                </Badge>
              ))}
              {extraRolesCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs cursor-help">
                      +{extraRolesCount}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">{contact.roles?.slice(maxRoles).join(", ")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Department - truncated with tooltip */}
          {primaryDepartment && (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm text-muted-foreground mb-2 truncate cursor-default">
                  {primaryDepartment}
                  {extraDeptCount > 0 && ` +${extraDeptCount}`}
                </p>
              </TooltipTrigger>
              {(contact.departments?.length || 0) > 1 && (
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="text-xs">{contact.departments?.join(", ")}</p>
                </TooltipContent>
              )}
            </Tooltip>
          )}

          {/* Contact info - progressive disclosure */}
          <div className="space-y-1 mb-2">
            {/* Show email by default if available */}
            {hasEmail && (
              <p className="text-sm flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {showContactInfo ? contact.emails![0] : censorEmail(contact.emails![0])}
                </span>
              </p>
            )}
            
            {/* Show phone only if no email OR if hovering/expanded */}
            {hasPhone && (!hasEmail || showAllContact) && (
              <p className="text-sm flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {showContactInfo ? contact.phones![0] : censorPhone(contact.phones![0])}
                </span>
              </p>
            )}
            
            {/* Show "more contact info" indicator if both exist and not expanded */}
            {hasBothContactTypes && !showAllContact && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllContact(true);
                    }}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                    <span>+{(contact.emails?.length || 0) + (contact.phones?.length || 0) - 1} more</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <div className="text-xs space-y-1">
                    {allContactInfo.map((info, idx) => (
                      <p key={idx} className="flex items-center gap-1">
                        {info.type === 'email' ? <Mail className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                        {showContactInfo ? info.value : (info.type === 'email' ? censorEmail(info.value) : censorPhone(info.value))}
                      </p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
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
    </TooltipProvider>
  );
}
