import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Star, Mail, Phone, FileText, Pencil, Trash2, Youtube, RotateCcw, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn, censorEmail, censorPhone } from "@/lib/utils";
import { formatFullViewCount } from "@/lib/youtubeHelpers";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const [isFlipped, setIsFlipped] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Copied",
        description: `${field} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Get display data
  const roles = contact.roles || [];
  const departments = contact.departments || [];
  const emails = contact.emails || [];
  const phones = contact.phones || [];
  
  const primaryRole = roles[0];
  const primaryDepartment = departments[0];
  
  // Format call sheet count (cap at 999+)
  const displayCallSheetCount = callSheetCount > 999 ? '999+' : callSheetCount.toString();
  
  // Format YouTube views (compact)
  const displayViews = youtubeViewCount > 0 ? formatFullViewCount(youtubeViewCount) : null;

  return (
    <TooltipProvider>
      <Card 
        className={cn(
          "group relative hover:shadow-md transition-shadow",
          selectMode && "cursor-pointer",
          isSelected && "ring-2 ring-primary"
        )}
        onClick={handleCardClick}
        style={{ perspective: '1000px' }}
      >
        <CardContent className="p-4 relative" style={{ minHeight: '180px' }}>
          {/* Select mode checkbox */}
          {selectMode && (
            <div className="absolute top-3 right-3 z-20">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect?.()}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Card Flip Container */}
          <div 
            className={cn(
              "relative w-full",
              "transition-transform duration-[400ms] ease-out",
              "[@media(prefers-reduced-motion:reduce)]:transition-none"
            )}
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* FRONT SIDE - Public Identity */}
            <div 
              className="w-full"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)',
              }}
            >
              <div className="flex flex-col gap-3 h-full">
                {/* Top Row: Name + Action Buttons */}
                <div className={cn(
                  "flex items-start justify-between gap-2",
                  selectMode && "pr-8"
                )}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* NOVA icon - only if exists */}
                    {contact.nova_profile_url && (
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
                    )}
                    {/* Instagram icon - only if exists */}
                    {contact.ig_handle && (
                      <a
                        href={`https://instagram.com/${contact.ig_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        title={`@${contact.ig_handle}`}
                      >
                        <img 
                          src="/images/instagram.png" 
                          alt="Instagram" 
                          className="h-5 w-5 rounded hover:opacity-80 transition-opacity"
                        />
                      </a>
                    )}
                    {/* Name - LARGE and prominent */}
                    <h3 className="font-semibold text-lg leading-tight truncate min-w-0 flex-1">
                      {contact.name}
                    </h3>
                  </div>

                  {/* Action buttons - visible on hover */}
                  {!selectMode && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleFlip}
                        title="Flip to see contact info"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Role + Department Pills */}
                <div className="flex items-center flex-wrap gap-1.5">
                  {primaryRole && (
                    <Badge variant="secondary" className="text-xs">
                      {primaryRole}
                    </Badge>
                  )}
                  {primaryDepartment && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {primaryDepartment}
                    </Badge>
                  )}
                  {roles.length > 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs cursor-help">
                          +{roles.length - 1}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Roles: {roles.join(', ')}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Metrics Row - Compact chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  {displayViews && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/crew-contacts/${contact.id}/youtube`);
                          }}
                        >
                          <Youtube className="h-3.5 w-3.5 text-destructive mr-1" />
                          <span className="font-mono font-medium">{displayViews}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View all linked YouTube projects</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {callSheetCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCallSheetClick();
                          }}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          <span>{displayCallSheetCount}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Appears on {callSheetCount} call sheet{callSheetCount !== 1 ? 's' : ''}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>

            {/* BACK SIDE - Private Contact Info */}
            <div 
              className="absolute inset-0 w-full"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="flex flex-col gap-3 h-full">
                {/* Top Row: Name + Action Buttons */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-base leading-tight truncate min-w-0 flex-1">
                    {contact.name}
                  </h3>

                  {/* Action buttons */}
                  {!selectMode && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
                        className="h-7 w-7"
                        onClick={handleFlip}
                        title="Flip back to front"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Emails */}
                {emails.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                      Emails
                    </Label>
                    <div className="space-y-1.5">
                      {emails.map((email, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <a
                              href={`mailto:${email}`}
                              className="text-sm truncate hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {showContactInfo ? email : censorEmail(email)}
                            </a>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(email, `email-${idx}`);
                            }}
                          >
                            {copiedField === `email-${idx}` ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phones */}
                {phones.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                      Phones
                    </Label>
                    <div className="space-y-1.5">
                      {phones.map((phone, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <a
                              href={`tel:${phone}`}
                              className="text-sm truncate hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {showContactInfo ? phone : censorPhone(phone)}
                            </a>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(phone, 'Phone');
                              setCopiedField(`phone-${idx}`);
                            }}
                          >
                            {copiedField === `phone-${idx}` ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {emails.length === 0 && phones.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No contact information available
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
