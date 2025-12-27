// Hook for Instagram handle autocomplete from ig_usernames table

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IgSuggestion {
  handle: string;
  roles: string[];
  occurrences: number;
}

interface UseIgHandleAutocompleteResult {
  suggestions: IgSuggestion[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearSuggestions: () => void;
}

/**
 * Custom debounce hook for search
 */
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for fetching Instagram handle suggestions
 */
export function useIgHandleAutocomplete(): UseIgHandleAutocompleteResult {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<IgSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounceValue(query, 300);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const cleanQuery = debouncedQuery.replace(/^@/, '').toLowerCase();

        const { data, error: queryError } = await supabase
          .from('ig_usernames')
          .select('handle, roles, occurrences')
          .ilike('handle', `%${cleanQuery}%`)
          .order('occurrences', { ascending: false })
          .limit(10);

        if (queryError) throw queryError;

        setSuggestions(
          (data || []).map((row) => ({
            handle: row.handle,
            roles: row.roles || [],
            occurrences: row.occurrences || 1,
          }))
        );
      } catch (err) {
        console.error('[useIgHandleAutocomplete] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setQuery('');
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    search,
    clearSuggestions,
  };
}

/**
 * Hook to get IG handle details
 */
export function useIgHandleDetails(handle: string | null) {
  const [details, setDetails] = useState<IgSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!handle) {
        setDetails(null);
        return;
      }

      setIsLoading(true);

      try {
        const cleanHandle = handle.replace(/^@/, '').toLowerCase();

        const { data, error } = await supabase
          .from('ig_usernames')
          .select('handle, roles, occurrences')
          .eq('handle', cleanHandle)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setDetails({
            handle: data.handle,
            roles: data.roles || [],
            occurrences: data.occurrences || 1,
          });
        } else {
          setDetails(null);
        }
      } catch (err) {
        console.error('[useIgHandleDetails] Error:', err);
        setDetails(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [handle]);

  return { details, isLoading };
}
