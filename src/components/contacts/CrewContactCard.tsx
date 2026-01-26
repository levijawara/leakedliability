import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Star, Mail, Phone, FileText, Pencil, Trash2, Youtube, RotateCcw, Copy, Check, ChevronDown } from "lucide-react";
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

// Dynamic font sizing based on name length - names must ALWAYS be single line
const getNameClasses = (name: string) => {
  const len = name.length;
  if (len <= 12) return "text-2xl font-bold";      // Short: full size
  if (len <= 18) return "text-xl font-bold";       // Medium: slightly smaller  
  if (len <= 25) return "text-lg font-semibold";   // Long: compact
  return "text-base font-semibold";                // Very long: minimum
};

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
  
  // Format YouTube views (compact)
  const displayViews = youtubeViewCount > 0 ? formatFullViewCount(youtubeViewCount) : null;

  // Check if any icons exist
  const hasIcons = contact.nova_profile_url || contact.ig_handle;

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
        <CardContent className="p-3 relative">
          {/* Select mode checkbox */}
          {selectMode && (
            <div className="absolute top-2 right-2 z-20">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect?.()}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Vertical Action Buttons - Right Rail */}
          {!selectMode && (
            <div className="absolute top-2 right-2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
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
                className="h-6 w-6"
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
                className="h-6 w-6 text-destructive hover:text-destructive"
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
                className="h-6 w-6"
                onClick={handleFlip}
                title="Flip to see contact info"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
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
              <div className="flex flex-col gap-1 pr-8">
                {/* Top Row: Icons (if any) + Name */}
                <div className="flex items-center gap-2">
                  {/* Only render icon container if icons exist */}
                  {hasIcons && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {contact.nova_profile_url && (
                        <a
                          href={contact.nova_profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
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
                      {contact.ig_handle && (
                        <a
                          href={`https://instagram.com/${contact.ig_handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
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
                    </div>
                  )}
                  {/* Name - LARGE and prominent, always single line */}
                  <h3 className={cn(
                    "leading-tight whitespace-nowrap overflow-hidden text-ellipsis",
                    getNameClasses(contact.name)
                  )}>
                    {contact.name}
                  </h3>
                </div>

                {/* Role + Department Pills - tight to name */}
                <div className="flex items-center flex-wrap gap-1 mt-0.5">
                  {primaryRole && (
                    <Badge variant="secondary" className="text-xs py-0">
                      {primaryRole}
                    </Badge>
                  )}
                  {primaryDepartment && (
                    <Badge variant="outline" className="text-xs py-0 text-muted-foreground">
                      {primaryDepartment}
                    </Badge>
                  )}
                  {roles.length > 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs py-0 cursor-help">
                          +{roles.length - 1}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Roles: {roles.join(', ')}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Separator - like menu dropdown */}
                {(callSheetCount > 0 || displayViews) && (
                  <div className="border-t border-border/50 mt-2 pt-2">
                    {/* Metrics Zone - Left aligned, stacked vertically */}
                    <div className="flex flex-col gap-0.5">
                      {/* Call Sheet Count - FIRST, full label */}
                      {callSheetCount > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-0 text-xs hover:bg-transparent hover:underline justify-start"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCallSheetClick();
                              }}
                            >
                              <FileText className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                              <span>Appears on {callSheetCount} call sheet{callSheetCount !== 1 ? 's' : ''}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View all call sheets featuring {contact.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      
                      {/* YouTube Views - SECOND */}
                      {displayViews && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-0 text-xs hover:bg-transparent hover:underline justify-start"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/crew-contacts/${contact.id}/youtube`);
                              }}
                            >
                              <Youtube className="h-3.5 w-3.5 text-destructive mr-1.5 shrink-0" />
                              <span className="font-mono">{displayViews} views</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View all linked YouTube projects</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}
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
              <div className="flex flex-col gap-3 pr-8">
                {/* Name header - 150% larger */}
                <h3 className="font-semibold text-2xl leading-tight truncate">
                  {contact.name}
                </h3>

                {/* Contact rows - no labels, just icons */}
                <div className="flex flex-col gap-2">
                  {/* Emails */}
                  {emails.length === 1 ? (
                    // Single email - inline row
                    <div className="flex items-center justify-between gap-2 group/row">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Mail className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <a
                          href={`mailto:${emails[0]}`}
                          className="text-base truncate hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {showContactInfo ? emails[0] : censorEmail(emails[0])}
                        </a>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-50 group-hover/row:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(emails[0], 'email-0');
                        }}
                      >
                        {copiedField === 'email-0' ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ) : emails.length > 1 ? (
                    // Multiple emails - dropdown
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="flex items-center justify-between gap-2 cursor-pointer group/row hover:bg-muted/30 rounded-md p-1 -m-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Mail className="h-5 w-5 shrink-0 text-muted-foreground" />
                            <span className="text-base truncate">
                              {showContactInfo ? emails[0] : censorEmail(emails[0])}
                            </span>
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-50 group-hover/row:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(emails[0], 'email-0');
                            }}
                          >
                            {copiedField === 'email-0' ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto min-w-[200px] p-1 bg-card border-border z-[100]" 
                        align="start"
                        side="bottom"
                        sideOffset={4}
                      >
                        <div className="flex flex-col">
                          {emails.map((email, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors group/item"
                            >
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <a
                                  href={`mailto:${email}`}
                                  className="text-xs truncate hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {showContactInfo ? email : censorEmail(email)}
                                </a>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 shrink-0 opacity-50 group-hover/item:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(email, `email-${idx}`);
                                }}
                              >
                                {copiedField === `email-${idx}` ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : null}

                  {/* Phones */}
                  {phones.length === 1 ? (
                    // Single phone - inline row
                    <div className="flex items-center justify-between gap-2 group/row">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Phone className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <a
                          href={`tel:${phones[0]}`}
                          className="text-base truncate hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {showContactInfo ? phones[0] : censorPhone(phones[0])}
                        </a>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-50 group-hover/row:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(phones[0], 'phone-0');
                        }}
                      >
                        {copiedField === 'phone-0' ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ) : phones.length > 1 ? (
                    // Multiple phones - dropdown
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="flex items-center justify-between gap-2 cursor-pointer group/row hover:bg-muted/30 rounded-md p-1 -m-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Phone className="h-5 w-5 shrink-0 text-muted-foreground" />
                            <span className="text-base truncate">
                              {showContactInfo ? phones[0] : censorPhone(phones[0])}
                            </span>
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-50 group-hover/row:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(phones[0], 'phone-0');
                            }}
                          >
                            {copiedField === 'phone-0' ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto min-w-[200px] p-1 bg-card border-border z-[100]" 
                        align="start"
                        side="bottom"
                        sideOffset={4}
                      >
                        <div className="flex flex-col">
                          {phones.map((phone, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors group/item"
                            >
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <a
                                  href={`tel:${phone}`}
                                  className="text-xs truncate hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {showContactInfo ? phone : censorPhone(phone)}
                                </a>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 shrink-0 opacity-50 group-hover/item:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(phone, `phone-${idx}`);
                                }}
                              >
                                {copiedField === `phone-${idx}` ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : null}
                </div>

                {/* Empty state */}
                {emails.length === 0 && phones.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-2">
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
