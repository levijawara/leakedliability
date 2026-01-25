import { useState, useEffect, useMemo } from "react";
import { Copy, Check, Loader2, ChevronDown, ChevronRight, Plus, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callSheetId: string;
  fileName: string;
}

interface CreditEntry {
  name: string;
  role: string | null;
  department: string;
  igHandle?: string | null;
  originalIndex: number;
}

interface ParsedContact {
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
  confidence: number;
}

const ROLE_ABBREVIATIONS: Record<string, string> = {
  "Director of Photography": "DP",
  "Director": "Dir",
  "Producer": "Prod",
  "Executive Producer": "EP",
  "Line Producer": "LP",
  "Production Manager": "PM",
  "1st Assistant Director": "1st AD",
  "2nd Assistant Director": "2nd AD",
  "Key Grip": "KG",
  "Best Boy Grip": "BBG",
  "Dolly Grip": "DG",
  "Gaffer": "Gaffer",
  "Best Boy Electric": "BBE",
  "1st Assistant Camera": "1st AC",
  "2nd Assistant Camera": "2nd AC",
  "Digital Imaging Technician": "DIT",
  "Sound Mixer": "Sound Mixer",
  "Boom Operator": "Boom Op",
  "Production Designer": "PD",
  "Art Director": "AD",
  "Set Decorator": "Set Dec",
  "Props Master": "Props",
  "Costume Designer": "Costume",
  "Wardrobe Stylist": "Stylist",
  "Makeup Artist": "MU",
  "Hair Stylist": "Hair",
  "Production Assistant": "PA",
  "Behind the Scenes": "BTS",
  "Camera Operator": "Cam Op",
  "Steadicam Operator": "Steadicam",
  "Focus Puller": "Focus",
  "Loader": "Loader",
  "Video Assist": "Video",
  "Grip": "Grip",
  "Electric": "Electric",
  "Rigging Grip": "Rigging",
  "Rigging Electric": "Rigging Elec",
  "Swing": "Swing",
  "Set Dresser": "Set Dress",
  "Prop Assistant": "Props Asst",
  "Leadman": "Leadman",
  "Scenic": "Scenic",
  "Greens": "Greens",
  "Key Makeup": "Key MU",
  "Key Hair": "Key Hair",
  "Groomer": "Groomer",
  "SFX Makeup": "SFX MU",
  "Wardrobe": "Wardrobe",
  "Costume Supervisor": "Cost Sup",
  "Key Costumer": "Key Cost",
  "Tailor": "Tailor",
  "Casting Director": "Casting",
  "Extras Casting": "Extras",
  "Location Manager": "Locations",
  "Location Scout": "Scout",
  "Unit Production Manager": "UPM",
  "Production Coordinator": "PC",
  "Production Secretary": "Prod Sec",
  "Script Supervisor": "Script Sup",
  "Craft Services": "Crafty",
  "Catering": "Catering",
  "Medic": "Medic",
  "Security": "Security",
  "Driver": "Driver",
  "Transportation Captain": "Trans Capt",
  "Editor": "Editor",
  "Assistant Editor": "Asst Editor",
  "Colorist": "Colorist",
  "VFX Supervisor": "VFX Sup",
  "VFX Artist": "VFX",
  "Compositor": "Comp",
  "Sound Designer": "Sound Design",
  "Re-recording Mixer": "Mix",
  "Foley Artist": "Foley",
  "Music Supervisor": "Music Sup",
  "Composer": "Composer",
};

const DEPARTMENT_ORDER = [
  "Agency/Production",
  "Direction",
  "Camera",
  "Sound",
  "Grip & Electric",
  "Art",
  "Hair/Makeup/Grooming",
  "Styling/Wardrobe",
  "Casting",
  "Miscellaneous",
  "Post-Production",
  "Vendors/Services",
  "Other",
];

