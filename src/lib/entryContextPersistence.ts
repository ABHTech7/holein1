/**
 * Enhanced Entry Context Persistence
 * Handles storing entry context with auto-restore functionality
 */

const PENDING_ENTRY_KEY = 'pending_entry_context';
const LAST_AUTH_EMAIL_KEY = 'last_auth_email';
const TTL_MINUTES = parseInt(import.meta.env.VITE_ENTRY_CONTEXT_TTL_MINUTES as string, 10) || 360; // Default 6 hours
const AUTH_EMAIL_TTL_MINUTES = parseInt(import.meta.env.VITE_AUTH_EMAIL_TTL_MINUTES as string, 10) || 360; // Default 6 hours

export interface PendingEntryContext {
  email: string;
  clubSlug: string;
  competitionSlug: string;
  startedAt: number;
  expiresAt: number;
  formData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    age?: number;
    gender?: string;
    handicap?: number;
  };
  termsAccepted?: boolean;
}

/**
 * Store entry context when user submits form before OTP
 */
export const storePendingEntryContext = (context: Omit<PendingEntryContext, 'startedAt' | 'expiresAt'>): void => {
  const now = Date.now();
  const fullContext: PendingEntryContext = {
    ...context,
    startedAt: now,
    expiresAt: now + (TTL_MINUTES * 60 * 1000)
  };
  
  localStorage.setItem(PENDING_ENTRY_KEY, JSON.stringify(fullContext));
  
  // Also store email for auth callbacks
  localStorage.setItem(LAST_AUTH_EMAIL_KEY, JSON.stringify({
    email: context.email,
    timestamp: now
  }));
  
  console.log('[EntryContext] Stored pending entry context:', {
    email: context.email,
    competition: `${context.clubSlug}/${context.competitionSlug}`,
    expires: new Date(fullContext.expiresAt).toISOString()
  });
};

/**
 * Get pending entry context if valid
 */
export const getPendingEntryContext = (): PendingEntryContext | null => {
  try {
    const stored = localStorage.getItem(PENDING_ENTRY_KEY);
    if (!stored) return null;
    
    const context: PendingEntryContext = JSON.parse(stored);
    
    // Validate context structure
    if (!context.email || !context.formData || typeof context.expiresAt !== 'number') {
      console.warn('[EntryContext] Invalid context structure, clearing');
      clearPendingEntryContext();
      return null;
    }
    
    // Check if expired
    if (Date.now() > context.expiresAt) {
      console.log('[EntryContext] Context expired, clearing');
      clearPendingEntryContext();
      return null;
    }
    
    return context;
  } catch (error) {
    console.error('[EntryContext] Error retrieving pending context:', error);
    clearPendingEntryContext();
    return null;
  }
};

/**
 * Clear entry context
 */
export const clearPendingEntryContext = (): void => {
  localStorage.removeItem(PENDING_ENTRY_KEY);
  console.log('[EntryContext] Cleared pending entry context');
};

/**
 * Get the last auth email with TTL check
 */
export const getLastAuthEmail = (): string | null => {
  try {
    const stored = localStorage.getItem(LAST_AUTH_EMAIL_KEY);
    if (!stored) return null;
    
    const { email, timestamp } = JSON.parse(stored);
    
    // Check if expired (6 hours by default)
    if (Date.now() - timestamp > AUTH_EMAIL_TTL_MINUTES * 60 * 1000) {
      localStorage.removeItem(LAST_AUTH_EMAIL_KEY);
      return null;
    }
    
    return email;
  } catch (error) {
    localStorage.removeItem(LAST_AUTH_EMAIL_KEY);
    return null;
  }
};

/**
 * Check if user should see "Check your email" screen on refresh
 */
export const shouldShowEmailCheckScreen = (): { show: boolean; email?: string; context?: PendingEntryContext } => {
  const context = getPendingEntryContext();
  const email = getLastAuthEmail();
  
  if (context && email) {
    return {
      show: true,
      email,
      context
    };
  }
  
  return { show: false };
};

/**
 * Clear all entry context - localStorage, cookies, sessionStorage
 * Use this when starting a new entry or navigating away to prevent context loops
 */
export const clearAllEntryContext = (): void => {
  // Clear localStorage
  localStorage.removeItem(PENDING_ENTRY_KEY);
  localStorage.removeItem(LAST_AUTH_EMAIL_KEY);
  
  // Clear oh1_entry_id cookie
  document.cookie = 'oh1_entry_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  
  // Clear any sessionStorage entry-related keys
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('entry') || key.includes('oh1')) {
      sessionStorage.removeItem(key);
    }
  });
  
  console.log('[EntryContext] Cleared all entry context (localStorage, cookies, sessionStorage)');
};