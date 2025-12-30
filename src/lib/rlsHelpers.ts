/**
 * Helper utilities for detecting and handling RLS (Row Level Security) errors
 */

/**
 * Checks if an error is related to RLS/permissions
 */
export function isRLSError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';
  
  // Common RLS error indicators
  const rlsIndicators = [
    'row-level security',
    'rls',
    'permission denied',
    'pgrst',
    '42501', // PostgreSQL permission denied error code
  ];
  
  return rlsIndicators.some(indicator => 
    message.includes(indicator) || code.includes(indicator)
  );
}

/**
 * Checks if an error indicates the query returned no rows (not a permission issue)
 */
export function isEmptyResultError(error: any): boolean {
  if (!error) return false;
  
  // Empty results aren't errors in Supabase - they just return empty array
  // But some edge cases might throw errors
  const message = error.message?.toLowerCase() || '';
  
  return message.includes('no rows') || message.includes('not found');
}

/**
 * Determines if a query result indicates RLS blocking vs genuine empty data
 * 
 * @param data - The data returned from query
 * @param error - The error returned from query
 * @param expectedPublicAccess - Whether this data should be publicly accessible
 * @returns Object indicating the state
 */
export function analyzeQueryResult<T>(params: {
  data: T[] | null;
  error: any;
  expectedPublicAccess?: boolean;
}): {
  isBlocked: boolean;
  isEmpty: boolean;
  errorMessage: string | null;
} {
  const { data, error, expectedPublicAccess = true } = params;
  
  // If there's an error and it's an RLS error, access is blocked
  if (error && isRLSError(error)) {
    return {
      isBlocked: true,
      isEmpty: false,
      errorMessage: 'Access to this data is restricted. Some features may require signing in.',
    };
  }
  
  // If there's any other error
  if (error) {
    return {
      isBlocked: false,
      isEmpty: false,
      errorMessage: 'Unable to load data. Please try again later.',
    };
  }
  
  // No error, check if data is empty
  const isEmpty = !data || data.length === 0;
  
  // If we expected public access but got empty with no error, might be RLS blocking silently
  // (Some RLS policies return empty arrays instead of errors)
  if (isEmpty && expectedPublicAccess) {
    // We can't definitively know if RLS is blocking or data is genuinely empty
    // This is a limitation - we'll assume it's genuinely empty unless we get an error
    return {
      isBlocked: false,
      isEmpty: true,
      errorMessage: null,
    };
  }
  
  return {
    isBlocked: false,
    isEmpty,
    errorMessage: null,
  };
}

