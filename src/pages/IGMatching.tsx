import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Instagram, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { IGContactCard } from "@/components/callsheets/IGContactCard";
import { Navigation } from "@/components/Navigation";

interface ContactToMatch {
  id: string;
  name: string;
  roles: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
}

export default function IGMatching() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [contacts, setContacts] = useState<ContactToMatch[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContacts() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }

        // Get contacts linked to this call sheet that don't have IG handles
        const { data: contactLinks, error: linksError } = await supabase
          .from('contact_call_sheets')
          .select(`
            contact_id,
            crew_contacts!inner (
              id,
              name,
              roles,
              phones,
              emails,
              ig_handle
            )
          `)
          .eq('call_sheet_id', id);

        if (linksError) throw linksError;

        // Filter to contacts without IG handles
        const contactsWithoutIG: ContactToMatch[] = [];
        const seen = new Set<string>();

        for (const link of contactLinks || []) {
          const contact = (link as any).crew_contacts;
          if (contact && !contact.ig_handle && !seen.has(contact.id)) {
            seen.add(contact.id);
            contactsWithoutIG.push({
              id: contact.id,
              name: contact.name,
              roles: contact.roles || [],
              phones: contact.phones || [],
              emails: contact.emails || [],
              ig_handle: null
            });
          }
        }

        setContacts(contactsWithoutIG);
      } catch (error: any) {
        console.error('[IGMatching] Fetch error:', error);
        toast({
          title: "Failed to load contacts",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchContacts();
    }
  }, [id, navigate, toast]);

  const handleMatch = (contactId: string, igHandle: string | null) => {
    if (igHandle) {
      setMatchedCount(prev => prev + 1);
    }
    // Remove from list
    setContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const handleSkip = (contactId: string) => {
    setSkippedIds(prev => new Set(prev).add(contactId));
    setContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const handleSkipAll = () => {
    navigate('/crew-contacts');
  };

  const handleFinish = () => {
    toast({
      title: "IG Matching Complete",
      description: `Matched ${matchedCount} Instagram handles.`
    });
    navigate('/crew-contacts');
  };

  const totalOriginal = contacts.length + matchedCount + skippedIds.size;
  const progressPercent = totalOriginal > 0 
    ? ((matchedCount + skippedIds.size) / totalOriginal) * 100 
    : 0;

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  // All done
  if (contacts.length === 0 && totalOriginal > 0) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold">All Done!</h1>
            <p className="text-muted-foreground">
              Matched {matchedCount} Instagram handles
            </p>
            <Button onClick={() => navigate('/crew-contacts')}>
              Go to Crew Contacts
            </Button>
          </div>
        </div>
      </>
    );
  }

  // No contacts need matching
  if (contacts.length === 0 && totalOriginal === 0) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <Instagram className="h-16 w-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold">No Contacts to Match</h1>
            <p className="text-muted-foreground">
              All contacts from this call sheet already have Instagram handles or none were imported.
            </p>
            <Button onClick={() => navigate('/crew-contacts')}>
              Go to Crew Contacts
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b sticky top-0 bg-background z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/call-sheets')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  <Instagram className="h-5 w-5" />
                  <h1 className="text-xl font-semibold">Match Instagram Handles</h1>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {matchedCount} / {totalOriginal}
                </span>
                <Button variant="outline" size="sm" onClick={handleSkipAll}>
                  Skip All
                </Button>
                <Button size="sm" onClick={handleFinish}>
                  Finish
                </Button>
              </div>
            </div>
            <div className="mt-3">
              <Progress value={progressPercent} className="h-2" />
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <div className="container mx-auto px-4 py-4">
          <p className="text-muted-foreground text-center">
            Link crew contacts to their Instagram accounts
          </p>
        </div>

        {/* Contact Cards */}
        <div className="container mx-auto px-4 pb-8">
          <div className="max-w-2xl mx-auto space-y-4">
            {contacts.map((contact) => (
              <IGContactCard
                key={contact.id}
                contactId={contact.id}
                contactName={contact.name}
                contactPhones={contact.phones}
                contactEmails={contact.emails}
                role={contact.roles[0] || ""}
                callSheetId={id!}
                onMatch={(igHandle) => handleMatch(contact.id, igHandle)}
                onSkip={() => handleSkip(contact.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
