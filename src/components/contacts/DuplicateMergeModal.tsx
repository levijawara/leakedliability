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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  GitMerge, 
  Loader2, 
  Users, 
  Phone, 
  Mail, 
  AtSign,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DuplicateGroup, mergeContactData } from "@/lib/duplicateDetection";
import { CrewContact } from "@/pages/CrewContacts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { IgnoreErrorsModal } from "./IgnoreErrorsModal";

interface DuplicateMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicateGroups: DuplicateGroup[];
  contacts: CrewContact[];
  userId: string;
  onMergeComplete: (deletedIds: string[], updatedContacts: CrewContact[]) => void;
}

export function DuplicateMergeModal({
  isOpen,
  onClose,
  duplicateGroups,
  contacts,
  userId,
  onMergeComplete
}: DuplicateMergeModalProps) {
  const { toast } = useToast();
  const [merging, setMerging] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([0]));
  const [primarySelections, setPrimarySelections] = useState<Record<number, string>>(() => {
    const selections: Record<number, string> = {};
    duplicateGroups.forEach((group, idx) => {
      selections[idx] = group.primary.id;
    });
    return selections;
  });
  
  // Track which groups are selected for merging (default: all selected)
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(() => {
    return new Set(duplicateGroups.map((_, idx) => idx));
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

  const toggleGroupSelection = (index: number) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedGroups(new Set(duplicateGroups.map((_, idx) => idx)));
  };

  const deselectAll = () => {
    setSelectedGroups(new Set());
  };

  const handlePrimaryChange = (groupIndex: number, contactId: string) => {
    setPrimarySelections(prev => ({ ...prev, [groupIndex]: contactId }));
  };

  const handleMergeSelected = async () => {
    if (selectedGroups.size === 0) {
      toast({
        title: "No groups selected",
        description: "Please select at least one group to merge.",
        variant: "destructive"
      });
      return;
    }

    setMerging(true);
    const deletedIds: string[] = [];
    const updatedContacts: CrewContact[] = [];

    try {
      // Only process selected groups
      const groupsToMerge = duplicateGroups.filter((_, idx) => selectedGroups.has(idx));
      
      console.log('[DuplicateMergeModal] Starting merge for', groupsToMerge.length, 'groups');
      
      for (let i = 0; i < groupsToMerge.length; i++) {
        const group = groupsToMerge[i];
        // Find the original index for primary selection lookup
        const originalIndex = duplicateGroups.indexOf(group);
        const primaryId = primarySelections[originalIndex];
        
        const allGroupContacts = [group.primary, ...group.duplicates.map(d => d.contact)];
        const primaryContact = allGroupContacts.find(c => c.id === primaryId);
        const duplicatesToMerge = allGroupContacts.filter(c => c.id !== primaryId);
        
        if (!primaryContact || duplicatesToMerge.length === 0) continue;

        const primaryFull = contacts.find(c => c.id === primaryId);
        const duplicatesFull = duplicatesToMerge
          .map(d => contacts.find(c => c.id === d.id))
          .filter(Boolean) as CrewContact[];

        if (!primaryFull) continue;

        const idsToDelete = duplicatesToMerge.map(d => d.id);
        
        console.log('[DuplicateMergeModal] Group', i + 1, {
          primaryId,
          primaryName: primaryContact.name,
          deletingIds: idsToDelete,
          deletingNames: duplicatesToMerge.map(d => d.name)
        });

        const mergedData = mergeContactData(primaryFull, duplicatesFull);
        const isFavorite = primaryFull.is_favorite || duplicatesFull.some(d => d.is_favorite);

        // UPDATE with .select() to verify rows affected
        const { data: updateData, error: updateError } = await supabase
          .from('crew_contacts')
          .update({
            phones: mergedData.phones,
            emails: mergedData.emails,
            roles: mergedData.roles,
            departments: mergedData.departments,
            ig_handle: mergedData.ig_handle,
            source_files: mergedData.source_files,
            is_favorite: isFavorite
          })
          .eq('id', primaryId)
          .select();

        console.log('[DuplicateMergeModal] Update result:', {
          updateData,
          updateError,
          rowsUpdated: updateData?.length ?? 0
        });

        if (updateError) {
          console.error('[DuplicateMergeModal] Update FAILED:', updateError);
          throw updateError;
        }

        if (!updateData || updateData.length === 0) {
          console.error('[DuplicateMergeModal] Update returned no rows - primary contact may not exist or RLS blocked');
          throw new Error(`Failed to update primary contact ${primaryContact.name}. No rows affected.`);
        }

        // STEP: Transfer contact_call_sheets links from duplicates to primary BEFORE deletion
        let transferredCount = 0;
        for (const dupId of idsToDelete) {
          const { data: dupLinks } = await supabase
            .from('contact_call_sheets')
            .select('call_sheet_id')
            .eq('contact_id', dupId);

          if (dupLinks && dupLinks.length > 0) {
            for (const link of dupLinks) {
              // Check if primary already has this link (avoid duplicates)
              const { data: existingLink } = await supabase
                .from('contact_call_sheets')
                .select('id')
                .eq('contact_id', primaryId)
                .eq('call_sheet_id', link.call_sheet_id)
                .maybeSingle();

              // If primary doesn't have this link, create it
              if (!existingLink) {
                const { error: insertError } = await supabase
                  .from('contact_call_sheets')
                  .insert({
                    contact_id: primaryId,
                    call_sheet_id: link.call_sheet_id
                  });
                
                if (!insertError) {
                  transferredCount++;
                }
              }
            }
          }
        }

        if (transferredCount > 0) {
          console.log('[DuplicateMergeModal] Transferred', transferredCount, 
            'call sheet links from duplicates to primary:', primaryContact.name);
        }

        // DELETE with .select() to verify rows affected (links already transferred)
        const { data: deleteData, error: deleteError } = await supabase
          .from('crew_contacts')
          .delete()
          .in('id', idsToDelete)
          .select();

        console.log('[DuplicateMergeModal] Delete result:', {
          deleteData,
          deleteError,
          rowsDeleted: deleteData?.length ?? 0,
          expectedDeletes: idsToDelete.length
        });

        if (deleteError) {
          console.error('[DuplicateMergeModal] Delete FAILED:', deleteError);
          throw deleteError;
        }

        // Validate delete actually removed the expected rows
        if (!deleteData || deleteData.length !== idsToDelete.length) {
          const msg = `Expected to delete ${idsToDelete.length} contacts but only ${deleteData?.length ?? 0} were deleted`;
          console.error('[DuplicateMergeModal] DELETE MISMATCH:', msg);
          toast({
            title: "Merge may have partially failed",
            description: msg,
            variant: "destructive"
          });
        }

        deletedIds.push(...idsToDelete);
        updatedContacts.push({
          ...primaryFull,
          phones: mergedData.phones,
          emails: mergedData.emails,
          roles: mergedData.roles,
          departments: mergedData.departments,
          ig_handle: mergedData.ig_handle,
          source_files: mergedData.source_files,
          is_favorite: isFavorite
        });
      }

      console.log('[DuplicateMergeModal] Merge complete:', {
        groupsMerged: groupsToMerge.length,
        totalDeleted: deletedIds.length,
        deletedIds
      });

      toast({
        title: "Merge complete",
        description: `Merged ${groupsToMerge.length} groups, removed ${deletedIds.length} duplicates.`
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
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col overflow-hidden min-h-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            Merge Duplicate Contacts
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Found {duplicateGroups.length} groups of potential duplicates. 
          Select which groups to merge.
        </p>

        {/* Selection controls */}
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm text-muted-foreground">
            {selectedGroups.size} of {duplicateGroups.length} groups selected
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              Clear
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-4">
            {duplicateGroups.map((group, groupIndex) => {
              const allContacts = [group.primary, ...group.duplicates.map(d => d.contact)];
              const isExpanded = expandedGroups.has(groupIndex);
              const selectedPrimary = primarySelections[groupIndex];
              const isSelected = selectedGroups.has(groupIndex);

              return (
                <Collapsible key={groupIndex} open={isExpanded}>
                  <div className={`border rounded-lg overflow-hidden ${isSelected ? 'border-primary/50' : 'opacity-60'}`}>
                    <CollapsibleTrigger asChild>
                      <button
                        onClick={() => toggleExpanded(groupIndex)}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => toggleGroupSelection(groupIndex)}
                            onClick={(e) => e.stopPropagation()}
                          />
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

        <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
          <Button variant="outline" onClick={onClose} disabled={merging}>
            Cancel
          </Button>
          <IgnoreErrorsButton 
            selectedGroups={selectedGroups}
            duplicateGroups={duplicateGroups}
            contacts={contacts}
            userId={userId}
            onComplete={(cleanedIds) => {
              // Trigger a refresh - pass empty arrays to signal data changed
              onMergeComplete([], []);
              onClose();
            }}
            disabled={merging}
          />
          <Button onClick={handleMergeSelected} disabled={merging || selectedGroups.size === 0}>
            {merging ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <GitMerge className="h-4 w-4 mr-2" />
                Merge Selected ({selectedGroups.size} of {duplicateGroups.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sub-component for the Ignore Errors button and modal
function IgnoreErrorsButton({
  selectedGroups,
  duplicateGroups,
  contacts,
  userId,
  onComplete,
  disabled
}: {
  selectedGroups: Set<number>;
  duplicateGroups: DuplicateGroup[];
  contacts: CrewContact[];
  userId: string;
  onComplete: (cleanedIds: string[]) => void;
  disabled: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  
  const selectedDuplicateGroups = duplicateGroups.filter((_, idx) => selectedGroups.has(idx));
  
  return (
    <>
      <Button 
        variant="secondary" 
        onClick={() => setShowModal(true)}
        disabled={disabled || selectedGroups.size === 0}
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        Ignore Errors
      </Button>
      
      {showModal && (
        <IgnoreErrorsModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          groups={selectedDuplicateGroups}
          contacts={contacts}
          userId={userId}
          onComplete={onComplete}
        />
      )}
    </>
  );
}