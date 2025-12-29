import { useState } from "react";
import { 
  Loader2, 
  Trash2, 
  Edit,
  Star,
  Users,
  Mail,
  Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ContactEditDialog } from "./ContactEditDialog";
import type { CrewContact } from "@/pages/CrewContacts";

interface ContactsTableProps {
  contacts: CrewContact[];
  userId: string;
  onContactUpdate: (contact: CrewContact) => void;
  onContactDelete: (contactId: string) => void;
}

export function ContactsTable({ 
  contacts, 
  userId, 
  onContactUpdate, 
  onContactDelete 
}: ContactsTableProps) {
  const [editContact, setEditContact] = useState<CrewContact | null>(null);
  const [deleteContact, setDeleteContact] = useState<CrewContact | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deleteContact) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('crew_contacts')
        .delete()
        .eq('id', deleteContact.id);

      if (error) throw error;

      onContactDelete(deleteContact.id);
      toast({
        title: "Contact deleted",
        description: `${deleteContact.name} has been removed.`
      });
      setDeleteContact(null);
    } catch (error: any) {
      console.error('[ContactsTable] Delete error:', error);
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFavorite = async (contact: CrewContact) => {
    setTogglingFavorite(contact.id);
    try {
      const newValue = !contact.is_favorite;
      const { error } = await supabase
        .from('crew_contacts')
        .update({ is_favorite: newValue })
        .eq('id', contact.id);

      if (error) throw error;

      onContactUpdate({ ...contact, is_favorite: newValue });
    } catch (error: any) {
      console.error('[ContactsTable] Favorite toggle error:', error);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTogglingFavorite(null);
    }
  };

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No contacts found</p>
        <p className="text-sm text-muted-foreground">
          Upload call sheets to extract crew contacts
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Role / Department</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleFavorite(contact)}
                    disabled={togglingFavorite === contact.id}
                    className="p-0 h-auto"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        contact.is_favorite 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-muted-foreground'
                      }`}
                    />
                  </Button>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{contact.name}</span>
                    {contact.ig_handle && (
                      <a 
                        href={`https://instagram.com/${contact.ig_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        @{contact.ig_handle}
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm">
                    {contact.emails?.[0] && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{contact.emails[0]}</span>
                        {contact.emails.length > 1 && (
                          <Badge variant="outline" className="text-xs">+{contact.emails.length - 1}</Badge>
                        )}
                      </div>
                    )}
                    {contact.phones?.[0] && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{contact.phones[0]}</span>
                        {contact.phones.length > 1 && (
                          <Badge variant="outline" className="text-xs">+{contact.phones.length - 1}</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {contact.roles?.slice(0, 2).map((role, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                    {(contact.roles?.length || 0) > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{contact.roles!.length - 2}
                      </Badge>
                    )}
                  </div>
                  {contact.departments?.[0] && (
                    <span className="text-xs text-muted-foreground block mt-1">
                      {contact.departments[0]}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {contact.project_title || '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditContact(contact)}
                      title="Edit contact"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteContact(contact)}
                      title="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
            <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteContact?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}