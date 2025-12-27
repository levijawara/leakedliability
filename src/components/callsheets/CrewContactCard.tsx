import { useState } from "react";
import { User, Mail, Phone, Briefcase, Building2, Instagram, MoreVertical, Edit2, Trash2, Save, X, EyeOff, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { maskEmail, maskPhone } from "@/lib/callsheets/privacy";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CrewContact } from "@/types/callSheet";

interface CrewContactCardProps {
  contact: CrewContact;
  onUpdate?: (contact: CrewContact) => void;
  onDelete?: (id: string) => void;
  showPrivacy?: boolean;
  className?: string;
}

export function CrewContactCard({
  contact,
  onUpdate,
  onDelete,
  showPrivacy = true,
  className,
}: CrewContactCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [editForm, setEditForm] = useState({
    name: contact.name,
    emails: contact.emails?.join(", ") || "",
    phones: contact.phones?.join(", ") || "",
    roles: contact.roles?.join(", ") || "",
    departments: contact.departments?.join(", ") || "",
    instagram_handle: contact.instagram_handle || "",
    notes: contact.notes || "",
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updatedContact = {
        name: editForm.name,
        emails: editForm.emails.split(",").map((e) => e.trim()).filter(Boolean),
        phones: editForm.phones.split(",").map((p) => p.trim()).filter(Boolean),
        roles: editForm.roles.split(",").map((r) => r.trim()).filter(Boolean),
        departments: editForm.departments.split(",").map((d) => d.trim()).filter(Boolean),
        instagram_handle: editForm.instagram_handle || null,
        notes: editForm.notes || null,
      };

      const { error } = await supabase
        .from("crew_contacts")
        .update(updatedContact)
        .eq("id", contact.id)
        .eq("user_id", user.id);

      if (error) throw error;

      onUpdate?.({ ...contact, ...updatedContact });
      setIsEditing(false);
      toast.success("Contact updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update contact");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("crew_contacts")
        .delete()
        .eq("id", contact.id)
        .eq("user_id", user.id);

      if (error) throw error;

      onDelete?.(contact.id);
      toast.success("Contact deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete contact");
    }
  };

  const displayEmail = (email: string) => {
    return showSensitive || !showPrivacy ? email : maskEmail(email);
  };

  const displayPhone = (phone: string) => {
    return showSensitive || !showPrivacy ? phone : maskPhone(phone);
  };

  if (isEditing) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Edit Contact</h4>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Emails (comma-separated)</Label>
              <Input
                value={editForm.emails}
                onChange={(e) => setEditForm({ ...editForm, emails: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
            <div>
              <Label>Phones (comma-separated)</Label>
              <Input
                value={editForm.phones}
                onChange={(e) => setEditForm({ ...editForm, phones: e.target.value })}
                placeholder="+1234567890, +0987654321"
              />
            </div>
            <div>
              <Label>Roles (comma-separated)</Label>
              <Input
                value={editForm.roles}
                onChange={(e) => setEditForm({ ...editForm, roles: e.target.value })}
                placeholder="Director, Producer"
              />
            </div>
            <div>
              <Label>Departments (comma-separated)</Label>
              <Input
                value={editForm.departments}
                onChange={(e) => setEditForm({ ...editForm, departments: e.target.value })}
                placeholder="Production, Camera"
              />
            </div>
            <div>
              <Label>Instagram Handle</Label>
              <Input
                value={editForm.instagram_handle}
                onChange={(e) => setEditForm({ ...editForm, instagram_handle: e.target.value })}
                placeholder="@username"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("group hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground">{contact.name}</h3>
              {contact.roles && contact.roles.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {contact.roles.join(", ")}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {showPrivacy && (
                <DropdownMenuItem onClick={() => setShowSensitive(!showSensitive)}>
                  {showSensitive ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show Details
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 space-y-2">
          {contact.departments && contact.departments.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {contact.departments.map((dept, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {dept}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {contact.emails && contact.emails.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {contact.emails.map(displayEmail).join(", ")}
              </span>
            </div>
          )}

          {contact.phones && contact.phones.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {contact.phones.map(displayPhone).join(", ")}
              </span>
            </div>
          )}

          {contact.instagram_handle && (
            <div className="flex items-center gap-2 text-sm">
              <Instagram className="h-4 w-4 text-muted-foreground" />
              <a
                href={`https://instagram.com/${contact.instagram_handle.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {contact.instagram_handle}
              </a>
            </div>
          )}
        </div>

        {contact.source_files && contact.source_files.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              From: {contact.source_files.join(", ")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
