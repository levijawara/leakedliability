/**
 * Maps database errors to user-friendly messages while logging technical details
 * Prevents information leakage of schema, RLS policies, and internal structure
 */
export function mapDatabaseError(error: any): string {
  const message = error.message?.toLowerCase() || '';
  
  // Log full error for debugging (only in development/server-side)
  console.error('Database error:', error);
  
  // Map specific errors to safe messages
  if (message.includes('row-level security') || message.includes('rls')) {
    return 'You do not have permission to perform this action';
  }
  
  if (message.includes('foreign key') || message.includes('fkey')) {
    return 'This record cannot be modified due to related data';
  }
  
  if (message.includes('unique constraint') || message.includes('duplicate')) {
    return 'This entry already exists';
  }
  
  if (message.includes('not null') || message.includes('null value')) {
    return 'Required field is missing';
  }
  
  if (message.includes('check constraint')) {
    return 'Invalid value provided';
  }
  
  if (message.includes('invalid input syntax')) {
    return 'Invalid data format';
  }
  
  if (message.includes('permission denied')) {
    return 'You do not have permission to perform this action';
  }
  
  if (message.includes('does not exist')) {
    return 'The requested item was not found';
  }
  
  if (message.includes('admin notes must be')) {
    return 'Admin notes are too long (max 2000 characters)';
  }
  
  if (message.includes('maintenance message must be')) {
    return 'Maintenance message is too long (max 500 characters)';
  }
  
  if (message.includes('payment date cannot be in the future')) {
    return 'Payment date cannot be in the future';
  }
  
  if (message.includes('closed date cannot be in the future')) {
    return 'Closed date cannot be in the future';
  }
  
  // Generic fallback for unknown errors
  return 'An error occurred while processing your request. Please try again.';
}
