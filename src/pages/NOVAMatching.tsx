import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NOVAContactCard } from "@/components/callsheets/NOVAContactCard";
import { Navigation } from "@/components/Navigation";
import { usePortalMode, usePortalBase } from "@/contexts/PortalContext";

interface ContactToMatch {
  id: string;
  name: string;
  roles: string[];
  nova_profile_url: string | null;
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

export default function NOVAMatching() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [contacts, setContacts] = useState<ContactToMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [noProfileIds, setNoProfileIds] = useState<Set<string>>(new Set());
  const [autoMatchedCount, setAutoMatchedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [masterIdentityCount, setMasterIdentityCount] = useState(0);
  const isPortal = usePortalMode();
  const portalBase = usePortalBase();

  useEffect(() => {
    async function fetchContacts() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate(portalBase ? `${portalBase}/auth` : "/auth");
          return;
        }

        // Fetch master identity count from nova_master_identities
        const { count: identityCount } = await supabase
          .from('nova_master_identities')
          .select('*', { count: 'exact', head: true });
        
        setMasterIdentityCount(identityCount || 0);

        // Get contacts linked to this call sheet that don't have NOVA profiles
        // Exclude contacts already marked as 'N/A'
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

        // Get ALL user's contacts that have NOVA profiles (for auto-matching by name)
        const { data: userContactsWithNOVA } = await supabase
          .from('crew_contacts')
          .select('name, nova_profile_url')
          .eq('user_id', user.id)
          .not('nova_profile_url', 'is', null)
          .neq('nova_profile_url', 'N/A');

        // Build a map of normalized name -> nova_profile_url for quick lookup
        const nameToNOVAMap = new Map<string, string>();
        for (const contact of userContactsWithNOVA || []) {
          if (contact.nova_profile_url && contact.nova_profile_url !== 'N/A') {
            nameToNOVAMap.set(normalizeName(contact.name), contact.nova_profile_url);
          }
        }

        // Filter to contacts without NOVA profiles and check for auto-matches
        const contactsWithoutNOVA: ContactToMatch[] = [];
        const seen = new Set<string>();
        let autoMatched = 0;

        for (const link of contactLinks || []) {
          const contact = (link as any).crew_contacts;
          // Skip contacts that already have NOVA profiles or are marked as N/A
          if (contact && !contact.nova_profile_url && !seen.has(contact.id)) {
            seen.add(contact.id);
            
            const normalizedName = normalizeName(contact.name);
            const existingNOVA = nameToNOVAMap.get(normalizedName);
            
            if (existingNOVA) {
              // Auto-apply the NOVA profile from previous match
              const { error: updateError } = await supabase
                .from('crew_contacts')
                .update({ nova_profile_url: existingNOVA })
                .eq('id', contact.id);
              
              if (!updateError) {
                autoMatched++;
                console.log(`[NOVAMatching] Auto-matched ${contact.name} to ${existingNOVA}`);
              }
            } else {
              // Add to matching queue
              contactsWithoutNOVA.push({
                id: contact.id,
                name: contact.name,
                roles: contact.roles || [],
                nova_profile_url: null
              });
            }
          } else if (contact && contact.nova_profile_url === 'N/A' && !seen.has(contact.id)) {
            // Skip contacts marked as N/A but count them
            seen.add(contact.id);
          }
        }

        setAutoMatchedCount(autoMatched);
        setContacts(contactsWithoutNOVA);
        
        if (autoMatched > 0) {
          toast({
            title: `Auto-matched ${autoMatched} contacts`,
            description: "Based on your previous NOVA matches"
          });
        }
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
  }, [id, navigate, toast, portalBase]);

  const handleMatch = (contactId: string, profileUrl: string | null) => {
    setProcessedIds(prev => new Set([...prev, contactId]));
    // Auto-advance to next contact
    if (currentIndex < contacts.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSkip = (contactId: string) => {
    setProcessedIds(prev => new Set([...prev, contactId]));
    // Auto-advance to next contact
    if (currentIndex < contacts.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleNoProfile = async (contactId: string) => {
    try {
      // Mark in database with special value 'N/A'
      await supabase
        .from('crew_contacts')
        .update({ nova_profile_url: 'N/A' })
        .eq('id', contactId);
      
      setNoProfileIds(prev => new Set([...prev, contactId]));
      setProcessedIds(prev => new Set([...prev, contactId]));
      
      toast({
        title: "Marked as N/A",
        description: "This person won't appear in future NOVA matching sessions"
      });
      
      // Auto-advance
      if (currentIndex < contacts.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    } catch (error) {
      console.error('[NOVAMatching] Error marking N/A:', error);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < contacts.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSkipAll = () => {
    navigate(`${portalBase}/crew-contacts`);
  };

  const handleFinish = () => {
    const matchedCount = processedIds.size - noProfileIds.size;
    toast({
      title: "NOVA Matching Complete",
      description: `Matched ${matchedCount + autoMatchedCount} NOVA profiles${autoMatchedCount > 0 ? ` (${autoMatchedCount} auto-matched)` : ''}${noProfileIds.size > 0 ? ` • ${noProfileIds.size} marked N/A` : ''}.`
    });
    navigate(`${portalBase}/crew-contacts`);
  };

  const progressPercent = contacts.length > 0 
    ? (processedIds.size / contacts.length) * 100 
    : 0;
  
  const currentContact = contacts[currentIndex];

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

  // All done - all contacts processed
  if (contacts.length > 0 && processedIds.size === contacts.length) {
    const matchedCount = processedIds.size - noProfileIds.size;
    return (
      <>
        {!isPortal && <Navigation />}
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold">All Done!</h1>
            <p className="text-muted-foreground">
              Matched {matchedCount + autoMatchedCount} NOVA profiles
              {autoMatchedCount > 0 && ` (${autoMatchedCount} auto-matched)`}
              {noProfileIds.size > 0 && ` • ${noProfileIds.size} marked N/A`}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setCurrentIndex(0)}>
                Review Again
              </Button>
              <Button onClick={() => navigate(`${portalBase}/crew-contacts`)}>
                Go to Crew Contacts
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // No contacts need matching
  if (contacts.length === 0) {
    return (
      <>
        {!isPortal && <Navigation />}
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
            <Button onClick={() => navigate(`${portalBase}/crew-contacts`)}>
              Go to Crew Contacts
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
                  {currentIndex + 1} of {contacts.length}
                  {processedIds.size > 0 && (
                    <span className="text-muted-foreground ml-2">
                      ({processedIds.size} processed)
                    </span>
                  )}
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
            Cross-referencing against {masterIdentityCount.toLocaleString()} NOVA profiles • Use Previous/Next to review
          </p>
        </div>

        {/* Current Contact Card */}
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
                onNoProfile={() => handleNoProfile(currentContact.id)}
              />
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-center gap-4 mt-6">
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button 
                variant="outline" 
                onClick={handleNext}
                disabled={currentIndex >= contacts.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
