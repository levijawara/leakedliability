import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Users, ArrowLeft } from "lucide-react";
import { BatchUploadBin } from "@/components/callsheets/BatchUploadBin";
import { CallSheetsGrid } from "@/components/callsheets/CallSheetsGrid";
import { BulkDeleteCallSheetsModal } from "@/components/callsheets/BulkDeleteCallSheetsModal";
import type { CallSheet } from "@/types/callSheet";

export const CallSheets = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [callSheets, setCallSheets] = useState<CallSheet[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchCallSheets = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUserId(user.id);

    const { data, error } = await supabase
      .from("call_sheets")
      .select("*")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading call sheets",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setCallSheets((data || []) as unknown as CallSheet[]);
    setLoading(false);
  }, [navigate, toast]);

  useEffect(() => {
    fetchCallSheets();
  }, [fetchCallSheets]);

  // Subscribe to real-time updates for call sheet status
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("call_sheets_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_sheets",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setCallSheets((prev) => [payload.new as unknown as CallSheet, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setCallSheets((prev) =>
              prev.map((sheet) =>
                sheet.id === payload.new.id ? (payload.new as unknown as CallSheet) : sheet
              )
            );
          } else if (payload.eventType === "DELETE") {
            setCallSheets((prev) =>
              prev.filter((sheet) => sheet.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleUploadComplete = () => {
    fetchCallSheets();
  };

  const handleViewSheet = (sheetId: string) => {
    navigate(`/call-sheets/review/${sheetId}`);
  };

  const handleDeleteSheet = async (sheetId: string) => {
    const { error } = await supabase
      .from("call_sheets")
      .delete()
      .eq("id", sheetId);

    if (error) {
      toast({
        title: "Error deleting call sheet",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setCallSheets((prev) => prev.filter((s) => s.id !== sheetId));
    toast({ title: "Call sheet deleted" });
  };

  const handleReparseSheet = async (sheetId: string) => {
    const { error } = await supabase
      .from("call_sheets")
      .update({ status: "processing", parsed_contacts: null })
      .eq("id", sheetId);

    if (error) {
      toast({
        title: "Error queueing reparse",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Call sheet queued for re-parsing" });
    fetchCallSheets();
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedSheetIds.length === 0) {
      // Delete all sheets
      const { error } = await supabase
        .from("call_sheets")
        .delete()
        .eq("user_id", userId!);

      if (error) {
        toast({
          title: "Error deleting call sheets",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      setCallSheets([]);
    }
    
    setShowBulkDelete(false);
    setSelectedSheetIds([]);
    toast({ title: "Call sheets deleted" });
  };

  // Stats
  const stats = {
    total: callSheets.length,
    parsed: callSheets.filter((s) => s.status === "parsed").length,
    reviewed: callSheets.filter((s) => s.status === "reviewed").length,
    pending: callSheets.filter((s) => s.status === "processing").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/my-contacts")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Call Sheets</h1>
              <p className="text-muted-foreground">
                Upload and parse call sheets to extract contacts
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/my-contacts")}
          >
            <Users className="h-4 w-4 mr-2" />
            View Contacts
          </Button>
        </div>

        {/* Upload Area */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <BatchUploadBin onUploadComplete={handleUploadComplete} />
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Total Sheets</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Ready to Review</p>
              <p className="text-xl font-bold text-green-600">{stats.parsed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Reviewed</p>
              <p className="text-xl font-bold text-blue-600">{stats.reviewed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Processing</p>
              <p className="text-xl font-bold text-orange-600">{stats.pending}</p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-end mb-6">
          {callSheets.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDelete(true)}
            >
              Delete All
            </Button>
          )}
        </div>

        {/* Call Sheets List */}
        {callSheets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No call sheets yet</h3>
              <p className="text-muted-foreground">
                Drag and drop PDF call sheets above to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <CallSheetsGrid
            callSheets={callSheets.map(cs => ({
              id: cs.id,
              file_name: cs.filename,
              status: cs.status,
              contacts_extracted: cs.parsed_contacts?.length ?? null,
              uploaded_at: cs.created_at,
              parsed_date: cs.parsed_at,
            }))}
            view={view}
            onViewChange={setView}
            onView={handleViewSheet}
            onDelete={handleDeleteSheet}
            onReparse={handleReparseSheet}
          />
        )}
      </div>

      {/* Modals */}
      <BulkDeleteCallSheetsModal
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        count={callSheets.length}
        onConfirm={handleBulkDeleteConfirm}
      />

      <Footer />
    </div>
  );
};
