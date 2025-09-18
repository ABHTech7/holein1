/**
 * Cooldown Persistence Utility
 * Manages cooldown timestamps that persist across browser refreshes
 */

const COOLDOWN_PREFIX = 'resend_cooldown_';
const DEFAULT_COOLDOWN_SECONDS = parseInt(import.meta.env.VITE_RESEND_COOLDOWN_SECONDS as string, 10) || 60;

export interface CooldownState {
  isActive: boolean;
  remainingSeconds: number;
  endsAt: number | null;
}

/**
 * Start a cooldown period for a specific key
 */
export const startCooldown = (key: string, seconds: number = DEFAULT_COOLDOWN_SECONDS): void => {
  const endsAt = Date.now() + (seconds * 1000);
  localStorage.setItem(`${COOLDOWN_PREFIX}${key}`, endsAt.toString());
  
  console.log(`[Cooldown] Started ${seconds}s cooldown for ${key}, ends at ${new Date(endsAt).toISOString()}`);
};

/**
 * Get current cooldown state for a key
 */
export const getCooldownState = (key: string): CooldownState => {
  const stored = localStorage.getItem(`${COOLDOWN_PREFIX}${key}`);
  
  if (!stored) {
    return { isActive: false, remainingSeconds: 0, endsAt: null };
  }
  
  const endsAt = parseInt(stored, 10);
  const now = Date.now();
  
  if (now >= endsAt) {
    // Cooldown expired, clean up
    localStorage.removeItem(`${COOLDOWN_PREFIX}${key}`);
    return { isActive: false, remainingSeconds: 0, endsAt: null };
  }
  
  const remainingSeconds = Math.ceil((endsAt - now) / 1000);
  
  return {
    isActive: true,
    remainingSeconds,
    endsAt
  };
};

/**
 * Clear cooldown for a specific key
 */
export const clearCooldown = (key: string): void => {
  localStorage.removeItem(`${COOLDOWN_PREFIX}${key}`);
  console.log(`[Cooldown] Cleared cooldown for ${key}`);
};

/**
 * Check if cooldown is active for a key
 */
export const isCooldownActive = (key: string): boolean => {
  return getCooldownState(key).isActive;
};

/**
 * Get remaining seconds for a cooldown
 */
export const getRemainingSeconds = (key: string): number => {
  return getCooldownState(key).remainingSeconds;
};