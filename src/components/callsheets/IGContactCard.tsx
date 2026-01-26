import { useState, useEffect } from "react";
import { Instagram, Check, Loader2, Users, Sparkles, Phone, Mail, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Coworker {
  id: string;
  name: string;
  ig_handle: string | null;
}

interface SeedSuggestion {
  handle: string;
  confidence: 'high' | 'medium';
  matchReason: 'phone' | 'email' | 'name';
  matchedName?: string;
}

interface IGContactCardProps {
  contactId: string;
  contactName: string;
  contactPhones?: string[];
  contactEmails?: string[];
  role: string;
  callSheetId: string;
  onMatch: (igHandle: string | null) => void;
  onSkip: () => void;
}

export function IGContactCard({
  contactId,
  contactName,
  contactPhones,
  contactEmails,
  role,
  callSheetId,
  onMatch,
  onSkip
}: IGContactCardProps) {
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ handle: string; roles: string[] }>>([]);
  const [coworkers, setCoworkers] = useState<Coworker[]>([]);
  const [loadingCoworkers, setLoadingCoworkers] = useState(true);
  const [searching, setSearching] = useState(false);
  
  // Seed suggestion state
  const [seedSuggestion, setSeedSuggestion] = useState<SeedSuggestion | null>(null);
  const [loadingSeed, setLoadingSeed] = useState(true);

  // Fetch seed suggestion from ig_master_identities
  useEffect(() => {
    async function fetchSeedSuggestion() {
      try {
        setLoadingSeed(true);
        setSeedSuggestion(null);
        
        const { data, error } = await supabase.functions.invoke('get-seed-ig-suggestion', {
          body: {
            name: contactName,
            phones: contactPhones || [],
            emails: contactEmails || []
          }
        });

        if (error) {
          console.error('[IGContactCard] Seed suggestion error:', error);
          return;
        }

        if (data?.seedSuggestion) {
          setSeedSuggestion({
            handle: data.seedSuggestion,
            confidence: data.confidence || 'medium',
            matchReason: data.matchReason || 'name',
            matchedName: data.matchedName
          });
        }
      } catch (error) {
        console.error('[IGContactCard] Seed suggestion fetch error:', error);
      } finally {
        setLoadingSeed(false);
      }
    }

    fetchSeedSuggestion();
  }, [contactId, contactName, contactPhones, contactEmails]);

  // Fetch coworkers from the same call sheets
  useEffect(() => {
    async function fetchCoworkers() {
      try {
        setLoadingCoworkers(true);

        // Get all call sheets this contact is linked to
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

        // Get other contacts from those call sheets who have IG handles
        const { data: coworkerLinks, error: coworkersError } = await supabase
          .from('contact_call_sheets')
          .select(`
            contact_id,
            crew_contacts!inner (
              id,
              name,
              ig_handle
            )
          `)
          .in('call_sheet_id', callSheetIds)
          .neq('contact_id', contactId);

        if (coworkersError) throw coworkersError;

        // Dedupe and filter to those with IG handles
        const seen = new Set<string>();
        const uniqueCoworkers: Coworker[] = [];

        for (const link of coworkerLinks || []) {
          const contact = (link as any).crew_contacts;
          if (contact && contact.ig_handle && !seen.has(contact.id)) {
            seen.add(contact.id);
            uniqueCoworkers.push({
              id: contact.id,
              name: contact.name,
              ig_handle: contact.ig_handle
            });
          }
        }

        setCoworkers(uniqueCoworkers.slice(0, 8)); // Limit to 8
      } catch (error) {
        console.error('[IGContactCard] Fetch coworkers error:', error);
      } finally {
        setLoadingCoworkers(false);
      }
    }

    fetchCoworkers();
  }, [contactId]);

  // Search ig_usernames table with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchValue.length < 2) {
        setSuggestions([]);
        return;
      }

      setSearching(true);
      try {
        const searchTerm = searchValue.replace(/^@/, '').toLowerCase();
        
        const { data, error } = await supabase
          .from('ig_usernames')
          .select('handle, roles')
          .ilike('handle', `%${searchTerm}%`)
          .limit(5);

        if (error) throw error;

        setSuggestions(data || []);
      } catch (error) {
        console.error('[IGContactCard] Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleSelectSuggestion = async (handle: string) => {
    // Get current user for user_ig_map
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Update the contact's ig_handle
    await supabase
      .from('crew_contacts')
      .update({ ig_handle: handle })
      .eq('id', contactId);

    // 2. Add to ig_usernames if not exists
    await supabase
      .from('ig_usernames')
      .upsert({ handle, roles: [role] }, { onConflict: 'handle' });

    // 3. Write to user_ig_map for future auto-restoration
    if (user) {
      await supabase.rpc('upsert_user_ig_map', {
        p_user_id: user.id,
        p_name: contactName,
        p_ig_handle: handle
      });
    }

    // 4. Sync to ig_master_identities (non-blocking)
    supabase.functions.invoke('update-ig-master-list', {
      body: {
        instagram_handle: handle,
        contact_name: contactName,
        roles: role ? [role] : [],
        phones: contactPhones || [],
        emails: contactEmails || [],
        source: 'ig_match_portal'
      }
    }).catch(err => console.error('[IGContactCard] Master list sync failed:', err));

    onMatch(handle);
  };

  const handleManualSubmit = async () => {
    if (!searchValue.trim()) return;

    const handle = searchValue.replace(/^@/, '').trim();
    
    // Get current user for user_ig_map
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Update the contact's ig_handle
    await supabase
      .from('crew_contacts')
      .update({ ig_handle: handle })
      .eq('id', contactId);

    // 2. Add to ig_usernames
    await supabase
      .from('ig_usernames')
      .upsert({ handle, roles: [role] }, { onConflict: 'handle' });

    // 3. Write to user_ig_map for future auto-restoration
    if (user) {
      await supabase.rpc('upsert_user_ig_map', {
        p_user_id: user.id,
        p_name: contactName,
        p_ig_handle: handle
      });
    }

    // 4. Sync to ig_master_identities (non-blocking)
    supabase.functions.invoke('update-ig-master-list', {
      body: {
        instagram_handle: handle,
        contact_name: contactName,
        roles: role ? [role] : [],
        phones: contactPhones || [],
        emails: contactEmails || [],
        source: 'ig_match_portal'
      }
    }).catch(err => console.error('[IGContactCard] Master list sync failed:', err));

    onMatch(handle);
  };

  const handleUseSeedSuggestion = () => {
    if (seedSuggestion) {
      handleSelectSuggestion(seedSuggestion.handle);
    }
  };

  const getMatchReasonLabel = (reason: string) => {
    switch (reason) {
      case 'phone': return 'Matched by phone';
      case 'email': return 'Matched by email';
      case 'name': return 'Matched by name';
      default: return 'Match found';
    }
  };

  const getMatchReasonIcon = (reason: string) => {
    switch (reason) {
      case 'phone': return <Phone className="h-3 w-3" />;
      case 'email': return <Mail className="h-3 w-3" />;
      case 'name': return <User className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <Card className="border-2">
      <CardContent className="p-6">
        {/* Contact Identity - Prominent */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold mb-1">{contactName}</h2>
          <p className="text-muted-foreground">{role || "No role specified"}</p>
          
          {/* Show contact's phone/email for context */}
          <div className="flex flex-wrap gap-3 justify-center mt-3 text-sm text-muted-foreground">
            {contactPhones && contactPhones.length > 0 && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {contactPhones[0]}
              </span>
            )}
            {contactEmails && contactEmails.length > 0 && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {contactEmails[0]}
              </span>
            )}
          </div>
        </div>

        {/* Seed Suggestion Section - The main feature */}
        {loadingSeed && (
          <div className="mb-6 p-4 rounded-lg border bg-muted/30 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Cross-referencing against 833 verified identities...</span>
          </div>
        )}

        {!loadingSeed && seedSuggestion && (
          <div className="mb-6 p-4 rounded-lg border-2 border-primary/50 bg-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Suggested Match</span>
              <Badge 
                variant={seedSuggestion.confidence === 'high' ? 'default' : 'secondary'}
                className="ml-auto"
              >
                {seedSuggestion.confidence === 'high' ? 'High Confidence' : 'Medium Confidence'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <Instagram className="h-6 w-6 text-muted-foreground" />
              <span className="text-xl font-bold">@{seedSuggestion.handle}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              {getMatchReasonIcon(seedSuggestion.matchReason)}
              <span>{getMatchReasonLabel(seedSuggestion.matchReason)}</span>
              {seedSuggestion.matchedName && seedSuggestion.matchedName !== contactName && (
                <span className="text-xs">• Listed as "{seedSuggestion.matchedName}"</span>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button 
                className="flex-1"
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
            <p className="mb-1">No verified match found</p>
            <p className="text-sm">Search manually below or skip this person</p>
          </div>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or enter manually</span>
          </div>
        </div>

        {/* IG Search Input */}
        <div className="space-y-3">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Instagram className="h-4 w-4" />
            </div>
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search or type username..."
              className="pl-10 pr-24 h-12 text-lg"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              {searchValue && (
                <Button size="sm" onClick={handleManualSubmit}>
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
              )}
            </div>
          </div>

          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="border rounded-md bg-card shadow-sm">
              {suggestions.map((s) => (
                <button
                  key={s.handle}
                  onClick={() => handleSelectSuggestion(s.handle)}
                  className="w-full px-4 py-3 text-left hover:bg-muted flex items-center justify-between"
                >
                  <span className="font-medium">@{s.handle}</span>
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

        {/* Coworkers Section - Collapsed at bottom */}
        {!loadingCoworkers && coworkers.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                People {contactName.split(' ')[0]} has worked with
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {coworkers.map((cw) => (
                <Badge
                  key={cw.id}
                  variant="secondary"
                  className="text-xs cursor-default"
                >
                  {cw.name} <span className="text-primary ml-1">@{cw.ig_handle}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
