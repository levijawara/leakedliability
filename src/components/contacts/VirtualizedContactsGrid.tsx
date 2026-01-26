import { useState, useCallback } from "react";
import { Users } from "lucide-react";
import { CrewContactCard } from "./CrewContactCard";
import { ContactEditDialog } from "./ContactEditDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { CrewContact } from "@/pages/CrewContacts";

interface VirtualizedContactsGridProps {
  contacts: CrewContact[];
  callSheetCounts: Record<string, number>;
  youtubeViewCounts?: Record<string, number>;
  userId: string;
  onContactUpdate: (contact: CrewContact) => void;
  onContactDelete: (contactId: string) => void;
  showContactInfo: boolean;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, event?: React.MouseEvent) => void;
}

export function VirtualizedContactsGrid({
  contacts,
  callSheetCounts,
  youtubeViewCounts = {},
  userId,
  onContactUpdate,
  onContactDelete,
  showContactInfo,
  selectMode = false,
  selectedIds = new Set(),
  onToggleSelect
}: VirtualizedContactsGridProps) {
  const { toast } = useToast();
  const [editContact, setEditContact] = useState<CrewContact | null>(null);
  const [deleteContact, setDeleteContact] = useState<CrewContact | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null);

  const handleToggleFavorite = useCallback(async (contact: CrewContact) => {
    setTogglingFavoriteId(contact.id);
    try {
      const { error } = await supabase
        .from('crew_contacts')
        .update({ is_favorite: !contact.is_favorite })
        .eq('id', contact.id)
        .eq('user_id', userId);

      if (error) throw error;

      onContactUpdate({ ...contact, is_favorite: !contact.is_favorite });
      toast({
        title: contact.is_favorite ? "Removed from favorites" : "Added to favorites",
      });
    } catch (error: any) {
      console.error('[VirtualizedContactsGrid] Toggle favorite error:', error);
      toast({
        title: "Failed to update favorite",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTogglingFavoriteId(null);
    }
  }, [userId, onContactUpdate, toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteContact) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('crew_contacts')
        .delete()
        .eq('id', deleteContact.id)
        .eq('user_id', userId);

      if (error) throw error;

      onContactDelete(deleteContact.id);
      toast({ title: "Contact deleted" });
      setDeleteContact(null);
    } catch (error: any) {
      console.error('[VirtualizedContactsGrid] Delete error:', error);
      toast({
        title: "Failed to delete contact",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  }, [deleteContact, userId, onContactDelete, toast]);

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg">
        <Users className="h-12 w-12 mb-4" />
        <p>No contacts found</p>
      </div>
    );
  }

  return (
    <>
      {/* Auto-fill grid: 3+ columns on large, 2 on medium, 1 on mobile */}
      <div 
        className="overflow-auto"
        style={{ maxHeight: '70vh' }}
      >
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(360px,1fr))] p-1">
          {contacts.map((contact) => (
            <CrewContactCard
              key={contact.id}
              contact={contact}
              callSheetCount={callSheetCounts[contact.id] || 0}
              youtubeViewCount={youtubeViewCounts[contact.id] || 0}
              onToggleFavorite={handleToggleFavorite}
              onEdit={setEditContact}
              onDelete={setDeleteContact}
              isTogglingFavorite={togglingFavoriteId === contact.id}
              showContactInfo={showContactInfo}
              selectMode={selectMode}
              isSelected={selectedIds.has(contact.id)}
              onToggleSelect={(e) => onToggleSelect?.(contact.id, e)}
            />
          ))}
        </div>
      </div>

      {/* Edit Dialog */}
      {editContact && (
        <ContactEditDialog
          contact={editContact}
          isOpen={!!editContact}
          onClose={() => setEditContact(null)}
          onSave={onContactUpdate}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteContact} onOpenChange={() => setDeleteContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteContact?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
