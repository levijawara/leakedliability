import { useState, useEffect, useMemo } from "react";
import { Search, Check, X, ExternalLink, RefreshCw, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchContactsWithoutIG } from "@/lib/callsheets/fetchAllContacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { InstagramLink } from "@/components/callsheets/InstagramLink";
import { findIdentityMatches } from "@/lib/callsheets/identityMatching";
import type { CrewContact } from "@/types/callSheet";

interface IGUsername {
  id: string;
  handle: string;
  roles: string[] | null;
  co_workers: string[] | null;
  raw_credits: string[] | null;
  occurrences: number | null;
}

interface MatchCandidate {
  handle: string;
  confidence: number;
  reasons: string[];
  igData: IGUsername;
}

export function IGMatchingPanel() {
  const [contacts, setContacts] = useState<CrewContact[]>([]);
  const [igUsernames, setIgUsernames] = useState<IGUsername[]>([]);
  const [selectedContact, setSelectedContact] = useState<CrewContact | null>(null);
  const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  // Fetch contacts without IG handles (paginated to bypass 1000 row limit)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Please sign in to use IG matching");
          return;
        }

        // Fetch contacts missing IG handles using paginated utility
        const contactsData = await fetchContactsWithoutIG(user.id);

        // Fetch all IG usernames for matching
        const { data: igData, error: igError } = await supabase
          .from("ig_usernames")
          .select("*")
          .order("occurrences", { ascending: false });

        if (igError) throw igError;

        setContacts(contactsData);
        setIgUsernames((igData || []) as IGUsername[]);
      } catch (error) {
        console.error("[IGMatchingPanel] fetch error:", error);
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Find matches for selected contact
  useEffect(() => {
    if (!selectedContact || igUsernames.length === 0) {
      setMatchCandidates([]);
      return;
    }

    const candidates: MatchCandidate[] = [];

    for (const ig of igUsernames) {
      const reasons: string[] = [];
      let confidence = 0;

      // Check name similarity
      const nameParts = selectedContact.name.toLowerCase().split(/\s+/);
      const handleLower = ig.handle.toLowerCase();
      
      for (const part of nameParts) {
        if (part.length >= 3 && handleLower.includes(part)) {
          reasons.push(`Name "${part}" in handle`);
          confidence += 30;
        }
      }

      // Check role overlap
      if (selectedContact.roles && ig.roles) {
        const contactRoles = selectedContact.roles.map((r) => r.toLowerCase());
        const igRoles = ig.roles.map((r) => r.toLowerCase());
        const overlap = contactRoles.filter((r) => igRoles.includes(r));
        if (overlap.length > 0) {
          reasons.push(`Matching role: ${overlap.join(", ")}`);
          confidence += 20 * overlap.length;
        }
      }

      // Check co-worker overlap (would need to cross-reference other contacts)
      if (ig.occurrences && ig.occurrences > 5) {
        reasons.push(`Appears in ${ig.occurrences} credits`);
        confidence += 10;
      }

      // Only include if there's some match
      if (confidence > 0) {
        candidates.push({
          handle: ig.handle,
          confidence: Math.min(confidence, 100),
          reasons,
          igData: ig,
        });
      }
    }

    // Sort by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);
    setMatchCandidates(candidates.slice(0, 10));
  }, [selectedContact, igUsernames]);

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.roles?.some((r) => r.toLowerCase().includes(query)) ||
        c.departments?.some((d) => d.toLowerCase().includes(query))
    );
  }, [contacts, searchQuery]);

  const handleApplyMatch = async (candidate: MatchCandidate) => {
    if (!selectedContact) return;

    setIsApplying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("crew_contacts")
        .update({ ig_handle: candidate.handle })
        .eq("id", selectedContact.id)
        .eq("user_id", user.id);

      if (error) throw error;

      // Remove from list
      setContacts((prev) => prev.filter((c) => c.id !== selectedContact.id));
      setSelectedContact(null);
      toast.success(`Applied @${candidate.handle} to ${selectedContact.name}`);
    } catch (error) {
      console.error("[IGMatchingPanel] apply error:", error);
      toast.error("Failed to apply match");
    } finally {
      setIsApplying(false);
    }
  };

  const handleSkipContact = () => {
    if (!selectedContact) return;
    const currentIndex = contacts.findIndex((c) => c.id === selectedContact.id);
    const nextContact = contacts[currentIndex + 1] || contacts[0];
    setSelectedContact(nextContact !== selectedContact ? nextContact : null);
  };

  const handleManualEntry = async (handle: string) => {
    if (!selectedContact || !handle.trim()) return;

    setIsApplying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;

      const { error } = await supabase
        .from("crew_contacts")
        .update({ ig_handle: cleanHandle })
        .eq("id", selectedContact.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setContacts((prev) => prev.filter((c) => c.id !== selectedContact.id));
      setSelectedContact(null);
      toast.success(`Applied @${cleanHandle} to ${selectedContact.name}`);
    } catch (error) {
      console.error("[IGMatchingPanel] manual entry error:", error);
      toast.error("Failed to save handle");
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Instagram Handle Matching</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (contacts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Instagram Handle Matching</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>All contacts have Instagram handles assigned!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Contacts list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Contacts Missing IG ({contacts.length})
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${
                    selectedContact?.id === contact.id ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="font-medium">{contact.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {contact.roles?.join(", ") || "No role"}
                    {contact.departments?.length ? ` • ${contact.departments[0]}` : ""}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Match candidates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {selectedContact ? `Matches for ${selectedContact.name}` : "Select a Contact"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedContact ? (
            <div className="space-y-4">
              {/* Manual entry */}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter handle manually..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleManualEntry((e.target as HTMLInputElement).value);
                    }
                  }}
                />
                <Button variant="outline" onClick={handleSkipContact}>
                  Skip
                </Button>
              </div>

              {/* Match suggestions */}
              {matchCandidates.length > 0 ? (
                <ScrollArea className="h-[320px]">
                  <div className="space-y-2">
                    {matchCandidates.map((candidate) => (
                      <div
                        key={candidate.handle}
                        className="p-3 rounded-lg border hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <InstagramLink handle={candidate.handle} />
                          <Badge
                            variant={
                              candidate.confidence >= 70
                                ? "default"
                                : candidate.confidence >= 40
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {candidate.confidence}%
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {candidate.reasons.join(" • ")}
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleApplyMatch(candidate)}
                          disabled={isApplying}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Apply Match
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No automatic matches found.</p>
                  <p className="text-sm">Enter the handle manually above.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Select a contact to see matching suggestions</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
