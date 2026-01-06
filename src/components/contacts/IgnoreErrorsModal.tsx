import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangle, 
  Loader2, 
  Phone, 
  Mail, 
  AtSign,
  Briefcase,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DuplicateGroup } from "@/lib/duplicateDetection";
import { CrewContact } from "@/pages/CrewContacts";

interface SharedValue {
  type: 'email' | 'phone' | 'ig' | 'role';
  value: string;
  // Who "owns" this value - null = not decided, 'both' = both keep it
  owner: string | 'both' | null;
}

interface IgnoreErrorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: DuplicateGroup[];
  contacts: CrewContact[];
  userId: string;
  onComplete: (cleanedContactIds: string[]) => void;
}

export function IgnoreErrorsModal({
  isOpen,
  onClose,
  groups,
  contacts,
  userId,
  onComplete
}: IgnoreErrorsModalProps) {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  
  // Track ownership decisions per group: { [groupIndex]: { [valueKey]: owner } }
  const [decisions, setDecisions] = useState<Record<number, Record<string, string | 'both'>>>({});

  const currentGroup = groups[currentGroupIndex];
  
  if (!currentGroup) {
    return null;
  }

  const allContacts = [currentGroup.primary, ...currentGroup.duplicates.map(d => d.contact)];
  const contact1 = allContacts[0];
  const contact2 = allContacts[1]; // For simplicity, handle pairs
  
  const fullContact1 = contacts.find(c => c.id === contact1.id);
  const fullContact2 = contacts.find(c => c.id === contact2.id);

  // Find shared values that caused the match
  const getSharedValues = (): SharedValue[] => {
    const shared: SharedValue[] = [];
    
    // Shared emails
    const emails1 = (fullContact1?.emails || []).map(e => e.toLowerCase());
    const emails2 = (fullContact2?.emails || []).map(e => e.toLowerCase());
    for (const email of emails1) {
      if (emails2.includes(email)) {
        shared.push({ type: 'email', value: email, owner: null });
      }
    }
    
    // Shared phones
    const phones1 = (fullContact1?.phones || []).map(p => p.replace(/\D/g, ''));
    const phones2 = (fullContact2?.phones || []).map(p => p.replace(/\D/g, ''));
    for (const phone of phones1) {
      if (phone && phones2.includes(phone)) {
        // Find original format
        const original = fullContact1?.phones?.find(p => p.replace(/\D/g, '') === phone) || phone;
        shared.push({ type: 'phone', value: original, owner: null });
      }
    }
    
    // Shared IG
    const ig1 = fullContact1?.ig_handle?.toLowerCase().replace('@', '');
    const ig2 = fullContact2?.ig_handle?.toLowerCase().replace('@', '');
    if (ig1 && ig2 && ig1 === ig2) {
      shared.push({ type: 'ig', value: fullContact1?.ig_handle || ig1, owner: null });
    }
    
    // Shared roles
    const roles1 = (fullContact1?.roles || []).map(r => r.toLowerCase());
    const roles2 = (fullContact2?.roles || []).map(r => r.toLowerCase());
    for (const role of fullContact1?.roles || []) {
      if (roles2.includes(role.toLowerCase())) {
        shared.push({ type: 'role', value: role, owner: null });
      }
    }
    
    return shared;
  };

  const sharedValues = getSharedValues();
  const groupDecisions = decisions[currentGroupIndex] || {};

  const getDecision = (value: SharedValue): string | 'both' | null => {
    return groupDecisions[`${value.type}:${value.value}`] || null;
  };

  const setDecision = (value: SharedValue, owner: string | 'both') => {
    setDecisions(prev => ({
      ...prev,
      [currentGroupIndex]: {
        ...(prev[currentGroupIndex] || {}),
        [`${value.type}:${value.value}`]: owner
      }
    }));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'ig': return <AtSign className="h-4 w-4" />;
      case 'role': return <Briefcase className="h-4 w-4" />;
      default: return null;
    }
  };

  const handleApply = async () => {
    setProcessing(true);
    const cleanedIds: string[] = [];
    
    try {
      // Process all groups with decisions
      for (let gIdx = 0; gIdx < groups.length; gIdx++) {
        const group = groups[gIdx];
        const groupDec = decisions[gIdx];
        if (!groupDec) continue;

        const allGroupContacts = [group.primary, ...group.duplicates.map(d => d.contact)];
        const c1 = allGroupContacts[0];
        const c2 = allGroupContacts[1];
        const full1 = contacts.find(c => c.id === c1.id);
        const full2 = contacts.find(c => c.id === c2.id);

        for (const [key, owner] of Object.entries(groupDec)) {
          const [type, ...valueParts] = key.split(':');
          const value = valueParts.join(':'); // Handle values with colons

          if (owner === 'both') {
            // Both keep it - just record exception, no data removal
            await supabase.from('contact_dedupe_exceptions').upsert({
              user_id: userId,
              contact_id_a: c1.id,
              contact_id_b: c2.id,
              field_type: type,
              field_value: value
            }, { onConflict: 'user_id,contact_id_a,contact_id_b,field_type,field_value' });
            continue;
          }

          // Remove value from the contact that doesn't own it
          const removeFromId = owner === c1.id ? c2.id : c1.id;
          const removeFromFull = owner === c1.id ? full2 : full1;

          if (!removeFromFull) continue;

          // Build update based on field type
          if (type === 'email') {
            const newEmails = (removeFromFull.emails || []).filter(
              e => e.toLowerCase() !== value.toLowerCase()
            );
            await supabase
              .from('crew_contacts')
              .update({ emails: newEmails })
              .eq('id', removeFromId);
          } else if (type === 'phone') {
            const normalizedValue = value.replace(/\D/g, '');
            const newPhones = (removeFromFull.phones || []).filter(
              p => p.replace(/\D/g, '') !== normalizedValue
            );
            await supabase
              .from('crew_contacts')
              .update({ phones: newPhones })
              .eq('id', removeFromId);
          } else if (type === 'ig') {
            await supabase
              .from('crew_contacts')
              .update({ ig_handle: null })
              .eq('id', removeFromId);
          }
          // Roles: we don't remove roles, just record exception

          // Record exception to prevent future false matches
          await supabase.from('contact_dedupe_exceptions').upsert({
            user_id: userId,
            contact_id_a: c1.id,
            contact_id_b: c2.id,
            field_type: type,
            field_value: value
          }, { onConflict: 'user_id,contact_id_a,contact_id_b,field_type,field_value' });

          if (!cleanedIds.includes(removeFromId)) {
            cleanedIds.push(removeFromId);
          }
        }
      }

      toast({
        title: "Data corrected",
        description: `Fixed ${Object.keys(decisions).length} duplicate group(s). These contacts won't be flagged as duplicates again.`
      });

      onComplete(cleanedIds);
      onClose();
    } catch (error: any) {
      console.error('[IgnoreErrorsModal] Failed:', error);
      toast({
        title: "Failed to apply corrections",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const hasAnyDecisions = Object.keys(decisions).length > 0 && 
    Object.values(decisions).some(d => Object.keys(d).length > 0);

  const allValuesDecided = sharedValues.every(v => getDecision(v) !== null);
  
  const canGoNext = currentGroupIndex < groups.length - 1;
  const canGoPrev = currentGroupIndex > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Correct Data Errors
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Group {currentGroupIndex + 1} of {groups.length}: Choose who should <strong>keep</strong> each shared value.
        </p>

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="text-center flex-1">
            <p className="font-medium">{contact1.name}</p>
            <p className="text-xs text-muted-foreground">Contact A</p>
          </div>
          <div className="text-muted-foreground text-sm px-4">vs</div>
          <div className="text-center flex-1">
            <p className="font-medium">{contact2.name}</p>
            <p className="text-xs text-muted-foreground">Contact B</p>
          </div>
        </div>

        <ScrollArea className="max-h-[300px]">
          <div className="space-y-4">
            {sharedValues.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No shared values found to correct.
              </p>
            ) : (
              sharedValues.map((sv, idx) => {
                const decision = getDecision(sv);
                return (
                  <div key={idx} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {getIcon(sv.type)}
                      <Badge variant="secondary">{sv.type}</Badge>
                      <code className="text-sm bg-muted px-2 py-0.5 rounded flex-1 truncate">
                        {sv.value}
                      </code>
                    </div>
                    
                    <RadioGroup
                      value={decision || ''}
                      onValueChange={(val) => setDecision(sv, val as string | 'both')}
                      className="flex gap-4 pt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={contact1.id} id={`${idx}-c1`} />
                        <Label htmlFor={`${idx}-c1`} className="text-sm cursor-pointer">
                          {contact1.name.split(' ')[0]} keeps
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={contact2.id} id={`${idx}-c2`} />
                        <Label htmlFor={`${idx}-c2`} className="text-sm cursor-pointer">
                          {contact2.name.split(' ')[0]} keeps
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="both" id={`${idx}-both`} />
                        <Label htmlFor={`${idx}-both`} className="text-sm cursor-pointer">
                          Both keep
                        </Label>
                      </div>
                    </RadioGroup>
                    
                    {decision && decision !== 'both' && (
                      <p className="text-xs text-amber-600">
                        Will remove from {decision === contact1.id ? contact2.name : contact1.name}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            {canGoPrev && (
              <Button variant="outline" size="sm" onClick={() => setCurrentGroupIndex(i => i - 1)}>
                Previous
              </Button>
            )}
            {canGoNext && (
              <Button variant="outline" size="sm" onClick={() => setCurrentGroupIndex(i => i + 1)}>
                Next Group
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={processing}>
              Cancel
            </Button>
            <Button 
              onClick={handleApply} 
              disabled={processing || !hasAnyDecisions}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Apply Corrections
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
