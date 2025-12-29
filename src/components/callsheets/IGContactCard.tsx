import { useState, useEffect } from "react";
import { Instagram, X, Check, Loader2, Users } from "lucide-react";
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

interface IGContactCardProps {
  contactId: string;
  contactName: string;
  role: string;
  callSheetId: string;
  onMatch: (igHandle: string | null) => void;
  onSkip: () => void;
}

export function IGContactCard({
  contactId,
  contactName,
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
    // Update the contact's ig_handle
    await supabase
      .from('crew_contacts')
      .update({ ig_handle: handle })
      .eq('id', contactId);

    // Add to ig_usernames if not exists
    await supabase
      .from('ig_usernames')
      .upsert({ handle, roles: [role] }, { onConflict: 'handle' });

    onMatch(handle);
  };

  const handleManualSubmit = async () => {
    if (!searchValue.trim()) return;

    const handle = searchValue.replace(/^@/, '').trim();
    
    // Update the contact's ig_handle
    await supabase
      .from('crew_contacts')
      .update({ ig_handle: handle })
      .eq('id', contactId);

    // Add to ig_usernames
    await supabase
      .from('ig_usernames')
      .upsert({ handle, roles: [role] }, { onConflict: 'handle' });

    onMatch(handle);
  };

  return (
    <Card>
      <CardContent className="p-4">
        {/* Contact Info */}
        <div className="mb-4">
          <h3 className="font-semibold text-lg">{contactName}</h3>
          <p className="text-sm text-muted-foreground">{role || "No role specified"}</p>
        </div>

        {/* Coworkers Section */}
        {!loadingCoworkers && coworkers.length > 0 && (
          <div className="mb-4">
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

        {loadingCoworkers && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading coworkers...
          </div>
        )}

        {/* IG Search Input */}
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Instagram className="h-4 w-4" />
            </div>
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search to find username, or manually add new..."
              className="pl-10 pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              {searchValue && (
                <Button size="sm" variant="ghost" onClick={handleManualSubmit}>
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={onSkip}>
                Skip
              </Button>
            </div>
          </div>

          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="border rounded-md bg-card shadow-sm">
              {suggestions.map((s) => (
                <button
                  key={s.handle}
                  onClick={() => handleSelectSuggestion(s.handle)}
                  className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between text-sm"
                >
                  <span className="font-medium">@{s.handle}</span>
                  {s.roles && s.roles.length > 0 && (
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">
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
      </CardContent>
    </Card>
  );
}
