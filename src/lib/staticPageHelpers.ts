/**
 * Helpers for static pages that should work without backend
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Checks if Supabase is available for backend-dependent features
 */
export function isBackendAvailable(): boolean {
  return supabase !== null;
}

/**
 * Checks if we're on a static page that shouldn't require backend
 */
export function isStaticPage(pathname: string): boolean {
  const staticPaths = [
    '/how-it-works',
    '/why-it-works',
    '/disclaimer',
    '/privacy-policy',
    '/faq',
  ];
  
  return staticPaths.includes(pathname);
}

/**
 * Gets a user-friendly message when backend is unavailable
 */
export function getBackendUnavailableMessage(feature: string = 'feature'): string {
  return `${feature} is temporarily unavailable. Please try again later.`;
}

