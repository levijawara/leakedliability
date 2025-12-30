/**
 * RLS (Row Level Security) Assumption Validation
 * 
 * Validates that expected public-access tables/views are actually accessible.
 * Detects when RLS policies change and break expected functionality.
 */

import { supabase } from "@/integrations/supabase/client";
import { trackFailure } from "./failureTracking";

export interface RLSAssumption {
  tableOrView: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  shouldBeAccessible: boolean; // Should anonymous users be able to access this?
  description: string;
  critical: boolean; // If false, app can continue with degraded functionality
}

/**
 * Expected RLS assumptions for the application
 * These are tables/views that SHOULD be accessible based on app requirements
 */
export const EXPECTED_RLS_ASSUMPTIONS: RLSAssumption[] = [
  {
    tableOrView: 'public_producer_search',
    operation: 'SELECT',
    shouldBeAccessible: true,
    description: 'Producer search autocomplete on homepage - must be readable by anonymous users',
    critical: false, // App can continue without search
  },
  {
    tableOrView: 'public_leaderboard',
    operation: 'SELECT',
    shouldBeAccessible: true,
    description: 'Leaderboard page - should be readable by anonymous users (subscription may be required)',
    critical: false, // App shows paywall if blocked
  },
  {
    tableOrView: 'fafo_entries',
    operation: 'SELECT',
    shouldBeAccessible: true,
    description: 'FAFO results page - must be readable by anonymous users',
    critical: false, // Results page can show empty state
  },
  {
    tableOrView: 'site_settings',
    operation: 'SELECT',
    shouldBeAccessible: false, // This should NOT be accessible to anonymous users for security
    description: 'Site settings - should NOT be accessible to anonymous users',
    critical: false, // Maintenance mode check fails gracefully
  },
];

export interface RLSValidationResult {
  assumption: RLSAssumption;
  actualAccess: boolean;
  matches: boolean;
  error?: unknown;
  warning?: string;
}

/**
 * Tests if a table/view is accessible to anonymous users
 */
async function testAnonymousAccess(
  tableOrView: string,
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
): Promise<{ accessible: boolean; error?: unknown }> {
  if (!supabase) {
    return { accessible: false, error: 'Supabase client not available' };
  }

  try {
    // For SELECT operations, try a simple query
    if (operation === 'SELECT') {
      // Use type assertion to bypass strict type checking for dynamic table names
      const { data, error } = await (supabase
        .from(tableOrView as 'public_leaderboard')
        .select('*')
        .limit(1) as unknown as Promise<{ data: unknown; error: { message?: string; code?: string } | null }>);

      // If we get data OR an empty array, the query worked (accessible)
      // If we get an RLS error, it's not accessible
      if (error) {
        const errorMsg = error.message?.toLowerCase() || '';
        const isRLSError = 
          errorMsg.includes('row-level security') ||
          errorMsg.includes('permission denied') ||
          error.code === '42501' ||
          error.code === 'PGRST301';

        if (isRLSError) {
          return { accessible: false, error };
        }
        // Other errors (table doesn't exist, etc.) also mean not accessible
        return { accessible: false, error };
      }

      // Success - table is accessible
      return { accessible: true };
    }

    // For other operations, we'd need different tests
    // For now, just test SELECT as that's what we care about for public access
    return { accessible: false, error: 'Only SELECT operation testing is currently implemented' };
  } catch (err) {
    return { accessible: false, error: err };
  }
}

/**
 * Validates all RLS assumptions
 * Should be called on app initialization
 */
export async function validateRLSAssumptions(): Promise<RLSValidationResult[]> {
  const results: RLSValidationResult[] = [];

  for (const assumption of EXPECTED_RLS_ASSUMPTIONS) {
    const { accessible, error } = await testAnonymousAccess(
      assumption.tableOrView,
      assumption.operation
    );

    const matches = accessible === assumption.shouldBeAccessible;
    
    const result: RLSValidationResult = {
      assumption,
      actualAccess: accessible,
      matches,
    };

    if (!matches) {
      if (assumption.shouldBeAccessible && !accessible) {
        // Expected to be accessible but isn't - CRITICAL
        result.warning = `RLS ASSUMPTION VIOLATION: ${assumption.tableOrView} should be accessible to anonymous users but is blocked.`;
        
        // Track as critical failure if marked as critical
        if (assumption.critical) {
          trackFailure('other', 'RLSValidation', result.warning, {
            table: assumption.tableOrView,
            operation: assumption.operation,
            expected: assumption.shouldBeAccessible,
            actual: accessible,
            error
          });
        }
      } else if (!assumption.shouldBeAccessible && accessible) {
        // Should NOT be accessible but is - SECURITY WARNING
        result.warning = `SECURITY WARNING: ${assumption.tableOrView} is accessible to anonymous users but should not be.`;
      }

      if (error) {
        result.error = error;
      }
    }

    results.push(result);
  }

  return results;
}

/**
 * Logs RLS validation results to console
 */
export function logRLSValidationResults(results: RLSValidationResult[]) {
  const violations = results.filter(r => !r.matches);
  const criticalViolations = violations.filter(r => r.assumption.critical);

  if (violations.length === 0) {
    console.log('✅ [RLS Validation] All RLS assumptions are met');
    return;
  }

  console.group('🔴 [RLS Validation] RLS Assumption Violations Detected');
  
  criticalViolations.forEach(result => {
    console.error(`[CRITICAL] ${result.warning}`);
    if (result.error) {
      console.error('Error details:', result.error);
    }
  });

  violations.filter(r => !r.assumption.critical).forEach(result => {
    console.warn(`[WARNING] ${result.warning}`);
    if (result.error) {
      console.warn('Error details:', result.error);
    }
  });

  violations.forEach(result => {
    console.log(`  - ${result.assumption.tableOrView} (${result.assumption.operation}):`, {
      expected: result.assumption.shouldBeAccessible ? 'accessible' : 'blocked',
      actual: result.actualAccess ? 'accessible' : 'blocked',
      description: result.assumption.description
    });
  });

  console.groupEnd();
}

/**
 * Gets a summary of RLS violations for UI display
 */
export function getRLSViolationsSummary(results: RLSValidationResult[]): {
  hasViolations: boolean;
  criticalCount: number;
  warningCount: number;
  violations: RLSValidationResult[];
} {
  const violations = results.filter(r => !r.matches);
  const criticalViolations = violations.filter(r => r.assumption.critical);
  
  return {
    hasViolations: violations.length > 0,
    criticalCount: criticalViolations.length,
    warningCount: violations.length - criticalViolations.length,
    violations
  };
}
