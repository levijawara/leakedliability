import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CrewContact } from "@/types/callSheet";
import { User, Mail, Phone, Briefcase, Building2, Instagram, FileText } from "lucide-react";

interface MergeContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactA: CrewContact;
  contactB: CrewContact;
  onMergeComplete: () => void;
}

type MergeField = "name" | "emails" | "phones" | "roles" | "departments" | "instagram_handle" | "source_files";

interface MergeSelection {
  name: "a" | "b";
  emails: "a" | "b" | "both";
  phones: "a" | "b" | "both";
  roles: "a" | "b" | "both";
  departments: "a" | "b" | "both";
  instagram_handle: "a" | "b";
  source_files: "both";
  keepSecondary: boolean;
}

export function MergeContactsModal({
  open,
  onOpenChange,
  contactA,
  contactB,
  onMergeComplete,
}: MergeContactsModalProps) {
  const [selection, setSelection] = useState<MergeSelection>({
    name: "a",
    emails: "both",
    phones: "both",
    roles: "both",
    departments: "both",
    instagram_handle: "a",
    source_files: "both",
    keepSecondary: false,
  });
  const [merging, setMerging] = useState(false);

  const getFieldValue = (contact: CrewContact, field: MergeField): string => {
    const value = contact[field as keyof CrewContact];
    if (Array.isArray(value)) {
      return value.filter(Boolean).join(", ") || "—";
    }
    return (value as string) || "—";
  };

  const handleMerge = async () => {
    setMerging(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        return;
      }

      // Build merged contact data
      const mergedData: Partial<CrewContact> = {
        name: selection.name === "a" ? contactA.name : contactB.name,
        emails: selection.emails === "both"
          ? [...new Set([...(contactA.emails || []), ...(contactB.emails || [])])]
          : selection.emails === "a" ? contactA.emails : contactB.emails,
        phones: selection.phones === "both"
          ? [...new Set([...(contactA.phones || []), ...(contactB.phones || [])])]
          : selection.phones === "a" ? contactA.phones : contactB.phones,
        roles: selection.roles === "both"
          ? [...new Set([...(contactA.roles || []), ...(contactB.roles || [])])]
          : selection.roles === "a" ? contactA.roles : contactB.roles,
        departments: selection.departments === "both"
          ? [...new Set([...(contactA.departments || []), ...(contactB.departments || [])])]
          : selection.departments === "a" ? contactA.departments : contactB.departments,
        instagram_handle: selection.instagram_handle === "a" ? contactA.instagram_handle : contactB.instagram_handle,
        source_files: [...new Set([...(contactA.source_files || []), ...(contactB.source_files || [])])],
      };

      // Call edge function to merge
      const { error } = await supabase.functions.invoke("merge-contacts", {
        body: {
          primaryId: contactA.id,
          secondaryId: contactB.id,
          mergedData,
          keepSecondary: selection.keepSecondary,
        },
      });

      if (error) throw error;

      toast.success("Contacts merged successfully");
      onMergeComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to merge contacts");
    } finally {
      setMerging(false);
    }
  };

  const FieldRow = ({
    field,
    label,
    icon: Icon,
    allowBoth = true,
  }: {
    field: MergeField;
    label: string;
    icon: React.ElementType;
    allowBoth?: boolean;
  }) => (
    <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center py-3 border-b border-border">
      <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm truncate">{getFieldValue(contactA, field)}</span>
      </div>
      
      <RadioGroup
        value={selection[field as keyof MergeSelection] as string}
        onValueChange={(value) =>
          setSelection((prev) => ({ ...prev, [field]: value }))
        }
        className="flex gap-2"
      >
        <div className="flex items-center space-x-1">
          <RadioGroupItem value="a" id={`${field}-a`} />
          <Label htmlFor={`${field}-a`} className="text-xs">A</Label>
        </div>
        {allowBoth && (
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="both" id={`${field}-both`} />
            <Label htmlFor={`${field}-both`} className="text-xs">Both</Label>
          </div>
        )}
        <div className="flex items-center space-x-1">
          <RadioGroupItem value="b" id={`${field}-b`} />
          <Label htmlFor={`${field}-b`} className="text-xs">B</Label>
        </div>
      </RadioGroup>

      <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm truncate">{getFieldValue(contactB, field)}</span>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Merge Contacts</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 pb-2 text-sm font-medium text-muted-foreground">
              <span>Contact A (Primary)</span>
              <span className="text-center">Keep</span>
              <span>Contact B</span>
            </div>

            <FieldRow field="name" label="Name" icon={User} allowBoth={false} />
            <FieldRow field="emails" label="Emails" icon={Mail} />
            <FieldRow field="phones" label="Phones" icon={Phone} />
            <FieldRow field="roles" label="Roles" icon={Briefcase} />
            <FieldRow field="departments" label="Departments" icon={Building2} />
            <FieldRow field="instagram_handle" label="Instagram" icon={Instagram} allowBoth={false} />
            
            <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Source files will be combined automatically</span>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2 py-2">
          <Checkbox
            id="keepSecondary"
            checked={selection.keepSecondary}
            onCheckedChange={(checked) =>
              setSelection((prev) => ({ ...prev, keepSecondary: !!checked }))
            }
          />
          <Label htmlFor="keepSecondary" className="text-sm">
            Keep Contact B as separate entry (don't delete)
          </Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMerge} disabled={merging}>
            {merging ? "Merging..." : "Merge Contacts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
