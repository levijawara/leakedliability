/**
 * Database Table/View Existence Validation
 * 
 * Validates that critical tables and views exist before using them.
 * Prevents unpredictable failures in fresh environments or mis-synced migrations.
 */

import { supabase } from "@/integrations/supabase/client";
import { trackFailure } from "./failureTracking";

export interface TableDefinition {
  name: string;
  type: 'table' | 'view';
  critical: boolean; // If false, app can continue with degraded functionality
  description: string;
  fallbackMessage?: string;
}

/**
 * Critical tables and views that the app depends on
 */
export const REQUIRED_TABLES: TableDefinition[] = [
  {
    name: 'site_settings',
    type: 'table',
    critical: false, // App can work without maintenance mode
    description: 'Site configuration and maintenance mode',
    fallbackMessage: 'Maintenance mode unavailable',
  },
  {
    name: 'producers',
    type: 'table',
    critical: true, // Core feature - leaderboard depends on this
    description: 'Producer data for leaderboard',
  },
  {
    name: 'public_leaderboard',
    type: 'view',
    critical: false, // Leaderboard page can show error instead
    description: 'Public leaderboard view',
    fallbackMessage: 'Leaderboard data unavailable',
  },
  {
    name: 'public_producer_search',
    type: 'view',
    critical: false, // Search can show error instead
    description: 'Producer search autocomplete view',
    fallbackMessage: 'Search unavailable',
  },
  {
    name: 'fafo_entries',
    type: 'table',
    critical: false, // Results page can show empty state
    description: 'FAFO results entries',
    fallbackMessage: 'Results unavailable',
  },
  {
    name: 'account_bans',
    type: 'table',
    critical: false, // Ban page can show fallback message
    description: 'Account ban records',
    fallbackMessage: 'Ban information unavailable',
  },
  {
    name: 'user_entitlements',
    type: 'table',
    critical: false, // Subscription checks can fail gracefully
    description: 'User subscription entitlements',
    fallbackMessage: 'Subscription status unavailable',
  },
  {
    name: 'payment_reports',
    type: 'table',
    critical: false, // Reports can show empty state
    description: 'Payment reports',
    fallbackMessage: 'Reports unavailable',
  },
];

export interface TableValidationResult {
  definition: TableDefinition;
  exists: boolean;
  error?: unknown;
  accessible: boolean; // Can we query it?
}

/**
 * Tests if a table/view exists and is accessible
 */
async function testTableExistence(table: TableDefinition): Promise<TableValidationResult> {
  if (!supabase) {
    return {
      definition: table,
      exists: false,
      accessible: false,
      error: { message: 'Supabase client not available' }
    };
  }

  try {
    // Try a simple query to see if the table/view exists and is accessible
    // We use LIMIT 0 to avoid loading data, just check existence
    // Use type assertion to bypass strict type checking for dynamic table names
    const { data, error } = await (supabase
      .from(table.name as 'public_leaderboard')
      .select('*')
      .limit(0) as unknown as Promise<{ data: unknown; error: { message?: string; code?: string } | null }>);

    if (error) {
      const errorMsg = error.message?.toLowerCase() || '';
      const errorCode = error.code || '';

      // Check if it's a "table doesn't exist" error
      const isTableMissing = 
        errorCode === '42P01' || // PostgreSQL: relation does not exist
        errorCode === 'PGRST204' || // PostgREST: relation not found
        errorMsg.includes('does not exist') ||
        (errorMsg.includes('relation') && errorMsg.includes('not found'));

      if (isTableMissing) {
        return {
          definition: table,
          exists: false,
          accessible: false,
          error
        };
      }

      // Other errors (RLS, permission, etc.) mean table exists but might not be accessible
      // We'll consider it "exists" if it's not a "doesn't exist" error
      const isRLSError = 
        errorCode === '42501' ||
        errorMsg.includes('row-level security') ||
        errorMsg.includes('permission denied');

      return {
        definition: table,
        exists: !isTableMissing,
        accessible: !isRLSError, // RLS blocking means table exists but not accessible
        error: isRLSError ? undefined : error // Don't treat RLS as error for existence check
      };
    }

    // Success - table exists and is accessible
    return {
      definition: table,
      exists: true,
      accessible: true
    };
  } catch (err) {
    // Network errors, etc.
    return {
      definition: table,
      exists: false,
      accessible: false,
      error: err
    };
  }
}

