import { useState, useEffect } from "react";
import { Check, Loader2, Users, Sparkles, User, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Coworker {
  id: string;
  name: string;
  nova_profile_url: string | null;
}

interface SeedSuggestion {
  profileUrl: string;
  confidence: 'high' | 'medium';
  matchReason: 'exact_name' | 'fuzzy_name';
  matchedName?: string;
  username: string;
  roles: string[];
}

interface NOVAContactCardProps {
  contactId: string;
  contactName: string;
  role: string;
  callSheetId: string;
  onMatch: (profileUrl: string | null) => void;
  onSkip: () => void;
}

export function NOVAContactCard({
  contactId,
  contactName,
  role,
  callSheetId,
  onMatch,
  onSkip
}: NOVAContactCardProps) {
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ profile_url: string; full_name: string; username: string; roles: string[] }>>([]);
  const [coworkers, setCoworkers] = useState<Coworker[]>([]);
  const [loadingCoworkers, setLoadingCoworkers] = useState(true);
  const [searching, setSearching] = useState(false);
  
  // Seed suggestion state
  const [seedSuggestion, setSeedSuggestion] = useState<SeedSuggestion | null>(null);
  const [loadingSeed, setLoadingSeed] = useState(true);

  // Fetch seed suggestion from nova_master_identities via edge function
  useEffect(() => {
    async function fetchSeedSuggestion() {
      try {
        setLoadingSeed(true);
        setSeedSuggestion(null);
        
        const { data, error } = await supabase.functions.invoke('get-seed-nova-suggestion', {
          body: { name: contactName }
        });

        if (error) {
          console.error('[NOVAContactCard] Seed suggestion error:', error);
          return;
        }

        if (data?.seedSuggestion) {
          setSeedSuggestion({
            profileUrl: data.seedSuggestion,
            confidence: data.confidence || 'medium',
            matchReason: data.matchReason || 'exact_name',
            matchedName: data.matchedName,
            username: data.username,
            roles: data.roles || []
          });
        }
      } catch (error) {
        console.error('[NOVAContactCard] Seed suggestion fetch error:', error);
      } finally {
        setLoadingSeed(false);
      }
    }

    fetchSeedSuggestion();
  }, [contactId, contactName]);

  // Fetch coworkers from the same call sheets who have NOVA profiles
  useEffect(() => {
    async function fetchCoworkers() {
      try {
        setLoadingCoworkers(true);

        const { data: contactLinks, error: linksError } = await supabase
          .from('contact_call_sheets')
          .select('call_sheet_id')
          .eq('contact_id', contactId);

        if (linksError) throw linksError;

        if (!contactLinks || contactLinks.length === 0) {
          setCoworkers([]);
          return;
        }

        const callSheetIds = contactLinks.map(l => l.call_sheet_id);

        const { data: coworkerLinks, error: coworkersError } = await supabase
          .from('contact_call_sheets')
          .select(`
            contact_id,
            crew_contacts!inner (
              id,
              name,
              nova_profile_url
            )
          `)
          .in('call_sheet_id', callSheetIds)
          .neq('contact_id', contactId);

        if (coworkersError) throw coworkersError;

        const seen = new Set<string>();
        const uniqueCoworkers: Coworker[] = [];

        for (const link of coworkerLinks || []) {
          const contact = (link as any).crew_contacts;
          if (contact && contact.nova_profile_url && !seen.has(contact.id)) {
            seen.add(contact.id);
            uniqueCoworkers.push({
              id: contact.id,
              name: contact.name,
              nova_profile_url: contact.nova_profile_url
            });
          }
        }

        setCoworkers(uniqueCoworkers.slice(0, 8));
      } catch (error) {
        console.error('[NOVAContactCard] Fetch coworkers error:', error);
      } finally {
        setLoadingCoworkers(false);
      }
    }

    fetchCoworkers();
  }, [contactId]);

  // Search nova_master_identities by name with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchValue.length < 2) {
        setSuggestions([]);
        return;
      }

      setSearching(true);
      try {
        const { data, error } = await supabase
          .from('nova_master_identities')
          .select('profile_url, full_name, username, roles')
          .ilike('full_name', `%${searchValue}%`)
          .limit(5);

        if (error) throw error;

        setSuggestions(data || []);
      } catch (error) {
        console.error('[NOVAContactCard] Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleSelectSuggestion = async (profileUrl: string, username: string) => {
    // Update the contact's nova_profile_url
    await supabase
      .from('crew_contacts')
      .update({ nova_profile_url: profileUrl })
      .eq('id', contactId);

    onMatch(profileUrl);
  };

  const handleUseSeedSuggestion = () => {
    if (seedSuggestion) {
      handleSelectSuggestion(seedSuggestion.profileUrl, seedSuggestion.username);
    }
  };

  const getMatchReasonLabel = (reason: string) => {
    switch (reason) {
      case 'exact_name': return 'Exact name match';
      case 'fuzzy_name': return 'Similar name match';
      default: return 'Match found';
    }
  };

  const extractUsername = (url: string): string => {
    const match = url.match(/(?:www\.)?itsnova\.(?:co|com)\/([^/?#]+)/i);
    return match ? match[1] : url;
  };

  return (
    <Card className="border-2">
      <CardContent className="p-6">
        {/* Contact Identity - Prominent */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold mb-1">{contactName}</h2>
          <p className="text-muted-foreground">{role || "No role specified"}</p>
        </div>

        {/* Seed Suggestion Section - The main feature */}
        {loadingSeed && (
          <div className="mb-6 p-4 rounded-lg border bg-muted/30 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Cross-referencing against 33K+ NOVA profiles...</span>
          </div>
        )}

        {!loadingSeed && seedSuggestion && (
          <div className="mb-6 p-4 rounded-lg border-2 border-purple-500/50 bg-purple-500/5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <span className="font-semibold text-lg">Suggested Match</span>
              <Badge 
                variant={seedSuggestion.confidence === 'high' ? 'default' : 'secondary'}
                className="ml-auto"
              >
                {seedSuggestion.confidence === 'high' ? 'High Confidence' : 'Medium Confidence'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <img 
                src="/images/nova-icon.png" 
                alt="NOVA" 
                className="h-6 w-6 object-contain" 
              />
              <span className="text-xl font-bold">{seedSuggestion.matchedName || seedSuggestion.username}</span>
            </div>
            
            <a 
              href={seedSuggestion.profileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-purple-600 hover:underline flex items-center gap-1 mb-3"
            >
              View NOVA Profile
              <ExternalLink className="h-3 w-3" />
            </a>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <User className="h-3 w-3" />
              <span>{getMatchReasonLabel(seedSuggestion.matchReason)}</span>
              {seedSuggestion.matchedName && seedSuggestion.matchedName !== contactName && (
                <span className="text-xs">• Listed as "{seedSuggestion.matchedName}"</span>
              )}
            </div>
            
            {seedSuggestion.roles && seedSuggestion.roles.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {seedSuggestion.roles.slice(0, 3).map((r, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{r}</Badge>
                ))}
              </div>
            )}
            
            <div className="flex gap-3">
              <Button 
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                size="lg"
                onClick={handleUseSeedSuggestion}
              >
                <Check className="h-4 w-4 mr-2" />
                Use This
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={onSkip}
              >
                Not a Match
              </Button>
            </div>
          </div>
        )}

        {!loadingSeed && !seedSuggestion && (
          <div className="mb-6 p-4 rounded-lg border bg-muted/30 text-center text-muted-foreground">
            <p className="mb-1">No NOVA match found</p>
            <p className="text-sm">Search manually below or skip this person</p>
          </div>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or search by name</span>
          </div>
        </div>

        {/* Manual Search Input */}
        <div className="space-y-3">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <User className="h-4 w-4" />
            </div>
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search by name..."
              className="pl-10 h-12 text-lg"
            />
          </div>

          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="border rounded-md bg-card shadow-sm">
              {suggestions.map((s) => (
                <button
                  key={s.profile_url}
                  onClick={() => handleSelectSuggestion(s.profile_url, s.username)}
                  className="w-full px-4 py-3 text-left hover:bg-muted flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium">{s.full_name}</span>
                    <span className="text-sm text-muted-foreground ml-2">@{s.username}</span>
                  </div>
                  {s.roles && s.roles.length > 0 && (
                    <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                      {s.roles.slice(0, 2).join(', ')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {searching && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}
        </div>

        {/* Skip Button */}
        <div className="mt-6 text-center">
          <Button variant="ghost" size="lg" onClick={onSkip} className="text-muted-foreground">
            Skip This Person
          </Button>
        </div>

        {/* Coworkers Section */}
        {!loadingCoworkers && coworkers.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                People {contactName.split(' ')[0]} has worked with (on NOVA)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {coworkers.map((cw) => (
                <Badge
                  key={cw.id}
                  variant="secondary"
                  className="text-xs cursor-default"
                >
                  {cw.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
