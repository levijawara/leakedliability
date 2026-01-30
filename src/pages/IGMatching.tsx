import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Instagram, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { IGContactCard } from "@/components/callsheets/IGContactCard";
import { Navigation } from "@/components/Navigation";
import { usePortalMode, usePortalBase } from "@/contexts/PortalContext";

interface ContactToMatch {
  id: string;
  name: string;
  roles: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
}

// Normalize name for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function IGMatching() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [contacts, setContacts] = useState<ContactToMatch[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [autoMatchedCount, setAutoMatchedCount] = useState(0);
  const [totalOriginal, setTotalOriginal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [masterIdentityCount, setMasterIdentityCount] = useState(0);
  const isPortal = usePortalMode();
  const portalBase = usePortalBase();

  useEffect(() => {
    async function fetchContacts() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate(portalBase ? `${portalBase}/auth` : "/auth");
          return;
        }

        // Fetch master identity count
        const { count: identityCount } = await supabase
          .from('ig_master_identities')
          .select('*', { count: 'exact', head: true });
        
        setMasterIdentityCount(identityCount || 0);

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

        // Get ALL user's contacts that have IG handles (for auto-matching by name)
        const { data: userContactsWithIG } = await supabase
          .from('crew_contacts')
          .select('name, ig_handle')
          .eq('user_id', user.id)
          .not('ig_handle', 'is', null);

        // Build a map of normalized name -> ig_handle for quick lookup
        const nameToIGMap = new Map<string, string>();
        for (const contact of userContactsWithIG || []) {
          if (contact.ig_handle) {
            nameToIGMap.set(normalizeName(contact.name), contact.ig_handle);
          }
        }

        // Filter to contacts without IG handles and check for auto-matches
        const contactsWithoutIG: ContactToMatch[] = [];
        const seen = new Set<string>();
        let autoMatched = 0;

        for (const link of contactLinks || []) {
          const contact = (link as any).crew_contacts;
          if (contact && !contact.ig_handle && !seen.has(contact.id)) {
            seen.add(contact.id);
            
            const normalizedName = normalizeName(contact.name);
            const existingIG = nameToIGMap.get(normalizedName);
            
            if (existingIG) {
              // Auto-apply the IG handle from previous match
              const { error: updateError } = await supabase
                .from('crew_contacts')
                .update({ ig_handle: existingIG })
                .eq('id', contact.id);
              
              if (!updateError) {
                autoMatched++;
                console.log(`[IGMatching] Auto-matched ${contact.name} to @${existingIG}`);
              }
            } else {
              // Add to matching queue
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
        }

        setAutoMatchedCount(autoMatched);
        setContacts(contactsWithoutIG);
        setTotalOriginal(contactsWithoutIG.length + autoMatched);
        
        if (autoMatched > 0) {
          toast({
            title: `Auto-matched ${autoMatched} contacts`,
            description: "Based on your previous IG matches"
          });
        }
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
  }, [id, navigate, toast, portalBase]);

  const handleMatch = (contactId: string, igHandle: string | null) => {
    if (igHandle) {
      setMatchedCount(prev => prev + 1);
    }
    // Remove from queue - next contact will appear
    setContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const handleSkip = (contactId: string) => {
    setSkippedCount(prev => prev + 1);
    // Remove from queue - next contact will appear
    setContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const handleSkipAll = () => {
    navigate(`${portalBase}/call-sheets/${id}/nova-matching`);
  };

  const handleFinish = () => {
    toast({
      title: "IG Matching Complete",
      description: `Matched ${matchedCount + autoMatchedCount} Instagram handles${autoMatchedCount > 0 ? ` (${autoMatchedCount} auto-matched)` : ''}.`
    });
    navigate(`${portalBase}/call-sheets/${id}/nova-matching`);
  };

  const processedCount = matchedCount + skippedCount + autoMatchedCount;
  const progressPercent = totalOriginal > 0 
    ? (processedCount / totalOriginal) * 100 
    : 0;
  
  // Current contact is always the first one in the queue
  const currentContact = contacts[0];
  const currentPosition = processedCount + 1;

  if (loading) {
    return (
      <>
        {!isPortal && <Navigation />}
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
        {!isPortal && <Navigation />}
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold">All Done!</h1>
            <p className="text-muted-foreground">
              Matched {matchedCount + autoMatchedCount} Instagram handles
              {autoMatchedCount > 0 && ` (${autoMatchedCount} auto-matched)`}
              {skippedCount > 0 && ` • ${skippedCount} skipped`}
            </p>
            <Button onClick={() => navigate(`${portalBase}/call-sheets/${id}/nova-matching`)}>
              Continue to NOVA Matching
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
        {!isPortal && <Navigation />}
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <Instagram className="h-16 w-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold">No Contacts to Match</h1>
            <p className="text-muted-foreground">
              All contacts from this call sheet already have Instagram handles or none were imported.
            </p>
            <Button onClick={() => navigate(`${portalBase}/call-sheets/${id}/nova-matching`)}>
              Continue to NOVA Matching
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {!isPortal && <Navigation />}
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b sticky top-0 bg-background z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate(`${portalBase}/call-sheets`)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  <Instagram className="h-5 w-5" />
                  <h1 className="text-xl font-semibold">Match Instagram Handles</h1>
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
            Cross-referencing against {masterIdentityCount.toLocaleString()} verified identities • One at a time
          </p>
        </div>

        {/* Current Contact Card - ONE at a time */}
        <div className="container mx-auto px-4 pb-8">
          <div className="max-w-2xl mx-auto">
            {currentContact && (
              <IGContactCard
                key={currentContact.id}
                contactId={currentContact.id}
                contactName={currentContact.name}
                contactPhones={currentContact.phones}
                contactEmails={currentContact.emails}
                role={currentContact.roles[0] || ""}
                callSheetId={id!}
                onMatch={(igHandle) => handleMatch(currentContact.id, igHandle)}
                onSkip={() => handleSkip(currentContact.id)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
