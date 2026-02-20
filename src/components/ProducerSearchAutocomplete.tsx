import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Ghost, User, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const isHomepageSource = (s?: string) => s === "homepage";

interface ProducerSearchResult {
  producer_id: string;
  producer_name: string;
  company_name: string | null;
  is_placeholder: boolean | null;
  has_claimed_account: boolean | null;
  stripe_verification_status: string | null;
  claimed_by_user_id: string | null;
}

interface ProducerSearchAutocompleteProps {
  onSelect?: (producer: ProducerSearchResult) => void;
  onSearchChange?: (term: string) => void;
  placeholder?: string;
  className?: string;
  source?: 'homepage' | 'leaderboard' | 'profile_claim';
}

export function ProducerSearchAutocomplete({
  onSelect,
  onSearchChange,
  placeholder = "Search for producers or production companies...",
  className,
  source = 'leaderboard'
}: ProducerSearchAutocompleteProps) {
  const navigate = useNavigate();
  const isHomepage = isHomepageSource(source);
  const [searchTerm, setSearchTerm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [productionCompany, setProductionCompany] = useState("");
  const [results, setResults] = useState<ProducerSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isAdmin, setIsAdmin] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const effectiveSearchTerm = searchTerm;
  const canSearchProducer = firstName.trim().length > 0 && lastName.trim().length > 0;
  const canSearchCompany = productionCompany.trim().length > 0;

  // Check admin status on mount
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.rpc('has_role', {
            _user_id: user.id,
            _role: 'admin'
          });
          setIsAdmin(!!data);
        }
      } catch {
        // Not admin, fail silently
      }
    };
    checkAdmin();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [searchError, setSearchError] = useState<string | null>(null);
  const [rlsBlocked, setRlsBlocked] = useState(false);

  const performSearch = async (
    term: string,
    shouldLog: boolean,
    searchBy: "producer_name" | "company_name" = "producer_name"
  ) => {
    const trimmed = term.trim();
    setLoading(true);
    setSearchError(null);
    try {
      if (!supabase) {
        setSearchError("Search is currently unavailable. Please try again later.");
        setResults([]);
        setIsOpen(true);
        setRlsBlocked(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("public_producer_search")
        .select("*")
        .ilike(searchBy, `%${trimmed}%`)
        .order("producer_name")
        .limit(10);

      if (error) {
        const errorMsg = error.message?.toLowerCase() || '';
        if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('failed to fetch')) {
          setSearchError("Search is temporarily unavailable. Please check your connection.");
          setRlsBlocked(false);
        } else if (errorMsg.includes('row-level security') || errorMsg.includes('permission denied')) {
          setSearchError("Search requires authentication to access producer data");
          setRlsBlocked(true);
        } else {
          setSearchError("Unable to search. Please try again later.");
          setRlsBlocked(false);
        }
        if (!errorMsg.includes('network') && !errorMsg.includes('row-level security')) {
          console.error("Search error:", error);
        }
        setResults([]);
        setIsOpen(true);
      } else {
        setResults(data || []);
        setIsOpen(true);
        setSelectedIndex(-1);
      }

      if (shouldLog && !isAdmin && trimmed) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('search_logs').insert({
            searched_name: trimmed,
            matched_producer_id: null,
            source,
            user_id: user?.id ?? null,
            user_email: user?.email ?? null,
          });
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'admin_notification',
              to: 'leakedliability@gmail.com',
              data: {
                eventType: 'search',
                searchTerm: trimmed,
                source,
                userEmail: user?.email ?? null,
                timestamp: new Date().toISOString(),
                adminDashboardUrl: 'https://leakedliability.com/admin',
              },
            },
          });
        } catch {
          /* ignore */
        }
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message?.toLowerCase() || '';
      if (msg.includes('network') || msg.includes('fetch')) {
        setSearchError("Search is temporarily unavailable. Please check your connection.");
      } else {
        setSearchError("Unable to search. Please try again later.");
        console.error("Search error:", err);
      }
      setResults([]);
      setIsOpen(true);
      setRlsBlocked(false);
    } finally {
      setLoading(false);
    }
  };

  const handleProducerSearch = () => {
    const term = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!term) return;
    setSearchTerm(term);
    performSearch(term, true, "producer_name");
  };

  const handleCompanySearch = async () => {
    const term = productionCompany.trim();
    if (!term) return;
    setSearchTerm(term);
    setLoading(true);
    setSearchError(null);
    try {
      // Three parallel queries: reference list, producer search view, active-debt sub_name
      const [refResult, viewResult, debtResult] = await Promise.all([
        supabase
          .from("production_companies")
          .select("name")
          .ilike("name", `%${term}%`)
          .limit(10),
        supabase
          .from("public_producer_search")
          .select("*")
          .ilike("company_name", `%${term}%`)
          .order("producer_name")
          .limit(10),
        supabase
          .from("producers")
          .select("id, name, company, sub_name, total_amount_owed")
          .ilike("sub_name", `%${term}%`)
          .gt("total_amount_owed", 0)
          .limit(10),
      ]);

      // Build merged results: start with producer search view matches
      const merged = new Map<string, ProducerSearchResult>();

      // Add view results (already in the right shape)
      for (const r of viewResult.data || []) {
        merged.set(r.producer_id, r);
      }

      // Add active-debt producers matched by sub_name
      for (const r of debtResult.data || []) {
        if (!merged.has(r.id)) {
          merged.set(r.id, {
            producer_id: r.id,
            producer_name: r.name,
            company_name: r.sub_name || r.company || null,
            is_placeholder: false,
            has_claimed_account: false,
            stripe_verification_status: null,
            claimed_by_user_id: null,
          });
        }
      }

      // Add reference-only companies (no producer match) as informational entries
      for (const r of refResult.data || []) {
        const alreadyShown = Array.from(merged.values()).some(
          (m) => m.company_name?.toLowerCase() === r.name.toLowerCase()
        );
        if (!alreadyShown) {
          merged.set(`ref-${r.name}`, {
            producer_id: `ref-${r.name}`,
            producer_name: r.name,
            company_name: r.name,
            is_placeholder: null,
            has_claimed_account: null,
            stripe_verification_status: null,
            claimed_by_user_id: null,
          });
        }
      }

      setResults(Array.from(merged.values()).slice(0, 15));
      setIsOpen(true);
      setSelectedIndex(-1);

      // Log the search (reuse existing logging pattern)
      if (!isAdmin && term) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('search_logs').insert({
            searched_name: term,
            matched_producer_id: null,
            source,
            user_id: user?.id ?? null,
            user_email: user?.email ?? null,
          });
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'admin_notification',
              to: 'leakedliability@gmail.com',
              data: {
                eventType: 'search',
                searchTerm: term,
                source,
                userEmail: user?.email ?? null,
                timestamp: new Date().toISOString(),
                adminDashboardUrl: 'https://leakedliability.com/admin',
              },
            },
          });
        } catch { /* ignore */ }
      }
    } catch (err: unknown) {
      console.error("Company search error:", err);
      setSearchError("Unable to search. Please try again later.");
      setResults([]);
      setIsOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Live search for non-homepage (leaderboard, profile_claim)
  useEffect(() => {
    if (isHomepage) return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchTerm.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setSearchError(null);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchTerm, false);
      if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);
      if (!isAdmin) {
        logTimeoutRef.current = setTimeout(async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('search_logs').insert({
              searched_name: searchTerm.trim(),
              matched_producer_id: null,
              source,
              user_id: user?.id ?? null,
              user_email: user?.email ?? null,
            });
            await supabase.functions.invoke('send-email', {
              body: {
                type: 'admin_notification',
                to: 'leakedliability@gmail.com',
                data: {
                  eventType: 'search',
                  searchTerm: searchTerm.trim(),
                  source,
                  userEmail: user?.email ?? null,
                  timestamp: new Date().toISOString(),
                  adminDashboardUrl: 'https://leakedliability.com/admin',
                },
              },
            });
          } catch {
            /* ignore */
          }
        }, 1500);
      }
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);
    };
  }, [isHomepage, searchTerm, source, isAdmin]);

  // Notify parent of search changes
  useEffect(() => {
    onSearchChange?.(searchTerm);
  }, [searchTerm, onSearchChange]);

  const handleSelect = async (producer: ProducerSearchResult) => {
    if (!isAdmin) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('search_logs').insert({
          searched_name: effectiveSearchTerm.trim(),
          matched_producer_id: producer.producer_id,
          source,
          user_id: user?.id ?? null,
          user_email: user?.email ?? null,
        });
      } catch {
        // Fail silently
      }
    }

    // If already claimed/verified by someone else, just navigate to leaderboard
    if (producer.has_claimed_account && producer.stripe_verification_status === 'verified') {
      if (onSelect) {
        onSelect(producer);
      } else {
        navigate(`/leaderboard?search=${encodeURIComponent(producer.producer_name)}`);
      }
    } else if (producer.is_placeholder || !producer.has_claimed_account) {
      // Unclaimed placeholder: navigate to claim page
      navigate(`/claim/${producer.producer_id}`);
    } else {
      // Real producer: call onSelect or navigate to leaderboard with search
      if (onSelect) {
        onSelect(producer);
      } else {
        navigate(`/leaderboard?search=${encodeURIComponent(producer.producer_name)}`);
      }
    }
    
    setSearchTerm(producer.producer_name);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Enter' && searchTerm.trim()) {
        navigate(`/leaderboard?search=${encodeURIComponent(searchTerm.trim())}`);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        } else if (searchTerm.trim()) {
          navigate(`/leaderboard?search=${encodeURIComponent(searchTerm.trim())}`);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      {isHomepage ? (
        /* Homepage: producer identity boxes OR production company box */
        <div className="space-y-4">
          {/* Producer path: first + last name */}
        <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <Search className={cn("h-5 w-5 text-muted-foreground", loading && "animate-pulse")} />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <Input
                type="text"
                aria-label="First name or alias"
                placeholder="First name or alias"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canSearchProducer && handleProducerSearch()}
                className="bg-background border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
              />
              <Input
                type="text"
                aria-label="Last name"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canSearchProducer && handleProducerSearch()}
                className="bg-background border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" aria-hidden="true" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">or</span>
            <div className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>

          {/* Production company path */}
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0 opacity-0"
              aria-hidden="true"
            />
            <Input
              type="text"
              aria-label="Production company name"
              placeholder="Production company name"
              value={productionCompany}
              onChange={(e) => setProductionCompany(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSearchCompany && handleCompanySearch()}
              className="flex-1 bg-background border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
            />
          </div>

          {/* Search button — always visible */}
          <div className="flex justify-center pt-2">
            <Button
              onClick={() => {
                if (canSearchCompany) handleCompanySearch();
                else if (canSearchProducer) handleProducerSearch();
              }}
              disabled={loading || (!canSearchProducer && !canSearchCompany)}
              className="h-12 px-8 rounded-xl"
            >
              {loading ? "Searching…" : "Search"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            <Search className={cn("h-5 w-5 text-muted-foreground", loading && "animate-pulse")} />
          </div>
          <Input
            ref={inputRef}
            type="text"
            aria-label="Search producers or production companies"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            className="bg-background border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 w-full"
          />
        </div>
      )}

      {/* Results dropdown: simplified for homepage (no ghosts, no badges), full for others */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <ul className="max-h-64 overflow-y-auto">
            {results.map((producer, index) => (
              <li
                key={producer.producer_id}
                className={cn(
                  "px-4 py-3 cursor-pointer flex items-center justify-between gap-2 transition-colors",
                  index === selectedIndex ? "bg-muted" : "hover:bg-muted/50",
                  producer.is_placeholder && !isHomepage && "opacity-90"
                )}
                onClick={() => handleSelect(producer)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {!isHomepage && (
                    producer.is_placeholder ? (
                      <Ghost className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <User className="h-4 w-4 text-primary flex-shrink-0" />
                    )
                  )}
                  <span className="truncate font-medium">{producer.producer_name}</span>
                  {producer.company_name && (
                    <span className="text-muted-foreground text-sm truncate">
                      ({producer.company_name})
                    </span>
                  )}
                </div>
                {!isHomepage && (
                  <>
                    {producer.has_claimed_account && producer.stripe_verification_status === 'verified' && (
                      <Badge variant="outline" className="text-xs flex-shrink-0 border-green-500/50 text-green-500 gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Verified Owner
                      </Badge>
                    )}
                    {producer.stripe_verification_status === 'pending' && (
                      <Badge variant="outline" className="text-xs flex-shrink-0 border-orange-500/50 text-orange-500 gap-1">
                        <Clock className="h-3 w-3" />
                        Verifying
                      </Badge>
                    )}
                    {producer.stripe_verification_status === 'pending_admin' && (
                      <Badge variant="outline" className="text-xs flex-shrink-0 border-yellow-500/50 text-yellow-500 gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Pending Review
                      </Badge>
                    )}
                    {(producer.is_placeholder || (!producer.has_claimed_account && (!producer.stripe_verification_status || producer.stripe_verification_status === 'unverified'))) && (
                      <Badge variant="outline" className="text-xs flex-shrink-0 border-muted-foreground/30 text-muted-foreground">
                        Unclaimed
                      </Badge>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          {!isHomepage && results.some(r => r.is_placeholder) && (
            <div className="px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
              <Ghost className="h-3 w-3 inline mr-1" />
              Unclaimed profiles require subscription to view
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {searchError && searchTerm.length >= 2 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-status-warning/50 rounded-xl shadow-lg z-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-status-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">
                {searchError}
              </p>
              {rlsBlocked && (
                <p className="text-xs text-muted-foreground">
                  <button
                    onClick={() => {
                      const currentPath = window.location.pathname;
                      window.location.href = `/auth?redirect=${encodeURIComponent(currentPath)}`;
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                  {" to access producer search"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No results message */}
      {!searchError && isOpen && searchTerm.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 p-4 text-center text-muted-foreground text-sm">
          No producers found matching "{searchTerm}"
        </div>
      )}
    </div>
  );
}
