/**
 * Logs and returns a readable error message from Supabase errors
 * @param error - The error object from Supabase
 * @param context - Optional context for logging
 * @returns A user-friendly error message
 */
export function showSupabaseError(error: any, context?: string): string {
  // Log the full error for debugging
  console.error(`[Supabase${context ? ` ${context}` : ''}] Error:`, error);

  // Handle different error formats
  if (error?.message) {
    // Standard Supabase error format
    const parts = [];
    
    if (error.message) parts.push(error.message);
    if (error.details) parts.push(`Details: ${error.details}`);
    if (error.hint) parts.push(`Hint: ${error.hint}`);
    if (error.code) parts.push(`Code: ${error.code}`);
    
    return parts.length > 1 ? parts.join('. ') : error.message;
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Handle errors with toString method
  if (error?.toString && typeof error.toString === 'function') {
    return error.toString();
  }
  
  // Fallback for unknown error formats
  return 'An unexpected error occurred';
}