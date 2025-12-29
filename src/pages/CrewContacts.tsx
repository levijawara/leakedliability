import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { ContactFilters } from "@/components/contacts/ContactFilters";
import { ContactsGrid } from "@/components/contacts/ContactsGrid";
import { ExportButton } from "@/components/contacts/ExportButton";
import { Users } from "lucide-react";

export interface CrewContact {
  id: string;
  name: string;
  emails: string[] | null;
  phones: string[] | null;
  roles: string[] | null;
  departments: string[] | null;
  ig_handle: string | null;
  project_title: string | null;
  source_files: string[] | null;
  confidence: number | null;
  needs_review: boolean | null;
  is_favorite: boolean | null;
  created_at: string | null;
}

const VIEW_STORAGE_KEY = 'crew-contacts-view';

export default function CrewContacts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<CrewContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<CrewContact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [view, setView] = useState<'list' | 'cards'>(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    return (stored === 'cards' || stored === 'list') ? stored : 'list';
  });
  const [callSheetCounts, setCallSheetCounts] = useState<Record<string, number>>({});

  // Persist view preference
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to view contacts.",
          variant: "destructive"
        });
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchContacts(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const fetchContacts = async (userId: string) => {
    const PAGE_SIZE = 1000;
    const MAX_CONTACTS = 100000;
    let allContacts: CrewContact[] = [];
    let from = 0;

    try {
      while (from < MAX_CONTACTS) {
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from('crew_contacts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        if (!data || data.length === 0) break;

        allContacts = [...allContacts, ...data];
        console.log(`[CrewContacts] Fetched page: ${data.length} rows (total so far: ${allContacts.length})`);

        // Stop if we got less than a full page (we've reached the end)
        if (data.length < PAGE_SIZE) break;

        from += PAGE_SIZE;
      }

      console.log(`[CrewContacts] Total contacts loaded: ${allContacts.length}`);
      setContacts(allContacts);
      setFilteredContacts(allContacts);
      
      // Fetch call sheet counts for all contacts
      fetchCallSheetCounts(allContacts.map(c => c.id));
    } catch (error: any) {
      console.error('[CrewContacts] Fetch error:', error);
      toast({
        title: "Failed to load contacts",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCallSheetCounts = async (contactIds: string[]) => {
    if (contactIds.length === 0) return;

    try {
      // Query the contact_call_sheets join table for counts
      const { data, error } = await supabase
        .from('contact_call_sheets')
        .select('contact_id')
        .in('contact_id', contactIds);

      if (error) throw error;

      // Count occurrences of each contact_id
      const counts: Record<string, number> = {};
      data?.forEach(row => {
        counts[row.contact_id] = (counts[row.contact_id] || 0) + 1;
      });

      setCallSheetCounts(counts);
      console.log(`[CrewContacts] Call sheet counts loaded for ${Object.keys(counts).length} contacts`);
    } catch (error: any) {
      console.error('[CrewContacts] Failed to fetch call sheet counts:', error);
      // Non-critical, don't show toast
    }
  };

  // Filter contacts when filters change
  useEffect(() => {
    let result = [...contacts];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.emails?.some(e => e.toLowerCase().includes(query)) ||
        c.roles?.some(r => r.toLowerCase().includes(query)) ||
        c.project_title?.toLowerCase().includes(query)
      );
    }

    // Department filter
    if (departmentFilter !== "all") {
      result = result.filter(c =>
        c.departments?.some(d => d.toLowerCase() === departmentFilter.toLowerCase())
      );
    }

    // Favorites filter
    if (favoritesOnly) {
      result = result.filter(c => c.is_favorite === true);
    }

    setFilteredContacts(result);
  }, [contacts, searchQuery, departmentFilter, favoritesOnly]);

  // Get unique departments for filter
  const uniqueDepartments = Array.from(
    new Set(contacts.flatMap(c => c.departments || []).filter(Boolean))
  ).sort();

  const handleContactUpdate = (updatedContact: CrewContact) => {
    setContacts(prev =>
      prev.map(c => c.id === updatedContact.id ? updatedContact : c)
    );
  };

  const handleContactDelete = (contactId: string) => {
    setContacts(prev => prev.filter(c => c.id !== contactId));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:pt-24">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Crew Contacts</h1>
                <p className="text-muted-foreground">
                  Manage contacts extracted from your call sheets
                </p>
              </div>
            </div>
            <ExportButton contacts={filteredContacts} />
          </div>

          {/* Filters */}
          <ContactFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            departmentFilter={departmentFilter}
            onDepartmentChange={setDepartmentFilter}
            departments={uniqueDepartments}
            favoritesOnly={favoritesOnly}
            onFavoritesChange={setFavoritesOnly}
            view={view}
            onViewChange={setView}
          />

          {/* Contacts Display */}
          {view === 'list' ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Contacts</CardTitle>
                <CardDescription>
                  {filteredContacts.length} of {contacts.length} contacts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContactsTable
                  contacts={filteredContacts}
                  userId={user?.id}
                  onContactUpdate={handleContactUpdate}
                  onContactDelete={handleContactDelete}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {filteredContacts.length} of {contacts.length} contacts
                </p>
              </div>
              <ContactsGrid
                contacts={filteredContacts}
                callSheetCounts={callSheetCounts}
                userId={user?.id}
                onContactUpdate={handleContactUpdate}
                onContactDelete={handleContactDelete}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
