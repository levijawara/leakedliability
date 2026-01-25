import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { CrewContact } from "@/pages/CrewContacts";

interface ContactEditDialogProps {
  contact: CrewContact;
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: CrewContact) => void;
}

export function ContactEditDialog({ contact, isOpen, onClose, onSave }: ContactEditDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: contact.name,
    email: contact.emails?.[0] || "",
    phone: contact.phones?.[0] || "",
    role: contact.roles?.join(", ") || "",
    department: contact.departments?.join(", ") || "",
    ig_handle: contact.ig_handle || "",
    nova_profile_url: contact.nova_profile_url || "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a contact name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const updatedData = {
        name: formData.name.trim(),
        emails: formData.email.trim() ? [formData.email.trim()] : null,
        phones: formData.phone.trim() ? [formData.phone.trim()] : null,
        roles: formData.role.trim() 
          ? formData.role.split(",").map(r => r.trim()).filter(Boolean) 
          : null,
        departments: formData.department.trim() 
          ? formData.department.split(",").map(d => d.trim()).filter(Boolean) 
          : null,
        ig_handle: formData.ig_handle.trim().replace(/^@/, '') || null,
        nova_profile_url: formData.nova_profile_url.trim() || null,
      };

      const { error } = await supabase
        .from('crew_contacts')
        .update(updatedData)
        .eq('id', contact.id);

      if (error) throw error;

      toast({
        title: "Contact updated",
        description: `${formData.name} has been saved.`
      });

      onSave({
        ...contact,
        ...updatedData,
      });
      onClose();
    } catch (error: any) {
      console.error('[ContactEditDialog] Save error:', error);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>
            Update contact information. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Full name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Roles (comma-separated)</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => handleChange("role", e.target.value)}
              placeholder="Director, Producer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Departments (comma-separated)</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => handleChange("department", e.target.value)}
              placeholder="Production, Camera"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ig_handle">Instagram Handle</Label>
              <Input
                id="ig_handle"
                value={formData.ig_handle}
                onChange={(e) => handleChange("ig_handle", e.target.value)}
                placeholder="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nova_profile_url">NOVA Profile URL</Label>
              <Input
                id="nova_profile_url"
                type="url"
                value={formData.nova_profile_url}
                onChange={(e) => handleChange("nova_profile_url", e.target.value)}
                placeholder="https://itsnova.com/username"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}