// Normalize helpers for dedup matching
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function CreditsModal({ open, onOpenChange, callSheetId, fileName }: CreditsModalProps) {
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [dataSource, setDataSource] = useState<'saved' | 'full'>('saved');
  const [displayMode, setDisplayMode] = useState<'handles' | 'names'>('handles');
  const [roleStyle, setRoleStyle] = useState<'abbreviated' | 'full'>('abbreviated');
  const [savedContacts, setSavedContacts] = useState<CreditEntry[]>([]);
  const [fullSheetContacts, setFullSheetContacts] = useState<CreditEntry[]>([]);
  const [rawParsedContacts, setRawParsedContacts] = useState<ParsedContact[]>([]);
  
  // State for unsaved contacts feature
  const [unsavedExpanded, setUnsavedExpanded] = useState(false);
  const [selectedUnsaved, setSelectedUnsaved] = useState<Set<number>>(new Set());
  const [savingContacts, setSavingContacts] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    if (open && callSheetId) {
      fetchContacts();
    }
  }, [open, callSheetId]);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    setSelectedUnsaved(new Set()); // Reset selection when refetching
    try {
      // Get parsed contacts from global_call_sheets
      const { data: sheet, error: sheetError } = await supabase
        .from('global_call_sheets')
        .select('parsed_contacts')
        .eq('id', callSheetId)
        .single();

      if (sheetError) throw sheetError;

      // Build fullSheetContacts and a lookup map for role/department per call sheet
      const fullContacts: CreditEntry[] = [];
      const rawContacts: ParsedContact[] = [];
      const parsedContactMap = new Map<string, { role: string | null; department: string; originalIndex: number }>();
      
      if (sheet?.parsed_contacts && Array.isArray(sheet.parsed_contacts)) {
        (sheet.parsed_contacts as any[]).forEach((contact, index) => {
          if (!contact?.name) return;
          
          const departments = contact.departments || ['Other'];
          const roles = contact.roles || [];
          
          // Store raw parsed contact for save logic
          rawContacts.push({
            name: contact.name,
            roles: roles,
            departments: departments,
            phones: contact.phones || [],
            emails: contact.emails || [],
            ig_handle: contact.ig_handle || null,
            confidence: contact.confidence || 0.5,
          });
          
          // Store in lookup map (keyed by lowercase name)
          parsedContactMap.set(contact.name.toLowerCase(), {
            role: roles[0] || null,
            department: departments[0] || 'Other',
            originalIndex: index,
          });
          
          fullContacts.push({
            name: contact.name,
            role: roles[0] || null,
            department: departments[0] || 'Other',
            originalIndex: index,
          });
        });
      }
      setFullSheetContacts(fullContacts);
      setRawParsedContacts(rawContacts);

      // Get saved contacts linked to this call sheet
      const { data: savedLinks, error: savedError } = await supabase
        .from('contact_call_sheets')
        .select(`
          contact_id,
          crew_contacts (name, ig_handle)
        `)
        .eq('call_sheet_id', callSheetId);

      if (savedError) throw savedError;

      // Build savedContacts - use role/department from parsed contacts (THIS call sheet)
      const saved: CreditEntry[] = [];
      const seenNames = new Set<string>(); // Track names to prevent duplicates
      
      if (savedLinks) {
        savedLinks.forEach((link) => {
          const contact = link.crew_contacts as any;
          if (!contact?.name) return;
          
          const nameLower = contact.name.toLowerCase();
          
          // Skip if we've already added this person (prevent duplicates)
          if (seenNames.has(nameLower)) return;
          
          // Look up this person in parsed contacts for THIS call sheet
          const parsedMatch = parsedContactMap.get(nameLower);
          if (!parsedMatch) return; // Skip if not on this call sheet
          
          seenNames.add(nameLower); // Mark as seen
          
          saved.push({
            name: contact.name,
            role: parsedMatch.role,             // Role from THIS call sheet
            department: parsedMatch.department, // Department from THIS call sheet
            igHandle: contact.ig_handle,        // IG handle from saved contact
            originalIndex: parsedMatch.originalIndex,
          });
        });
      }
      setSavedContacts(saved);

    } catch (error: any) {
      console.error('[CreditsModal] Error fetching contacts:', error);
      toast({
        title: "Failed to load contacts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate unsaved contacts (in fullSheet but not in saved)
  const unsavedContacts = useMemo(() => {
    const savedNames = new Set(savedContacts.map(c => c.name.toLowerCase()));
    return fullSheetContacts
      .map((c, index) => ({ ...c, rawIndex: index }))
      .filter(c => !savedNames.has(c.name.toLowerCase()));
  }, [fullSheetContacts, savedContacts]);

  const sortByDepartmentAndRole = (entries: CreditEntry[]): CreditEntry[] => {
    return [...entries].sort((a, b) => {
      // Primary: Department order
      const deptOrderA = DEPARTMENT_ORDER.indexOf(a.department);
      const deptOrderB = DEPARTMENT_ORDER.indexOf(b.department);
      const deptA = deptOrderA === -1 ? 999 : deptOrderA;
      const deptB = deptOrderB === -1 ? 999 : deptOrderB;
      if (deptA !== deptB) return deptA - deptB;
      
      // Secondary: Original call sheet order
      return a.originalIndex - b.originalIndex;
    });
  };

  const formatRole = (role: string | null): string => {
    if (!role) return '';
    if (roleStyle === 'abbreviated') {
      return ROLE_ABBREVIATIONS[role] || role;
    }
    return role;
  };

  const activeContacts = useMemo(() => {
    return dataSource === 'saved' ? savedContacts : fullSheetContacts;
  }, [dataSource, savedContacts, fullSheetContacts]);

  const creditsText = useMemo(() => {
    const sorted = sortByDepartmentAndRole(activeContacts);
    
    return sorted.map(entry => {
      const role = formatRole(entry.role);
      let person = entry.name;
      
      if (dataSource === 'saved' && displayMode === 'handles' && entry.igHandle) {
        person = `@${entry.igHandle}`;
      }
      
      return role ? `${role}: ${person}` : person;
    }).join('\n');
  }, [activeContacts, dataSource, displayMode, roleStyle]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(creditsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Credits copied!",
        description: "Paste to your Instagram story",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const toggleUnsavedSelect = (rawIndex: number) => {
    const newSelected = new Set(selectedUnsaved);
    if (newSelected.has(rawIndex)) {
      newSelected.delete(rawIndex);
    } else {
      newSelected.add(rawIndex);
    }
    setSelectedUnsaved(newSelected);
  };

  const selectAllUnsaved = () => {
    if (selectedUnsaved.size === unsavedContacts.length) {
      setSelectedUnsaved(new Set());
    } else {
      setSelectedUnsaved(new Set(unsavedContacts.map(c => c.rawIndex)));
    }
  };

  const saveSelectedContacts = async () => {
    if (!userId || selectedUnsaved.size === 0) return;

    setSavingContacts(true);
    let matched = 0;
    let created = 0;
    let attributed = 0;

    try {
      // Get the raw parsed contacts for selected indices
      const contactsToSave = [...selectedUnsaved]
        .map(rawIndex => rawParsedContacts[rawIndex])
        .filter(Boolean);

      // Fetch existing contacts for dedup
      const { data: existingContactsRaw, error: fetchError } = await supabase
        .from('crew_contacts')
        .select('id, name, emails, phones, roles, departments, ig_handle')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      const existingContacts = (existingContactsRaw || []) as Array<{
        id: string;
        name: string;
        emails: string[] | null;
        phones: string[] | null;
        roles: string[] | null;
        departments: string[] | null;
        ig_handle: string | null;
      }>;

      for (const contact of contactsToSave) {
        let existingContact = null;

        // Priority 1: Exact email match
        if (!existingContact && contact.emails?.length > 0) {
          const normalizedEmails = contact.emails.map(normalizeEmail);
          existingContact = existingContacts.find(ec => 
            ec.emails?.some((e: string) => normalizedEmails.includes(normalizeEmail(e)))
          ) || null;
        }

        // Priority 2: Phone match
        if (!existingContact && contact.phones?.length > 0) {
          const normalizedPhones = contact.phones.map(normalizePhone);
          existingContact = existingContacts.find(ec => 
            ec.phones?.some((p: string) => normalizedPhones.includes(normalizePhone(p)))
          ) || null;
        }

        // Priority 3: Exact name match (case-insensitive)
        if (!existingContact && contact.name) {
          const normalizedName = contact.name.toLowerCase().trim();
          existingContact = existingContacts.find(ec => 
            ec.name?.toLowerCase().trim() === normalizedName
          ) || null;
        }

        let contactId: string;

        if (existingContact) {
          // Matched - update existing (merge arrays)
          contactId = existingContact.id;
          matched++;

          const mergedRoles = [...new Set([
            ...(existingContact.roles ?? []),
            ...(contact.roles || [])
          ])];
          const mergedDepartments = [...new Set([
            ...(existingContact.departments ?? []),
            ...(contact.departments || [])
          ])];
          const mergedEmails = [...new Set([
            ...(existingContact.emails ?? []),
            ...(contact.emails || [])
          ])];
          const mergedPhones = [...new Set([
            ...(existingContact.phones ?? []),
            ...(contact.phones || [])
          ])];

          const { error: updateError } = await supabase
            .from('crew_contacts')
            .update({
              roles: mergedRoles,
              departments: mergedDepartments,
              emails: mergedEmails,
              phones: mergedPhones,
              ig_handle: contact.ig_handle || existingContact.ig_handle
            })
            .eq('id', contactId);

          if (updateError) {
            console.warn('[CreditsModal] Update error:', updateError);
          }
        } else {
          // Create new contact
          const { data: newContact, error: insertError } = await supabase
            .from('crew_contacts')
            .insert({
              user_id: userId,
              name: contact.name,
              roles: contact.roles,
              departments: contact.departments,
              phones: contact.phones,
              emails: contact.emails,
              ig_handle: contact.ig_handle,
              confidence: contact.confidence,
              source_files: [fileName],
              needs_review: contact.confidence < 0.8
            })
            .select('id')
            .single();

          if (insertError) {
            console.warn('[CreditsModal] Insert error:', insertError);
            continue;
          }

          contactId = newContact.id;
          created++;

          // Add to local list for future matching in this batch
          existingContacts.push({
            id: contactId,
            name: contact.name,
            emails: contact.emails || [],
            phones: contact.phones || [],
            roles: contact.roles || [],
            departments: contact.departments || [],
            ig_handle: contact.ig_handle || null
          });
        }

        // Create attribution link
        const { error: linkError } = await supabase
          .from('contact_call_sheets')
          .upsert({
            contact_id: contactId,
            call_sheet_id: callSheetId
          }, { onConflict: 'contact_id,call_sheet_id' });

        if (linkError) {
          console.warn('[CreditsModal] Attribution link error:', linkError);
        } else {
          attributed++;
        }
      }

      toast({
        title: "Contacts saved",
        description: `Matched ${matched}, created ${created}. ${attributed} attributions added.`
      });

      // Clear selection and refresh
      setSelectedUnsaved(new Set());
      setUnsavedExpanded(false);
      await fetchContacts();

    } catch (error: any) {
      console.error('[CreditsModal] Save error:', error);
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSavingContacts(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col overflow-hidden min-h-0">
        <DialogHeader>
          <DialogTitle>Generate Credits</DialogTitle>
          <p className="text-sm text-muted-foreground truncate">{fileName}</p>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Options Panel */}
            <div className="grid grid-cols-3 gap-6 mb-4">
              {/* Data Source */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Data Source
                </Label>
                <RadioGroup 
                  value={dataSource} 
                  onValueChange={(v) => setDataSource(v as 'saved' | 'full')}
                  className="space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="saved" id="saved" />
                    <Label htmlFor="saved" className="text-sm cursor-pointer">
                      My Saved Contacts ({savedContacts.length})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value="full" 
                      id="full" 
                      disabled={fullSheetContacts.length === 0} 
                    />
                    <Label 
                      htmlFor="full" 
                      className={`text-sm cursor-pointer ${fullSheetContacts.length === 0 ? 'text-muted-foreground' : ''}`}
                    >
                      Full Call Sheet ({fullSheetContacts.length})
                      {fullSheetContacts.length === 0 && (
                        <span className="ml-1">(not available)</span>
                      )}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Display Mode - only for saved */}
              {dataSource === 'saved' && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Display Mode
                  </Label>
                  <RadioGroup 
                    value={displayMode} 
                    onValueChange={(v) => setDisplayMode(v as 'handles' | 'names')}
                    className="space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="handles" id="handles" />
                      <Label htmlFor="handles" className="text-sm cursor-pointer">
                        Roles & IG Handles
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="names" id="names" />
                      <Label htmlFor="names" className="text-sm cursor-pointer">
                        Roles & Names
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Role Style */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Role Style
                </Label>
                <RadioGroup 
                  value={roleStyle} 
                  onValueChange={(v) => setRoleStyle(v as 'abbreviated' | 'full')}
                  className="space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="abbreviated" id="abbreviated" />
                    <Label htmlFor="abbreviated" className="text-sm cursor-pointer">
                      Abbreviated
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="full-role" />
                    <Label htmlFor="full-role" className="text-sm cursor-pointer">
                      Full Role Names
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Unsaved Contacts Section */}
            {unsavedContacts.length > 0 && (
              <Collapsible 
                open={unsavedExpanded} 
                onOpenChange={setUnsavedExpanded}
                className="mb-4 border rounded-md bg-muted/30"
              >
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors text-left">
                    <div className="flex items-center gap-2">
                      {unsavedExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Plus className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {unsavedContacts.length} unsaved contact{unsavedContacts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Click to add to your contacts
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t p-3 space-y-3">
                    {/* Select All */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedUnsaved.size === unsavedContacts.length && unsavedContacts.length > 0}
                          onCheckedChange={selectAllUnsaved}
                        />
                        <span className="text-sm text-muted-foreground">
                          {selectedUnsaved.size > 0 
                            ? `${selectedUnsaved.size} selected` 
                            : "Select all"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={saveSelectedContacts}
                        disabled={selectedUnsaved.size === 0 || savingContacts}
                      >
                        {savingContacts ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-3 w-3 mr-1" />
                            Add {selectedUnsaved.size > 0 ? selectedUnsaved.size : ''} to Contacts
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {/* Unsaved contacts list */}
                    <ScrollArea className="max-h-40">
                      <div className="space-y-1">
                        {unsavedContacts.map((contact) => (
                          <div 
                            key={contact.rawIndex}
                            className="flex items-center gap-2 py-1 px-1 hover:bg-muted/50 rounded"
                          >
                            <Checkbox
                              checked={selectedUnsaved.has(contact.rawIndex)}
                              onCheckedChange={() => toggleUnsavedSelect(contact.rawIndex)}
                            />
                            <span className="text-sm flex-1 truncate">{contact.name}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-32">
                              {contact.role || contact.department}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Preview Panel */}
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Preview ({activeContacts.length} credits)
              {dataSource === 'full' && ' — IMDb-ready (legal names only)'}
            </div>
            
            <ScrollArea className="flex-1 min-h-0 border rounded-md p-4 bg-muted/30">
              {activeContacts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No contacts found.</p>
              ) : (
                <pre className="font-mono text-sm whitespace-pre-wrap">{creditsText}</pre>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleCopy} 
                disabled={loading || activeContacts.length === 0}
                className="gap-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy Credits'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
