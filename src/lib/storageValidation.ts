/**
 * Storage Bucket Validation
 * 
 * Validates that required storage buckets exist and are accessible.
 * Prevents image/file loading failures that break page credibility.
 */

import { supabase } from "@/integrations/supabase/client";
import { trackFailure } from "./failureTracking";

export interface BucketDefinition {
  name: string;
  critical: boolean; // If false, app can continue with degraded functionality
  description: string;
  publicAccess: boolean; // Should be publicly accessible
  fallbackMessage?: string;
}

/**
 * Critical storage buckets that the app depends on
 */
export const REQUIRED_BUCKETS: BucketDefinition[] = [
  {
    name: 'fafo-results',
    critical: false, // Results page can show empty state
    description: 'FAFO entry images (Hold That L and proof images)',
    publicAccess: true,
    fallbackMessage: 'Results images unavailable',
  },
  {
    name: 'submission-documents',
    critical: false, // Submission can work without file uploads
    description: 'User-submitted payment documents',
    publicAccess: false, // Private bucket
    fallbackMessage: 'File uploads unavailable',
  },
];

export interface BucketValidationResult {
  definition: BucketDefinition;
  exists: boolean;
  accessible: boolean; // Can we access it?
  error?: unknown;
}

/**
 * Tests if a storage bucket exists and is accessible
 */
