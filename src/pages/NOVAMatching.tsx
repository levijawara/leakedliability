import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NOVAContactCard } from "@/components/callsheets/NOVAContactCard";
import { Navigation } from "@/components/Navigation";

interface ContactToMatch {
  id: string;
  name: string;
  roles: string[];
  nova_profile_url: string | null;
}

export default function NOVAMatching() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [contacts, setContacts] = useState<ContactToMatch[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [totalOriginal, setTotalOriginal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContacts() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }

        // Get contacts linked to this call sheet that don't have NOVA profiles
        const { data: contactLinks, error: linksError } = await supabase
          .from('contact_call_sheets')
          .select(`
            contact_id,
            crew_contacts!inner (
              id,
              name,
              roles,
              nova_profile_url
            )
          `)
          .eq('call_sheet_id', id);

        if (linksError) throw linksError;

        // Filter to contacts without NOVA profiles
        const contactsWithoutNOVA: ContactToMatch[] = [];
        const seen = new Set<string>();

        for (const link of contactLinks || []) {
          const contact = (link as any).crew_contacts;
          if (contact && !contact.nova_profile_url && !seen.has(contact.id)) {
            seen.add(contact.id);
            contactsWithoutNOVA.push({
              id: contact.id,
              name: contact.name,
              roles: contact.roles || [],
              nova_profile_url: null
            });
          }
        }

        setContacts(contactsWithoutNOVA);
        setTotalOriginal(contactsWithoutNOVA.length);
      } catch (error: any) {
        console.error('[NOVAMatching] Fetch error:', error);
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

  const handleMatch = (contactId: string, profileUrl: string | null) => {
    if (profileUrl) {
      setMatchedCount(prev => prev + 1);
    }
    setContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const handleSkip = (contactId: string) => {
    setSkippedCount(prev => prev + 1);
    setContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const handleSkipAll = () => {
    navigate('/crew-contacts');
  };

  const handleFinish = () => {
    toast({
      title: "NOVA Matching Complete",
      description: `Matched ${matchedCount} NOVA profiles.`
    });
    navigate('/crew-contacts');
  };

  const processedCount = matchedCount + skippedCount;
  const progressPercent = totalOriginal > 0 
    ? (processedCount / totalOriginal) * 100 
    : 0;
  
  const currentContact = contacts[0];
  const currentPosition = processedCount + 1;

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
            <CheckCircle className="h-16 w-16 text-purple-500 mx-auto" />
            <h1 className="text-2xl font-bold">All Done!</h1>
            <p className="text-muted-foreground">
              Matched {matchedCount} NOVA profiles
              {skippedCount > 0 && ` (${skippedCount} skipped)`}
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
            <img 
              src="/images/nova-icon.png" 
              alt="NOVA" 
              className="h-16 w-16 mx-auto opacity-50" 
            />
            <h1 className="text-2xl font-bold">No Contacts to Match</h1>
            <p className="text-muted-foreground">
              All contacts from this call sheet already have NOVA profiles or none were imported.
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
                  <img 
                    src="/images/nova-icon.png" 
                    alt="NOVA" 
                    className="h-5 w-5 object-contain" 
                  />
                  <h1 className="text-xl font-semibold">Match NOVA Profiles</h1>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {currentPosition} of {totalOriginal}
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
            Cross-referencing against 33K+ NOVA profiles • Name-based matching
          </p>
        </div>

        {/* Current Contact Card - ONE at a time */}
        <div className="container mx-auto px-4 pb-8">
          <div className="max-w-2xl mx-auto">
            {currentContact && (
              <NOVAContactCard
                key={currentContact.id}
                contactId={currentContact.id}
                contactName={currentContact.name}
                role={currentContact.roles[0] || ""}
                callSheetId={id!}
                onMatch={(profileUrl) => handleMatch(currentContact.id, profileUrl)}
                onSkip={() => handleSkip(currentContact.id)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
