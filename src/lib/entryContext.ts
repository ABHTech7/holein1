/**
 * Entry Context Persistence Service
 * Handles storing and retrieving competition entry context across auth flows
 */

import { SecureStorage } from '@/lib/secureStorage';
import { showSupabaseError } from '@/lib/showSupabaseError';

export interface EntryContext {
  competitionId: string;
  clubSlug?: string;
  competitionSlug?: string;
  entryId?: string;
  formData?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    age: number | null;
    gender: string;
    handicap: number | null;
  };
  termsAccepted?: boolean;
  timestamp: number;
  expiresAt: number;
}

export interface EntryStep {
  step: 'form' | 'otp' | 'verification' | 'payment' | 'complete';
  data?: any;
}

const ENTRY_CONTEXT_KEY = 'pending_entry_context';
const ENTRY_STEP_KEY = 'current_entry_step';
const CONTEXT_EXPIRY_MINUTES = 30;

/**
 * Store entry context with automatic expiry
 */
export const storeEntryContext = (context: Omit<EntryContext, 'timestamp' | 'expiresAt'>): boolean => {
  try {
    const now = Date.now();
    const fullContext: EntryContext = {
      ...context,
      timestamp: now,
      expiresAt: now + (CONTEXT_EXPIRY_MINUTES * 60 * 1000)
    };
    
    const success = SecureStorage.setItem(ENTRY_CONTEXT_KEY, fullContext, CONTEXT_EXPIRY_MINUTES);
    
    if (success) {
      console.info('[EntryContext] Stored context for competition:', context.competitionId);
    } else {
      console.warn('[EntryContext] Failed to store context, using fallback');
      // Fallback to regular localStorage
      localStorage.setItem(ENTRY_CONTEXT_KEY, JSON.stringify(fullContext));
    }
    
    return success;
  } catch (error) {
    console.error('[EntryContext] Error storing context:', error);
    return false;
  }
};

/**
 * Retrieve entry context if not expired
 */
export const getEntryContext = (): EntryContext | null => {
  try {
    let context: EntryContext | null = SecureStorage.getItem(ENTRY_CONTEXT_KEY);
    
    // Fallback to regular localStorage if secure storage fails
    if (!context) {
      const fallbackData = localStorage.getItem(ENTRY_CONTEXT_KEY);
      if (fallbackData) {
        context = JSON.parse(fallbackData) as EntryContext;
      }
    }
    
    if (!context) {
      console.info('[EntryContext] No stored context found');
      return null;
    }
    
    // Check expiry
    const now = Date.now();
    if (now > context.expiresAt) {
      console.info('[EntryContext] Context expired, cleaning up');
      clearEntryContext();
      return null;
    }
    
    console.info('[EntryContext] Retrieved valid context for competition:', context.competitionId);
    return context;
  } catch (error) {
    console.error('[EntryContext] Error retrieving context:', error);
    return null;
  }
};

/**
 * Clear stored entry context
 */
export const clearEntryContext = (): void => {
  try {
    SecureStorage.removeItem(ENTRY_CONTEXT_KEY);
    localStorage.removeItem(ENTRY_CONTEXT_KEY); // Clean up fallback too
    console.info('[EntryContext] Context cleared');
  } catch (error) {
    console.error('[EntryContext] Error clearing context:', error);
  }
};

/**
 * Store current entry step
 */
export const storeEntryStep = (step: EntryStep): boolean => {
  try {
    const success = SecureStorage.setItem(ENTRY_STEP_KEY, step, CONTEXT_EXPIRY_MINUTES);
    
    if (!success) {
      localStorage.setItem(ENTRY_STEP_KEY, JSON.stringify(step));
    }
    
    console.info('[EntryContext] Stored entry step:', step.step);
    return true;
  } catch (error) {
    console.error('[EntryContext] Error storing step:', error);
    return false;
  }
};

/**
 * Get current entry step
 */
export const getEntryStep = (): EntryStep | null => {
  try {
    let step: EntryStep | null = SecureStorage.getItem(ENTRY_STEP_KEY);
    
    if (!step) {
      const fallbackData = localStorage.getItem(ENTRY_STEP_KEY);
      if (fallbackData) {
        step = JSON.parse(fallbackData) as EntryStep;
      }
    }
    
    return step;
  } catch (error) {
    console.error('[EntryContext] Error retrieving step:', error);
    return null;
  }
};

/**
 * Clear entry step
 */
export const clearEntryStep = (): void => {
  try {
    SecureStorage.removeItem(ENTRY_STEP_KEY);
    localStorage.removeItem(ENTRY_STEP_KEY);
    console.info('[EntryContext] Entry step cleared');
  } catch (error) {
    console.error('[EntryContext] Error clearing step:', error);
  }
};

/**
 * Generate entry continuation URL from context
 */
export const getEntryContinuationUrl = (context: EntryContext): string => {
  if (context.entryId) {
    // If we have an entry ID, go to success page
    return `/entry-success/${context.entryId}`;
  }
  
  if (context.clubSlug && context.competitionSlug) {
    // Return to specific competition entry page
    return `/competition/${context.clubSlug}/${context.competitionSlug}`;
  }
  
  // Fallback to home
  return '/';
};

/**
 * Check if entry context is valid and not expired
 */
export const isEntryContextValid = (context: EntryContext | null): boolean => {
  if (!context) return false;
  
  const now = Date.now();
  return now <= context.expiresAt && 
         context.competitionId && 
         context.competitionId.trim() !== '';
};

/**
 * Update context with entry ID after successful creation
 */
export const updateContextWithEntryId = (entryId: string): boolean => {
  try {
    const context = getEntryContext();
    if (!context) {
      console.warn('[EntryContext] No context found to update with entry ID');
      return false;
    }
    
    const updatedContext = {
      ...context,
      entryId,
      timestamp: Date.now() // Update timestamp
    };
    
    return storeEntryContext(updatedContext);
  } catch (error) {
    console.error('[EntryContext] Error updating context with entry ID:', error);
    return false;
  }
};

/**
 * Clean up expired contexts (called on page load)
 */
export const cleanupExpiredContexts = (): void => {
  try {
    const context = getEntryContext();
    if (!context || !isEntryContextValid(context)) {
      clearEntryContext();
      clearEntryStep();
    }
  } catch (error) {
    console.error('[EntryContext] Error during cleanup:', error);
  }
};