import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sortContacts } from "@/lib/callsheets/creditsSorting";
import type { CrewContact } from "@/types/callSheet";
import { Copy, Check, Settings2 } from "lucide-react";

interface CreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts?: CrewContact[];
  sourceFileName?: string;
}

export function CreditsModal({
  open,
  onOpenChange,
  contacts: propContacts,
  sourceFileName,
}: CreditsModalProps) {
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState("");
  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState({
    includeRoles: true,
    groupByDepartment: true,
    onlyWithHandle: true,
    sortAlphabetically: true,
  });

  useEffect(() => {
    if (open) {
      generateCreditsText();
    }
  }, [open, propContacts, options]);

  const generateCreditsText = async () => {
    setLoading(true);
    try {
      let contactsToUse = propContacts;

      // If no contacts provided, fetch from database
      if (!contactsToUse) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Please sign in");
          return;
        }

        let query = supabase
          .from("crew_contacts")
          .select("*")
          .eq("user_id", user.id);

        if (sourceFileName) {
          query = query.contains("source_files", [sourceFileName]);
        }

        const { data, error } = await query;
        if (error) throw error;
        contactsToUse = (data || []) as unknown as CrewContact[];
      }

      // Filter contacts with IG handles if option enabled
      let filtered = contactsToUse;
      if (options.onlyWithHandle) {
        filtered = filtered.filter((c) => c.instagram_handle);
      }

      // Sort and format credits
      const sorted = sortContacts(filtered, { field: "name", direction: "asc" });
      const lines = sorted.map((c) => {
        const handle = c.instagram_handle ? `@${c.instagram_handle.replace(/^@/, "")}` : c.name;
        const role = options.includeRoles && c.roles?.[0] ? `${c.roles[0]}: ` : "";
        return `${role}${handle}`;
      });
      const creditsText = lines.join("\n");

      setCredits(creditsText);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate credits");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(credits);
      setCopied(true);
      toast.success("Credits copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate IG Credits</DialogTitle>
          <DialogDescription>
            Create formatted credits for Instagram posts from your contacts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Settings2 className="h-4 w-4" />
            <span>Options</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeRoles"
                checked={options.includeRoles}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeRoles: !!checked }))
                }
              />
              <Label htmlFor="includeRoles" className="text-sm">Include roles</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="groupByDepartment"
                checked={options.groupByDepartment}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, groupByDepartment: !!checked }))
                }
              />
              <Label htmlFor="groupByDepartment" className="text-sm">Group by dept</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="onlyWithHandle"
                checked={options.onlyWithHandle}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, onlyWithHandle: !!checked }))
                }
              />
              <Label htmlFor="onlyWithHandle" className="text-sm">Only with @handle</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sortAlphabetically"
                checked={options.sortAlphabetically}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, sortAlphabetically: !!checked }))
                }
              />
              <Label htmlFor="sortAlphabetically" className="text-sm">Sort A-Z</Label>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[250px] rounded-md border">
              <Textarea
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                className="min-h-[240px] border-0 resize-none focus-visible:ring-0"
                placeholder="No credits to display. Add contacts with Instagram handles."
              />
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleCopy} disabled={!credits || loading}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
