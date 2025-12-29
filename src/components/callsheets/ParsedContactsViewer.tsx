import { useState } from "react";
import { X, Save, CheckCircle, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ContactCard } from "./ContactCard";

interface ParsedContact {
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
  confidence: number;
}

interface CallSheetProp {
  id: string;
  file_name: string;
  parsed_contacts: unknown;
}

interface ParsedContactsViewerProps {
  callSheet: CallSheetProp;
  onClose: () => void;
  userId: string;
}

export function ParsedContactsViewer({ callSheet, onClose, userId }: ParsedContactsViewerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const { toast } = useToast();

  const contacts: ParsedContact[] = Array.isArray(callSheet.parsed_contacts) 
    ? callSheet.parsed_contacts 
    : [];

  const toggleSelect = (index: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((_, i) => i)));
    }
  };

  const saveSelected = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "No contacts selected",
        description: "Please select at least one contact to save.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    let successCount = 0;

    try {
      const contactsToSave = contacts.filter((_, i) => selectedIds.has(i));
      
      for (const contact of contactsToSave) {
        const { error } = await supabase
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
            source_files: [callSheet.file_name],
            needs_review: contact.confidence < 0.8
          });

        if (!error) {
          successCount++;
        } else {
          console.warn('[ParsedContactsViewer] Insert error:', error);
        }
      }

      setSavedCount(successCount);
      
      toast({
        title: "Contacts saved",
        description: `Successfully saved ${successCount} of ${selectedIds.size} contacts.`
      });

      // Clear selection for saved contacts
      setSelectedIds(new Set());

    } catch (error: any) {
      console.error('[ParsedContactsViewer] Save error:', error);
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge className="bg-green-500">High</Badge>;
    } else if (confidence >= 0.5) {
      return <Badge variant="secondary">Medium</Badge>;
    } else {
      return <Badge variant="outline">Low</Badge>;
    }
  };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Extracted Contacts
          </SheetTitle>
          <SheetDescription>
            {callSheet.file_name} • {contacts.length} contacts found
          </SheetDescription>
        </SheetHeader>

        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No contacts extracted</p>
            <p className="text-sm text-muted-foreground">
              The AI couldn't find any contacts in this call sheet
            </p>
          </div>
        ) : (
          <>
            {/* Actions Bar */}
            <div className="flex items-center justify-between py-4 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === contacts.length && contacts.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size > 0 
                    ? `${selectedIds.size} selected` 
                    : "Select all"}
                </span>
              </div>
              <Button
                onClick={saveSelected}
                disabled={selectedIds.size === 0 || saving}
                size="sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Selected
                  </>
                )}
              </Button>
            </div>

            {/* Contacts List */}
            <ScrollArea className="h-[calc(100vh-220px)] mt-4">
              <div className="space-y-3 pr-4">
                {contacts.map((contact, index) => (
                  <ContactCard
                    key={index}
                    contact={contact}
                    selected={selectedIds.has(index)}
                    onSelect={() => toggleSelect(index)}
                    confidenceBadge={getConfidenceBadge(contact.confidence)}
                  />
                ))}
              </div>
            </ScrollArea>

            {savedCount > 0 && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    {savedCount} contacts saved to your crew contacts
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
