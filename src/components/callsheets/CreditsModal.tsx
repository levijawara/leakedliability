import { useState, useEffect } from "react";
import { Copy, Check, Loader2, List } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
}

export function CreditsModal({ open, onOpenChange, callSheetId, fileName }: CreditsModalProps) {
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<Map<string, CreditEntry[]>>(new Map());
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && callSheetId) {
      generateCredits();
    }
  }, [open, callSheetId]);

  const generateCredits = async () => {
    setLoading(true);
    try {
      // Get saved contacts linked to this call sheet
      const { data: savedLinks, error: savedError } = await supabase
        .from('contact_call_sheets')
        .select(`
          contact_id,
          crew_contacts (name, roles, departments)
        `)
        .eq('call_sheet_id', callSheetId);

      if (savedError) throw savedError;

      // Get parsed contacts from global_call_sheets
      const { data: sheet, error: sheetError } = await supabase
        .from('global_call_sheets')
        .select('parsed_contacts')
        .eq('id', callSheetId)
        .single();

      if (sheetError) throw sheetError;

      const creditMap = new Map<string, CreditEntry[]>();

      // Process saved contacts
      if (savedLinks) {
        for (const link of savedLinks) {
          const contact = link.crew_contacts as any;
          if (!contact?.name) continue;
          
          const departments = contact.departments || ['Other'];
          const roles = contact.roles || [];
          
          for (const dept of departments) {
            const deptKey = dept || 'Other';
            if (!creditMap.has(deptKey)) {
              creditMap.set(deptKey, []);
            }
            creditMap.get(deptKey)!.push({
              name: contact.name,
              role: roles[0] || null,
              department: deptKey,
            });
          }
        }
      }

      // Process parsed contacts (if no saved contacts, or to supplement)
      if (sheet?.parsed_contacts && Array.isArray(sheet.parsed_contacts)) {
        for (const contact of sheet.parsed_contacts as any[]) {
          if (!contact?.name) continue;
          
          const departments = contact.departments || ['Other'];
          const roles = contact.roles || [];
          
          for (const dept of departments) {
            const deptKey = dept || 'Other';
            if (!creditMap.has(deptKey)) {
              creditMap.set(deptKey, []);
            }
            
            // Avoid duplicates by name+role
            const existing = creditMap.get(deptKey)!;
            const isDuplicate = existing.some(e => 
              e.name.toLowerCase() === contact.name.toLowerCase() &&
              e.role === (roles[0] || null)
            );
            
            if (!isDuplicate) {
              existing.push({
                name: contact.name,
                role: roles[0] || null,
                department: deptKey,
              });
            }
          }
        }
      }

      // Sort entries within each department by name
      for (const [dept, entries] of creditMap) {
        entries.sort((a, b) => a.name.localeCompare(b.name));
      }

      setCredits(creditMap);
    } catch (error: any) {
      console.error('[CreditsModal] Error generating credits:', error);
      toast({
        title: "Failed to generate credits",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCreditsText = (): string => {
    const lines: string[] = [];
    
    // Sort departments alphabetically
    const sortedDepts = Array.from(credits.keys()).sort();
    
    for (const dept of sortedDepts) {
      const entries = credits.get(dept) || [];
      if (entries.length === 0) continue;
      
      lines.push(dept.toUpperCase());
      for (const entry of entries) {
        if (entry.role) {
          lines.push(`${entry.name} - ${entry.role}`);
        } else {
          lines.push(entry.name);
        }
      }
      lines.push(''); // Empty line between departments
    }
    
    return lines.join('\n').trim();
  };

  const handleCopy = async () => {
    const text = formatCreditsText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Credits copied",
        description: "Credits list copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const totalContacts = Array.from(credits.values()).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Credits
          </DialogTitle>
          <p className="text-sm text-muted-foreground truncate">{fileName}</p>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : credits.size === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No contacts found for this call sheet.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {totalContacts} contact{totalContacts !== 1 ? 's' : ''} in {credits.size} department{credits.size !== 1 ? 's' : ''}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy All
                  </>
                )}
              </Button>
            </div>
            
            <ScrollArea className="flex-1 max-h-[50vh] border rounded-md p-4 bg-muted/30">
              <div className="space-y-4 font-mono text-sm">
                {Array.from(credits.keys()).sort().map(dept => (
                  <div key={dept}>
                    <p className="font-bold text-foreground mb-1">{dept.toUpperCase()}</p>
                    {credits.get(dept)?.map((entry, idx) => (
                      <p key={`${entry.name}-${idx}`} className="text-muted-foreground pl-2">
                        {entry.role ? `${entry.name} - ${entry.role}` : entry.name}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