/**
 * Validates all required tables/views
 */
export async function validateTableExistence(): Promise<TableValidationResult[]> {
  const results: TableValidationResult[] = [];

  for (const table of REQUIRED_TABLES) {
    const result = await testTableExistence(table);
    results.push(result);
  }

  return results;
}

/**
 * Logs table validation results
 */
export function logTableValidationResults(results: TableValidationResult[]) {
  const missing = results.filter(r => !r.exists);
  const inaccessible = results.filter(r => r.exists && !r.accessible);
  const criticalMissing = missing.filter(r => r.definition.critical);

  if (missing.length === 0 && inaccessible.length === 0) {
    console.log('✅ [Table Validation] All required tables/views exist and are accessible');
    return;
  }

  console.group('⚠️ [Table Validation] Missing or Inaccessible Tables/Views');

  if (criticalMissing.length > 0) {
    console.error(`[CRITICAL] ${criticalMissing.length} critical table(s)/view(s) missing:`);
    criticalMissing.forEach(result => {
      console.error(`  - ${result.definition.name} (${result.definition.type}): ${result.definition.description}`);
      if (result.error && typeof result.error === 'object' && 'message' in result.error) {
        console.error(`    Error: ${(result.error as { message: string }).message}`);
      }
      trackFailure('other', 'TableValidation', `Critical table missing: ${result.definition.name}`, {
        table: result.definition.name,
        type: result.definition.type,
        error: result.error
      });
    });
  }

  if (missing.filter(r => !r.definition.critical).length > 0) {
    console.warn(`[WARNING] ${missing.filter(r => !r.definition.critical).length} non-critical table(s)/view(s) missing:`);
    missing.filter(r => !r.definition.critical).forEach(result => {
      console.warn(`  - ${result.definition.name} (${result.definition.type}): ${result.definition.description}`);
      if (result.definition.fallbackMessage) {
        console.warn(`    Fallback: ${result.definition.fallbackMessage}`);
      }
    });
  }

  if (inaccessible.length > 0) {
    console.warn(`[WARNING] ${inaccessible.length} table(s)/view(s) exist but are not accessible:`);
    inaccessible.forEach(result => {
      console.warn(`  - ${result.definition.name}: May be blocked by RLS or permissions`);
    });
  }

  console.warn('💡 [Table Validation] If tables are missing, ensure migrations have been run:');
  console.warn('   Run: supabase migration up (or equivalent for your deployment)');
  
  console.groupEnd();
}

/**
 * Gets a summary of table validation for UI display
 */
export function getTableValidationSummary(results: TableValidationResult[]): {
  allValid: boolean;
  criticalIssues: number;
  warnings: number;
  missingTables: string[];
  inaccessibleTables: string[];
} {
  const missing = results.filter(r => !r.exists);
  const inaccessible = results.filter(r => r.exists && !r.accessible);
  const criticalMissing = missing.filter(r => r.definition.critical);

  return {
    allValid: missing.length === 0 && inaccessible.length === 0,
    criticalIssues: criticalMissing.length,
    warnings: missing.filter(r => !r.definition.critical).length + inaccessible.length,
    missingTables: missing.map(r => r.definition.name),
    inaccessibleTables: inaccessible.map(r => r.definition.name),
  };
}

/**
 * Checks if a specific table exists (for runtime checks)
 */
export async function checkTableExists(tableName: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    // Use type assertion to bypass strict type checking for dynamic table names
    const { error } = await (supabase
      .from(tableName as 'public_leaderboard')
      .select('*')
      .limit(0) as unknown as Promise<{ data: unknown; error: { message?: string; code?: string } | null }>);

    if (!error) return true;

    const errorMsg = error.message?.toLowerCase() || '';
    const errorCode = error.code || '';

    // Check if it's a "table doesn't exist" error
    const isTableMissing = 
      errorCode === '42P01' ||
      errorCode === 'PGRST204' ||
      errorMsg.includes('does not exist') ||
      (errorMsg.includes('relation') && errorMsg.includes('not found'));

    return !isTableMissing;
  } catch {
    return false;
  }
}
