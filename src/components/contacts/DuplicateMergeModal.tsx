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
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  GitMerge, 
  Loader2, 
  Users, 
  Phone, 
  Mail, 
  AtSign,
  ChevronDown,
  ChevronUp,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DuplicateGroup, mergeContactData } from "@/lib/duplicateDetection";
import { CrewContact } from "@/pages/CrewContacts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DuplicateMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicateGroups: DuplicateGroup[];
  contacts: CrewContact[];
  onMergeComplete: (deletedIds: string[], updatedContacts: CrewContact[]) => void;
}

export function DuplicateMergeModal({
  isOpen,
  onClose,
  duplicateGroups,
  contacts,
  onMergeComplete
}: DuplicateMergeModalProps) {
  const { toast } = useToast();
  const [merging, setMerging] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([0]));
  const [primarySelections, setPrimarySelections] = useState<Record<number, string>>(() => {
    // Default to first contact (existing primary) in each group
    const selections: Record<number, string> = {};
    duplicateGroups.forEach((group, idx) => {
      selections[idx] = group.primary.id;
    });
    return selections;
  });

  const toggleExpanded = (index: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handlePrimaryChange = (groupIndex: number, contactId: string) => {
    setPrimarySelections(prev => ({ ...prev, [groupIndex]: contactId }));
  };

  const handleMergeAll = async () => {
    setMerging(true);
    const deletedIds: string[] = [];
    const updatedContacts: CrewContact[] = [];

    try {
      for (let i = 0; i < duplicateGroups.length; i++) {
        const group = duplicateGroups[i];
        const primaryId = primarySelections[i];
        
        // Get all contacts in this group
        const allGroupContacts = [group.primary, ...group.duplicates.map(d => d.contact)];
        const primaryContact = allGroupContacts.find(c => c.id === primaryId);
        const duplicatesToMerge = allGroupContacts.filter(c => c.id !== primaryId);
        
        if (!primaryContact || duplicatesToMerge.length === 0) continue;

        // Get full contact data for merging
        const primaryFull = contacts.find(c => c.id === primaryId);
        const duplicatesFull = duplicatesToMerge
          .map(d => contacts.find(c => c.id === d.id))
          .filter(Boolean) as CrewContact[];

        if (!primaryFull) continue;

        // Merge data
        const mergedData = mergeContactData(primaryFull, duplicatesFull);
        
        // Also merge is_favorite (keep true if any is favorited)
        const isFavorite = primaryFull.is_favorite || duplicatesFull.some(d => d.is_favorite);

        // Update primary contact
        const { error: updateError } = await supabase
          .from('crew_contacts')
          .update({
            phones: mergedData.phones,
            emails: mergedData.emails,
            roles: mergedData.roles,
            departments: mergedData.departments,
            ig_handle: mergedData.ig_handle,
            is_favorite: isFavorite
          })
          .eq('id', primaryId);

        if (updateError) {
          console.error('[DuplicateMergeModal] Update error:', updateError);
          throw updateError;
        }

        // Delete duplicates
        const idsToDelete = duplicatesToMerge.map(d => d.id);
        const { error: deleteError } = await supabase
          .from('crew_contacts')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          console.error('[DuplicateMergeModal] Delete error:', deleteError);
          throw deleteError;
        }

        deletedIds.push(...idsToDelete);
        updatedContacts.push({
          ...primaryFull,
          phones: mergedData.phones,
          emails: mergedData.emails,
          roles: mergedData.roles,
          departments: mergedData.departments,
          ig_handle: mergedData.ig_handle,
          is_favorite: isFavorite
        });
      }

      toast({
        title: "Merge complete",
        description: `Merged ${duplicateGroups.length} groups, removed ${deletedIds.length} duplicates.`
      });

      onMergeComplete(deletedIds, updatedContacts);
      onClose();
    } catch (error: any) {
      console.error('[DuplicateMergeModal] Merge failed:', error);
      toast({
        title: "Merge failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setMerging(false);
    }
  };

  const getContactById = (id: string) => contacts.find(c => c.id === id);

  const getMatchFieldBadge = (field: string) => {
    const icons: Record<string, React.ReactNode> = {
      name: <Users className="h-3 w-3" />,
      phone: <Phone className="h-3 w-3" />,
      email: <Mail className="h-3 w-3" />,
      ig: <AtSign className="h-3 w-3" />,
      role: null
    };
    
    return (
      <Badge key={field} variant="secondary" className="text-xs gap-1">
        {icons[field]}
        {field}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            Merge Duplicate Contacts
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Found {duplicateGroups.length} groups of potential duplicates. 
          Select which contact to keep as the primary for each group.
        </p>

        <ScrollArea className="flex-1 max-h-[50vh] pr-4">
          <div className="space-y-4">
            {duplicateGroups.map((group, groupIndex) => {
              const allContacts = [group.primary, ...group.duplicates.map(d => d.contact)];
              const isExpanded = expandedGroups.has(groupIndex);
              const selectedPrimary = primarySelections[groupIndex];

              return (
                <Collapsible key={groupIndex} open={isExpanded}>
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button
                        onClick={() => toggleExpanded(groupIndex)}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{allContacts.length} contacts</Badge>
                          <span className="font-medium">{group.primary.name}</span>
                          <span className="text-muted-foreground text-sm">
                            + {group.duplicates.length} duplicate{group.duplicates.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <Separator />
                      <div className="p-3 space-y-2">
                        <p className="text-xs text-muted-foreground mb-2">
                          Select the primary contact (others will be merged into it):
                        </p>
                        <RadioGroup
                          value={selectedPrimary}
                          onValueChange={(value) => handlePrimaryChange(groupIndex, value)}
                          className="space-y-2"
                        >
                          {allContacts.map((contact, contactIndex) => {
                            const fullContact = getContactById(contact.id);
                            const matchInfo = contactIndex > 0 
                              ? group.duplicates[contactIndex - 1]?.matchedFields 
                              : null;

                            return (
                              <div
                                key={contact.id}
                                className={`flex items-start gap-3 p-2 rounded-lg border ${
                                  selectedPrimary === contact.id 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-transparent'
                                }`}
                              >
                                <RadioGroupItem value={contact.id} id={contact.id} className="mt-1" />
                                <Label htmlFor={contact.id} className="flex-1 cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{contact.name}</span>
                                    {selectedPrimary === contact.id && (
                                      <Badge variant="default" className="text-xs">
                                        <Check className="h-3 w-3 mr-1" />
                                        Primary
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                    {fullContact?.phones && fullContact.phones.length > 0 && (
                                      <div className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {fullContact.phones.join(', ')}
                                      </div>
                                    )}
                                    {fullContact?.emails && fullContact.emails.length > 0 && (
                                      <div className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {fullContact.emails.join(', ')}
                                      </div>
                                    )}
                                    {fullContact?.ig_handle && (
                                      <div className="flex items-center gap-1">
                                        <AtSign className="h-3 w-3" />
                                        {fullContact.ig_handle}
                                      </div>
                                    )}
                                    {fullContact?.roles && fullContact.roles.length > 0 && (
                                      <div>Roles: {fullContact.roles.join(', ')}</div>
                                    )}
                                  </div>

                                  {matchInfo && matchInfo.length > 0 && (
                                    <div className="flex items-center gap-1 mt-2">
                                      <span className="text-xs text-muted-foreground">Matched:</span>
                                      {matchInfo.map(getMatchFieldBadge)}
                                    </div>
                                  )}
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={merging}>
            Cancel
          </Button>
          <Button onClick={handleMergeAll} disabled={merging}>
            {merging ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <GitMerge className="h-4 w-4 mr-2" />
                Merge All ({duplicateGroups.length} groups)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
