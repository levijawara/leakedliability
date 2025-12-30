/**
 * Failure Tracking System
 * 
 * Tracks silent failures in background systems (analytics, realtime, role checks)
 * and makes them visible to developers/admins for debugging.
 */

type FailureType = 'analytics' | 'realtime' | 'role_check' | 'other';

interface FailureRecord {
  type: FailureType;
  component: string;
  error: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class FailureTracker {
  private failures: FailureRecord[] = [];
  private readonly maxFailures = 50; // Keep last 50 failures
  private readonly logToConsole = true;
  private readonly showInUI = true; // In development or for admins

  /**
   * Record a failure
   */
  record(type: FailureType, component: string, error: Error | string, metadata?: Record<string, any>) {
    const errorMessage = error instanceof Error ? error.message : error;
    const record: FailureRecord = {
      type,
      component,
      error: errorMessage,
      timestamp: Date.now(),
      metadata
    };

    // Add to queue
    this.failures.unshift(record);
    if (this.failures.length > this.maxFailures) {
      this.failures = this.failures.slice(0, this.maxFailures);
    }

    // Log to console with visibility
    if (this.logToConsole) {
      const prefix = this.getFailurePrefix(type);
      console.error(
        `${prefix}[${component}] ${errorMessage}`,
        metadata ? { metadata } : ''
      );
    }

    // Store in sessionStorage for persistence across page reloads (dev only)
    if (import.meta.env.DEV) {
      try {
        const stored = sessionStorage.getItem('failure_tracker');
        const existing = stored ? JSON.parse(stored) : [];
        existing.unshift(record);
        // Keep only last 20 in sessionStorage
        sessionStorage.setItem('failure_tracker', JSON.stringify(existing.slice(0, 20)));
      } catch (e) {
        // Ignore sessionStorage errors
      }
    }

    // Emit custom event for UI components to listen to
    if (this.showInUI) {
      window.dispatchEvent(new CustomEvent('system-failure', { detail: record }));
    }
  }

  /**
   * Get all failures
   */
  getFailures(): FailureRecord[] {
    return [...this.failures];
  }

  /**
   * Get failures by type
   */
  getFailuresByType(type: FailureType): FailureRecord[] {
    return this.failures.filter(f => f.type === type);
  }

  /**
   * Clear all failures
   */
  clear() {
    this.failures = [];
    if (import.meta.env.DEV) {
      sessionStorage.removeItem('failure_tracker');
    }
  }

  /**
   * Check if there are recent failures of a specific type
   */
  hasRecentFailures(type: FailureType, withinMs: number = 60000): boolean {
    const cutoff = Date.now() - withinMs;
    return this.failures.some(f => f.type === type && f.timestamp > cutoff);
  }

  /**
   * Get failure prefix for console logging
   */
  private getFailurePrefix(type: FailureType): string {
    const prefixes = {
      analytics: '🔴 [ANALYTICS FAILURE]',
      realtime: '🔴 [REALTIME FAILURE]',
      role_check: '🔴 [ROLE CHECK FAILURE]',
      other: '🔴 [SYSTEM FAILURE]'
    };
    return prefixes[type] || prefixes.other;
  }
}

// Singleton instance
export const failureTracker = new FailureTracker();

/**
 * Helper function to record analytics failures
 */
export function trackAnalyticsFailure(component: string, error: Error | string, metadata?: Record<string, any>) {
  failureTracker.record('analytics', component, error, metadata);
}

/**
 * Helper function to record realtime subscription failures
 */
export function trackRealtimeFailure(component: string, error: Error | string, metadata?: Record<string, any>) {
  failureTracker.record('realtime', component, error, metadata);
}

/**
 * Helper function to record role check failures
 */
export function trackRoleCheckFailure(component: string, error: Error | string, metadata?: Record<string, any>) {
  failureTracker.record('role_check', component, error, metadata);
}

/**
 * Helper function to record other system failures
 */
export function trackFailure(type: FailureType, component: string, error: Error | string, metadata?: Record<string, any>) {
  failureTracker.record(type, component, error, metadata);
}

/**
 * React hook to access failure tracking (for admin UI)
 */
export function useFailureTracking() {
  return {
    failures: failureTracker.getFailures(),
    failuresByType: (type: FailureType) => failureTracker.getFailuresByType(type),
    hasRecentFailures: (type: FailureType, withinMs?: number) => failureTracker.hasRecentFailures(type, withinMs),
    clear: () => failureTracker.clear()
  };
}

