import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Ghost, User, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<ProducerSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Search for producers as user types
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setSearchError(null);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setSearchError(null);
      try {
        if (!supabase) {
          setSearchError("Search is currently unavailable. Please try again later.");
          setResults([]);
          setIsOpen(true); // Keep dropdown open to show message
          setRlsBlocked(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("public_producer_search")
          .select("*")
          .ilike("producer_name", `%${searchTerm.trim()}%`)
          .order("producer_name")
          .limit(10);

        if (error) {
          const errorMsg = error.message?.toLowerCase() || '';
          
          // Check for network/connection errors
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
          
          // Only log unexpected errors (not network/RLS issues which are handled gracefully)
          if (!errorMsg.includes('network') && !errorMsg.includes('row-level security')) {
            console.error("Search error:", error);
          }
          
          setResults([]);
          setIsOpen(true); // Keep dropdown open to show message
        }
        
        setResults(data || []);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (error: any) {
        // Handle network errors gracefully
        const errorMsg = error?.message?.toLowerCase() || '';
        if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          setSearchError("Search is temporarily unavailable. Please check your connection.");
        } else {
          setSearchError("Unable to search. Please try again later.");
          console.error("Search error:", error);
        }
        setResults([]);
        setIsOpen(true); // Keep dropdown open to show message
        setRlsBlocked(false);
      } finally {
        setLoading(false);
      }
    }, 300);

    // Debounced search logging with admin notification
    if (logTimeoutRef.current) {
      clearTimeout(logTimeoutRef.current);
    }
    logTimeoutRef.current = setTimeout(async () => {
      try {
        // Get current user info
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email || null;
        const userId = user?.id || null;
        
        // Log search with user info
        await supabase.from('search_logs').insert({
          searched_name: searchTerm.trim(),
          matched_producer_id: null,
          source,
          user_id: userId,
          user_email: userEmail
        });
        
        // Send admin notification (skip for admin accounts)
        const ADMIN_EMAILS = ['leakedliability@gmail.com', 'lojawara@gmail.com'];
        if (!userEmail || !ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'admin_notification',
              to: 'leakedliability@gmail.com',
              data: {
                eventType: 'search',
                searchTerm: searchTerm.trim(),
                source,
                userEmail: userEmail || null,
                timestamp: new Date().toISOString(),
                adminDashboardUrl: 'https://leakedliability.com/admin',
              },
            },
          });
        }
      } catch {
        // Fail silently
      }
    }, 1500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);
    };
  }, [searchTerm, source]);

  // Notify parent of search changes
  useEffect(() => {
    onSearchChange?.(searchTerm);
  }, [searchTerm, onSearchChange]);

  const handleSelect = async (producer: ProducerSearchResult) => {
    // Log the matched producer (fire and forget)
    try {
      await supabase.from('search_logs').insert({
        searched_name: searchTerm.trim(),
        matched_producer_id: producer.producer_id,
        source
      });
    } catch {
      // Fail silently
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

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <ul className="max-h-64 overflow-y-auto">
            {results.map((producer, index) => (
              <li
                key={producer.producer_id}
                className={cn(
                  "px-4 py-3 cursor-pointer flex items-center justify-between gap-2 transition-colors",
                  index === selectedIndex ? "bg-muted" : "hover:bg-muted/50",
                  producer.is_placeholder && "opacity-90"
                )}
                onClick={() => handleSelect(producer)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {producer.is_placeholder ? (
                    <Ghost className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <User className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                  <span className="truncate font-medium">{producer.producer_name}</span>
                  {producer.company_name && (
                    <span className="text-muted-foreground text-sm truncate">
                      ({producer.company_name})
                    </span>
                  )}
                </div>
                
                {/* Verification Status Badges */}
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
              </li>
            ))}
          </ul>
          
          {results.some(r => r.is_placeholder) && (
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
