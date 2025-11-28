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
  source?: 'homepage' | 'leaderboard';
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

  // Search for producers as user types
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("public_producer_search")
          .select("*")
          .ilike("producer_name", `%${searchTerm.trim()}%`)
          .order("producer_name")
          .limit(10);

        if (error) throw error;
        setResults(data || []);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    // Debounced search logging
    if (logTimeoutRef.current) {
      clearTimeout(logTimeoutRef.current);
    }
    logTimeoutRef.current = setTimeout(async () => {
      try {
        await supabase.from('search_logs').insert({
          searched_name: searchTerm.trim(),
          matched_producer_id: null,
          source
        });
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

      {/* No results message */}
      {isOpen && searchTerm.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 p-4 text-center text-muted-foreground text-sm">
          No producers found matching "{searchTerm}"
        </div>
      )}
    </div>
  );
}
