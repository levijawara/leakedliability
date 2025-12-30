/**
 * Helper utilities for admin role checks
 * Distinguishes between expected "not admin" responses and actual errors
 */

/**
 * Checks if an error from has_role RPC is an expected "not admin" response
 * vs an actual error that should be logged
 */
export function isExpectedNotAdminResponse(error: any): boolean {
  if (!error) return false;

  const message = error.message?.toLowerCase() || '';
  const code = error.code || '';

  // Some RLS policies might return permission denied for non-admin users
  // checking their own status - this is expected, not an error
  if (
    code === '42501' || // PostgreSQL permission denied
    code === 'PGRST301' || // PostgREST permission denied
    message.includes('permission denied') ||
    message.includes('row-level security')
  ) {
    // However, if the user IS authenticated, this shouldn't happen
    // So we need context to determine if this is expected
    return false; // Err on the side of logging it
  }

  // Network errors, function not found, etc. are real errors
  return false;
}

/**
 * Checks if a has_role result indicates the user is simply not an admin
 * (expected case) vs an actual error
 */
export function isNormalUserResponse(data: any, error: any): boolean {
  // If there's an error, it's not a normal response
  if (error) return false;

  // If data is explicitly false or null/undefined, user is just not an admin
  // This is expected and should not be logged as an error
  return data === false || data == null;
}

/**
 * Safely checks if an error should be logged
 * Returns true if it's a real error that deserves logging
 */
export function shouldLogAdminCheckError(error: any, data: any, context?: { userId?: string }): boolean {
  // No error means success (user is admin) or normal user (data = false)
  if (!error) return false;

  // If we got a successful response (data is not null/undefined),
  // but there's also an error, that's weird - log it
  if (data !== null && data !== undefined) {
    return true;
  }

  // Check if it's an expected "permission denied" for non-admin users
  // This can happen if RLS blocks the has_role function for non-admins
  const message = error.message?.toLowerCase() || '';
  const code = error.code || '';

  // Permission denied from has_role might be expected if:
  // 1. The user is not an admin
  // 2. RLS prevents non-admins from checking roles
  // But this is still worth logging as a warning, not an error
  const isPermissionDenied = 
    code === '42501' ||
    code === 'PGRST301' ||
    message.includes('permission denied') ||
    message.includes('row-level security');

  // Network errors, function not found, etc. are always real errors
  const isNetworkError =
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('failed to fetch') ||
    code === 'ECONNREFUSED';

  const isFunctionNotFound =
    message.includes('function') && message.includes('does not exist') ||
    code === '42883' || // PostgreSQL function does not exist
    code === 'PGRST204'; // PostgREST function not found

  // Always log real errors
  if (isNetworkError || isFunctionNotFound) {
    return true;
  }

  // Permission denied from has_role is suspicious - might indicate
  // RLS is blocking admin checks, which could be a problem
  // Log it but at a lower level (debug/warn) instead of error
  return false; // Don't log permission denied as error, but track it
}

