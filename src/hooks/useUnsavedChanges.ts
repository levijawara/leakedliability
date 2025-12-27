// Hook for tracking unsaved changes and warning on navigation

import { useState, useEffect, useCallback } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

interface UseUnsavedChangesOptions {
  enabled?: boolean;
  message?: string;
}

interface UseUnsavedChangesResult {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  markAsChanged: () => void;
  markAsSaved: () => void;
  confirmNavigation: () => boolean;
}

/**
 * Hook to track and warn about unsaved changes
 */
export function useUnsavedChanges(
  options: UseUnsavedChangesOptions = {}
): UseUnsavedChangesResult {
  const { 
    enabled = true, 
    message = 'You have unsaved changes. Are you sure you want to leave?' 
  } = options;

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Warn on browser/tab close
  useBeforeUnload(
    useCallback(
      (event) => {
        if (enabled && hasUnsavedChanges) {
          event.preventDefault();
          event.returnValue = message;
          return message;
        }
      },
      [enabled, hasUnsavedChanges, message]
    )
  );

  // Block React Router navigation
  const blocker = useBlocker(
    useCallback(
      () => enabled && hasUnsavedChanges,
      [enabled, hasUnsavedChanges]
    )
  );

  // Handle blocked navigation
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmed = window.confirm(message);
      if (confirmed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, message]);

  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  const confirmNavigation = useCallback(() => {
    if (!hasUnsavedChanges) return true;
    return window.confirm(message);
  }, [hasUnsavedChanges, message]);

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    markAsChanged,
    markAsSaved,
    confirmNavigation,
  };
}

/**
 * Hook to track form dirty state
 */
export function useFormDirtyState<T extends Record<string, unknown>>(
  initialValues: T,
  currentValues: T
): boolean {
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const isChanged = JSON.stringify(initialValues) !== JSON.stringify(currentValues);
    setIsDirty(isChanged);
  }, [initialValues, currentValues]);

  return isDirty;
}

/**
 * Hook to auto-save with debounce
 */
export function useAutoSave<T>(
  data: T,
  onSave: (data: T) => Promise<void>,
  delay: number = 2000
): { isSaving: boolean; lastSaved: Date | null; error: string | null } {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (data) {
        setIsSaving(true);
        setError(null);

        try {
          await onSave(data);
          setLastSaved(new Date());
        } catch (err) {
          console.error('[useAutoSave] Error:', err);
          setError(err instanceof Error ? err.message : 'Auto-save failed');
        } finally {
          setIsSaving(false);
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [data, onSave, delay]);

  return { isSaving, lastSaved, error };
}
