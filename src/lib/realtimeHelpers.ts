/**
 * Realtime Helpers
 * 
 * Utilities for managing Supabase realtime subscriptions with proper
 * authentication checks and graceful degradation for anonymous users.
 */

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Checks if realtime features should be enabled for the current user
 */
export async function shouldEnableRealtime(feature: 'maintenance' | 'admin' | 'user'): Promise<boolean> {
  if (!supabase) return false;

  // Maintenance mode updates are useful for ALL users (including anonymous)
  // because anonymous users need to know if the site goes into maintenance
  if (feature === 'maintenance') {
    return true; // Always enabled
  }

  // Admin and user features require authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false; // Anonymous users don't need admin/user realtime
  }

  // Admin features require admin role
  if (feature === 'admin') {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      return !error && Boolean(data);
    } catch {
      return false;
    }
  }

  // User features require authentication (already checked above)
  return feature === 'user';
}

/**
 * Creates a realtime channel with proper error handling for anonymous users
 */
export async function createRealtimeChannel(
  channelName: string,
  config: {
    table?: string;
    schema?: string;
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
    callback: (payload: any) => void;
  },
  options?: {
    feature: 'maintenance' | 'admin' | 'user';
    onError?: (error: any) => void;
    silentForAnonymous?: boolean; // Don't log errors for anonymous users
  }
): Promise<RealtimeChannel | null> {
  if (!supabase) return null;

  // Check if realtime should be enabled
  const shouldEnable = await shouldEnableRealtime(options?.feature || 'user');
  if (!shouldEnable) {
    // For anonymous users accessing non-maintenance features, silently skip
    if (options?.silentForAnonymous && options.feature !== 'maintenance') {
      return null;
    }
    return null;
  }

  try {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: config.event || '*',
          schema: config.schema || 'public',
          table: config.table!,
          filter: config.filter
        },
        config.callback
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscription active: ${channelName}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Check if user is anonymous
          supabase.auth.getUser().then(({ data: { user } }) => {
            const isAnonymous = !user;

            // For anonymous users with non-critical features, fail silently
            if (isAnonymous && options?.silentForAnonymous && options.feature !== 'maintenance') {
              return; // Don't log or track - doesn't matter for anonymous users
            }

            // For authenticated users or critical features, track the error
            const errorMsg = err?.message || `Subscription ${status.toLowerCase()}`;
            
            if (options?.onError) {
              options.onError({ status, error: err, message: errorMsg });
            } else {
              console.warn(`[Realtime] Subscription failed: ${channelName}`, { status, error: err });
            }
          });
        }
      });

    return channel;
  } catch (error) {
    console.error(`[Realtime] Failed to create channel: ${channelName}`, error);
    if (options?.onError) {
      options.onError(error);
    }
    return null;
  }
}

/**
 * Checks if current user is anonymous
 */
export async function isAnonymousUser(): Promise<boolean> {
  if (!supabase) return true;
  const { data: { user } } = await supabase.auth.getUser();
  return !user;
}

