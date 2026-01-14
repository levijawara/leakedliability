import { useState, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
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
import { censorEmail, censorPhone } from "@/lib/utils";
import type { CrewContact } from "@/pages/CrewContacts";

interface VirtualizedContactsTableProps {
  contacts: CrewContact[];
  userId: string | undefined;
  onContactUpdate: (contact: CrewContact) => void;
  onContactDelete: (contactId: string) => void;
  showContactInfo: boolean;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

// Increased for more breathing room
const ROW_HEIGHT = 72;

export function VirtualizedContactsTable({ 
  contacts, 
  userId, 
  onContactUpdate, 
  onContactDelete,
  showContactInfo,
  selectMode = false,
  selectedIds = new Set(),
  onToggleSelect
}: VirtualizedContactsTableProps) {
  const [editContact, setEditContact] = useState<CrewContact | null>(null);
  const [deleteContact, setDeleteContact] = useState<CrewContact | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);
  const { toast } = useToast();
  
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: contacts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const handleDelete = useCallback(async () => {
    if (!deleteContact || !userId) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('crew_contacts')
        .delete()
        .eq('id', deleteContact.id)
        .eq('user_id', userId);

      if (error) throw error;

      onContactDelete(deleteContact.id);
      toast({
        title: "Contact deleted",
        description: `${deleteContact.name} has been removed.`
      });
      setDeleteContact(null);
    } catch (error: any) {
      console.error('[VirtualizedContactsTable] Delete error:', error);
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  }, [deleteContact, onContactDelete, toast, userId]);

  const handleToggleFavorite = useCallback(async (contact: CrewContact) => {
    if (!userId) return;
    
    setTogglingFavorite(contact.id);
    try {
      const newValue = !contact.is_favorite;
      const { error } = await supabase
        .from('crew_contacts')
        .update({ is_favorite: newValue })
        .eq('id', contact.id)
        .eq('user_id', userId);

      if (error) throw error;

      onContactUpdate({ ...contact, is_favorite: newValue });
    } catch (error: any) {
      console.error('[VirtualizedContactsTable] Favorite toggle error:', error);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTogglingFavorite(null);
    }
  }, [onContactUpdate, toast, userId]);

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No contacts found</p>
        <p className="text-sm text-muted-foreground">
          Upload call sheets to extract crew contacts
        </p>
      </div>
    );
  }

  // Column widths (no project column)
  const colWidths = selectMode 
    ? ['40px', '40px', '220px', '220px', '1fr', '100px']
    : ['40px', '220px', '220px', '1fr', '100px'];

  const ColGroup = () => (
    <colgroup>
      {colWidths.map((w, i) => (
        <col key={i} style={{ width: w }} />
      ))}
    </colgroup>
  );

  // Helper to build full contact tooltip
  const buildContactTooltip = (contact: CrewContact) => {
    const items: { type: 'email' | 'phone'; value: string }[] = [];
    contact.emails?.forEach(e => items.push({ type: 'email', value: e }));
    contact.phones?.forEach(p => items.push({ type: 'phone', value: p }));
    return items;
  };

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        {/* Fixed header table */}
        <div className="w-full overflow-hidden">
          <table className="w-full caption-bottom text-sm table-fixed">
            <ColGroup />
            <TableHeader>
              <TableRow>
                {selectMode && <TableHead></TableHead>}
                <TableHead></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
          </table>
        </div>
        
        {/* Scrollable virtualized body */}
        <div 
          ref={parentRef}
          className="overflow-auto"
          style={{ height: `min(${contacts.length * ROW_HEIGHT}px, 70vh)` }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            <table className="w-full caption-bottom text-sm table-fixed">
              <ColGroup />
              <TableBody>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const contact = contacts[virtualRow.index];
                  const allContactInfo = buildContactTooltip(contact);
                  const hasMultipleContacts = allContactInfo.length > 1;
                  
                  // Show only primary contact (email preferred, then phone)
                  const primaryEmail = contact.emails?.[0];
                  const primaryPhone = contact.phones?.[0];
                  const primaryContact = primaryEmail || primaryPhone;
                  const primaryType = primaryEmail ? 'email' : 'phone';
                  
                  // Show only 1 role badge
                  const primaryRole = contact.roles?.[0];
                  const extraRolesCount = (contact.roles?.length || 0) - 1;
                  
                  return (
                    <TableRow
                      key={contact.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                        display: 'table',
                        tableLayout: 'fixed',
                      }}
                    >
                      {selectMode && (
                        <TableCell style={{ width: '40px' }}>
                          <Checkbox
                            checked={selectedIds.has(contact.id)}
                            onCheckedChange={() => onToggleSelect?.(contact.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell style={{ width: '40px' }}>
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
                      <TableCell style={{ width: '200px' }} className="font-medium">
                        <div className="flex flex-col">
                          <span className="truncate">{contact.name}</span>
                          {contact.ig_handle && (
                            <a 
                              href={`https://instagram.com/${contact.ig_handle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate"
                            >
                              @{contact.ig_handle}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      
                      {/* Simplified contact column - show only primary with tooltip for more */}
                      <TableCell style={{ width: '200px' }}>
                        {primaryContact ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-default">
                                {primaryType === 'email' ? (
                                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                ) : (
                                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                                )}
                                <span className="truncate">
                                  {showContactInfo 
                                    ? primaryContact 
                                    : primaryType === 'email' 
                                      ? censorEmail(primaryContact) 
                                      : censorPhone(primaryContact)
                                  }
                                </span>
                                {hasMultipleContacts && (
                                  <Badge variant="outline" className="text-xs flex-shrink-0 ml-1">
                                    +{allContactInfo.length - 1}
                                  </Badge>
                                )}
                              </div>
                            </TooltipTrigger>
                            {hasMultipleContacts && (
                              <TooltipContent side="top" className="max-w-[280px]">
                                <div className="space-y-1 text-xs">
                                  {allContactInfo.map((info, idx) => (
                                    <p key={idx} className="flex items-center gap-1.5">
                                      {info.type === 'email' ? (
                                        <Mail className="h-3 w-3" />
                                      ) : (
                                        <Phone className="h-3 w-3" />
                                      )}
                                      {showContactInfo 
                                        ? info.value 
                                        : info.type === 'email' 
                                          ? censorEmail(info.value) 
                                          : censorPhone(info.value)
                                      }
                                    </p>
                                  ))}
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      
                      {/* Role column - no departments */}
                      <TableCell style={{ width: '200px' }}>
                        {primaryRole ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs truncate max-w-[120px]">
                              {primaryRole}
                            </Badge>
                            {extraRolesCount > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs cursor-help">
                                    +{extraRolesCount}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px]">
                                  <p className="text-xs">{contact.roles?.slice(1).join(", ")}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        ) : null}
                      </TableCell>
                      
                      
                      <TableCell style={{ width: '100px' }} className="text-right">
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
                  );
                })}
              </TableBody>
            </table>
          </div>
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
    </TooltipProvider>
  );
}
