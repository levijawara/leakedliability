import { useState, useEffect } from "react";
import { ArrowLeft, Save, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParseSelectionTable } from "./ParseSelectionTable";
import { ParseSummary } from "./ParseSummary";
import { ProcessingStatus } from "./ProcessingStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ParsedContact } from "@/types/callSheet";

interface ParseReviewPortalProps {
  callSheetId: string;
  onBack?: () => void;
  onComplete?: () => void;
  className?: string;
}

interface CallSheetData {
  id: string;
  file_name: string;
  status: string | null;
  parsed_contacts: ParsedContact[] | null;
  parsed_date: string | null;
  review_completed_at: string | null;
}

export function ParseReviewPortal({
  callSheetId,
  onBack,
  onComplete,
  className,
}: ParseReviewPortalProps) {
  const [callSheet, setCallSheet] = useState<CallSheetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<ParsedContact[]>([]);

  useEffect(() => {
    const fetchCallSheet = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
          .from("call_sheets")
          .select("id, file_name, status, parsed_contacts, parsed_date, review_completed_at")
          .eq("id", callSheetId)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        // Parse the JSON contacts
        const parsedContacts = (data.parsed_contacts as unknown) as ParsedContact[] | null;
        setCallSheet({
          ...data,
          parsed_contacts: parsedContacts,
        });

        // Pre-select all contacts by default
        if (parsedContacts) {
          setSelectedContacts(parsedContacts);
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to load call sheet");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCallSheet();
  }, [callSheetId]);

  const handleSaveContacts = async () => {
    if (selectedContacts.length === 0) {
      toast.error("Please select at least one contact to import");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Call the edge function to insert contacts
      const { data, error } = await supabase.functions.invoke("insert-selected-contacts", {
        body: {
          callSheetId,
          contacts: selectedContacts,
        },
      });

      if (error) throw error;

      // Update call sheet status
      await supabase
        .from("call_sheets")
        .update({
          status: "reviewed",
          review_completed_at: new Date().toISOString(),
          contacts_extracted: selectedContacts.length,
        })
        .eq("id", callSheetId)
        .eq("user_id", user.id);

      toast.success(`${selectedContacts.length} contacts imported successfully`);
      onComplete?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to import contacts");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!callSheet) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Call sheet not found</p>
        {onBack && (
          <Button variant="outline" onClick={onBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        )}
      </div>
    );
  }

  if (callSheet.status === "reviewed") {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h2 className="text-xl font-semibold">{callSheet.file_name}</h2>
            <p className="text-sm text-muted-foreground">Review completed</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium">This call sheet has already been reviewed</p>
              <p className="text-sm text-muted-foreground">
                {callSheet.review_completed_at &&
                  `Completed on ${new Date(callSheet.review_completed_at).toLocaleDateString()}`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (callSheet.status !== "parsed" || !callSheet.parsed_contacts) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h2 className="text-xl font-semibold">{callSheet.file_name}</h2>
          </div>
        </div>

        <ProcessingStatus
          status={callSheet.status as any || "queued"}
          message={
            callSheet.status === "error"
              ? "Failed to parse this call sheet. Please try re-uploading."
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h2 className="text-xl font-semibold">{callSheet.file_name}</h2>
            <p className="text-sm text-muted-foreground">
              Review and select contacts to import
            </p>
          </div>
        </div>

        <Button onClick={handleSaveContacts} disabled={isSaving || selectedContacts.length === 0}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Import {selectedContacts.length} Contact{selectedContacts.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      </div>

      {/* Summary */}
      <ParseSummary
        contacts={callSheet.parsed_contacts}
        selectedCount={selectedContacts.length}
      />

      {/* Selection Table */}
      <Card>
        <CardHeader>
          <CardTitle>Extracted Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <ParseSelectionTable
            contacts={callSheet.parsed_contacts}
            selectedContacts={selectedContacts}
            onSelectionChange={setSelectedContacts}
          />
        </CardContent>
      </Card>
    </div>
  );
}