async function testBucketAccess(bucket: BucketDefinition): Promise<BucketValidationResult> {
  if (!supabase) {
    return {
      definition: bucket,
      exists: false,
      accessible: false,
      error: { message: 'Supabase client not available' }
    };
  }

  try {
    // Try to list files in the bucket (limit 1 to be efficient)
    // This will fail if bucket doesn't exist or we don't have access
    const { data, error } = await supabase.storage
      .from(bucket.name)
      .list('', {
        limit: 1,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      const errorMsg = error.message?.toLowerCase() || '';
      // StorageError doesn't have a 'code' property, use name or message instead
      const errorName = error.name || '';

      // Check if it's a "bucket doesn't exist" error
      const isBucketMissing = 
        errorName === 'StorageApiError' ||
        errorMsg.includes('not found') ||
        errorMsg.includes('does not exist') ||
        errorMsg.includes('no such bucket') ||
        errorMsg.includes('bucket not found');

      if (isBucketMissing) {
        return {
          definition: bucket,
          exists: false,
          accessible: false,
          error
        };
      }

      // Permission errors mean bucket exists but we can't access it
      const isPermissionError =
        errorMsg.includes('permission denied') ||
        errorMsg.includes('access denied') ||
        errorMsg.includes('not authorized');

      return {
        definition: bucket,
        exists: !isBucketMissing,
        accessible: !isPermissionError,
        error: isPermissionError ? undefined : error
      };
    }

    // Success - bucket exists and is accessible
    return {
      definition: bucket,
      exists: true,
      accessible: true
    };
  } catch (err) {
    // Network errors, etc.
    return {
      definition: bucket,
      exists: false,
      accessible: false,
      error: err
    };
  }
}

/**
 * Validates all required storage buckets
 */
export async function validateStorageBuckets(): Promise<BucketValidationResult[]> {
  const results: BucketValidationResult[] = [];

  for (const bucket of REQUIRED_BUCKETS) {
    const result = await testBucketAccess(bucket);
    results.push(result);
  }

  return results;
}

/**
 * Logs storage bucket validation results
 */
export function logStorageBucketValidationResults(results: BucketValidationResult[]) {
  const missing = results.filter(r => !r.exists);
  const inaccessible = results.filter(r => r.exists && !r.accessible);
  const criticalMissing = missing.filter(r => r.definition.critical);

  if (missing.length === 0 && inaccessible.length === 0) {
    console.log('✅ [Storage Validation] All required storage buckets exist and are accessible');
    return;
  }

  console.group('⚠️ [Storage Validation] Missing or Inaccessible Storage Buckets');

  if (criticalMissing.length > 0) {
    console.error(`[CRITICAL] ${criticalMissing.length} critical bucket(s) missing:`);
    criticalMissing.forEach(result => {
      console.error(`  - ${result.definition.name}: ${result.definition.description}`);
      if (result.error && typeof result.error === 'object' && 'message' in result.error) {
        console.error(`    Error: ${(result.error as { message: string }).message}`);
      }
      trackFailure('other', 'StorageValidation', `Critical bucket missing: ${result.definition.name}`, {
        bucket: result.definition.name,
        error: result.error
      });
    });
  }

  if (missing.filter(r => !r.definition.critical).length > 0) {
    console.warn(`[WARNING] ${missing.filter(r => !r.definition.critical).length} non-critical bucket(s) missing:`);
    missing.filter(r => !r.definition.critical).forEach(result => {
      console.warn(`  - ${result.definition.name}: ${result.definition.description}`);
      if (result.definition.fallbackMessage) {
        console.warn(`    Fallback: ${result.definition.fallbackMessage}`);
      }
    });
  }

  if (inaccessible.length > 0) {
    console.warn(`[WARNING] ${inaccessible.length} bucket(s) exist but are not accessible:`);
    inaccessible.forEach(result => {
      console.warn(`  - ${result.definition.name}: May be blocked by permissions or RLS`);
      console.warn(`    Expected public access: ${result.definition.publicAccess}`);
    });
  }

  console.warn('💡 [Storage Validation] If buckets are missing, check your Supabase storage configuration.');
  console.warn('   Ensure buckets exist and have correct RLS policies for public access.');
  
  console.groupEnd();
}

/**
 * Gets a summary of bucket validation for UI display
 */
export function getStorageBucketValidationSummary(results: BucketValidationResult[]): {
  allValid: boolean;
  criticalIssues: number;
  warnings: number;
  missingBuckets: string[];
  inaccessibleBuckets: string[];
} {
  const missing = results.filter(r => !r.exists);
  const inaccessible = results.filter(r => r.exists && !r.accessible);
  const criticalMissing = missing.filter(r => r.definition.critical);

  return {
    allValid: missing.length === 0 && inaccessible.length === 0,
    criticalIssues: criticalMissing.length,
    warnings: missing.filter(r => !r.definition.critical).length + inaccessible.length,
    missingBuckets: missing.map(r => r.definition.name),
    inaccessibleBuckets: inaccessible.map(r => r.definition.name),
  };
}

/**
 * Checks if a specific bucket exists (for runtime checks)
 */
export async function checkBucketExists(bucketName: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1 });

    if (!error) return true;

    const errorMsg = error.message?.toLowerCase() || '';
    const errorName = error.name || '';

    // Check if it's a "bucket doesn't exist" error
    const isBucketMissing = 
      errorName === 'StorageApiError' ||
      errorMsg.includes('not found') ||
      errorMsg.includes('does not exist') ||
      errorMsg.includes('no such bucket') ||
      errorMsg.includes('bucket not found');

    return !isBucketMissing;
  } catch {
    return false;
  }
}

/**
 * Gets a public URL for a file with validation and error handling
 */
export async function getStorageUrl(
  bucket: string,
  path: string,
  options?: {
    timeout?: number;
    retry?: boolean;
  }
): Promise<{ url: string | null; error?: unknown }> {
  if (!supabase) {
    return { url: null, error: { message: 'Supabase client not available' } };
  }

  try {
    // First, validate bucket exists
    const bucketExists = await checkBucketExists(bucket);
    if (!bucketExists) {
      return {
        url: null,
        error: { message: `Storage bucket '${bucket}' does not exist` }
      };
    }

    // Get public URL - getPublicUrl doesn't return an error, only data
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return { url: data.publicUrl, error: undefined };
  } catch (err) {
    return { url: null, error: err };
  }
}
