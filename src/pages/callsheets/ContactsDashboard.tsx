import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllContacts } from "@/lib/callsheets/fetchAllContacts";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Building2, Briefcase, Search, Trash2, FileText, Instagram } from "lucide-react";
import { CrewContactsGrid } from "@/components/callsheets/CrewContactsGrid";
import { DuplicateFinderModal } from "@/components/callsheets/DuplicateFinderModal";
import { ClearAllModal } from "@/components/callsheets/ClearAllModal";
import { CreditsModal } from "@/components/callsheets/CreditsModal";
import { IGMatchingPanel } from "@/components/callsheets/IGMatchingPanel";
import type { CrewContact } from "@/types/callSheet";

export const ContactsDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<CrewContact[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  
  // Modal states
  const [showDuplicateFinder, setShowDuplicateFinder] = useState(false);
  const [showClearAll, setShowClearAll] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  const fetchContacts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      const allContacts = await fetchAllContacts(user.id);
      setContacts(allContacts);
    } catch (error: any) {
      toast({
        title: "Error loading contacts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Calculate stats
  const stats = {
    total: contacts.length,
    departments: new Set(contacts.flatMap((c) => c.departments || [])).size,
    roles: new Set(contacts.flatMap((c) => c.roles || [])).size,
    withIG: contacts.filter((c) => c.instagram_handle).length,
  };

  const handleClearAllConfirm = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("crew_contacts")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Error clearing contacts",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setContacts([]);
    setShowClearAll(false);
    toast({ title: "All contacts cleared" });
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
          <div>
            <h1 className="text-3xl font-bold">My Contacts</h1>
            <p className="text-muted-foreground">
              Manage your crew contact database
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/call-sheets")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Upload Call Sheets
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Contacts</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Departments</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.departments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Unique Roles</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.roles}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">With Instagram</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.withIG}</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant="outline"
            onClick={() => setShowDuplicateFinder(true)}
            disabled={contacts.length < 2}
          >
            Find Duplicates
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCredits(true)}
            disabled={contacts.length === 0}
          >
            Generate Credits
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowClearAll(true)}
            disabled={contacts.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Contacts</TabsTrigger>
            <TabsTrigger value="ig">IG Matching</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {contacts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No contacts found</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload call sheets to build your contact database
                  </p>
                  <Button onClick={() => navigate("/call-sheets")}>
                    Upload Call Sheets
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <CrewContactsGrid initialContacts={contacts} />
            )}
          </TabsContent>

          <TabsContent value="ig">
            <IGMatchingPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <DuplicateFinderModal
        open={showDuplicateFinder}
        onOpenChange={setShowDuplicateFinder}
        onComplete={fetchContacts}
      />

      <ClearAllModal
        open={showClearAll}
        onOpenChange={setShowClearAll}
        itemCount={contacts.length}
        itemType="contact"
        onConfirm={handleClearAllConfirm}
      />

      <CreditsModal
        open={showCredits}
        onOpenChange={setShowCredits}
        contacts={contacts}
      />

      <Footer />
    </div>
  );
};
