import { useState, useEffect, useMemo } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
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

export function CreditsModal({ open, onOpenChange, callSheetId, fileName }: CreditsModalProps) {
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [dataSource, setDataSource] = useState<'saved' | 'full'>('saved');
  const [displayMode, setDisplayMode] = useState<'handles' | 'names'>('handles');
  const [roleStyle, setRoleStyle] = useState<'abbreviated' | 'full'>('abbreviated');
  const [savedContacts, setSavedContacts] = useState<CreditEntry[]>([]);
  const [fullSheetContacts, setFullSheetContacts] = useState<CreditEntry[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open && callSheetId) {
      fetchContacts();
    }
  }, [open, callSheetId]);

  const fetchContacts = async () => {
    setLoading(true);
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
      const parsedContactMap = new Map<string, { role: string | null; department: string; originalIndex: number }>();
      
      if (sheet?.parsed_contacts && Array.isArray(sheet.parsed_contacts)) {
        (sheet.parsed_contacts as any[]).forEach((contact, index) => {
          if (!contact?.name) return;
          
          const departments = contact.departments || ['Other'];
          const roles = contact.roles || [];
          
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
      if (savedLinks) {
        savedLinks.forEach((link) => {
          const contact = link.crew_contacts as any;
          if (!contact?.name) return;
          
          // Look up this person in parsed contacts for THIS call sheet
          const parsedMatch = parsedContactMap.get(contact.name.toLowerCase());
          if (!parsedMatch) return; // Skip if not on this call sheet
          
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
