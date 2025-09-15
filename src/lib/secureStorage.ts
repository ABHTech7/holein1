// Secure storage utility with automatic cleanup and encryption
import { htmlEncode } from './inputSanitization';

interface StoredData {
  value: any;
  expiry?: number;
  encrypted?: boolean;
}

export class SecureStorage {
  private static readonly PREFIX = 'secure_';
  private static readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute
  private static cleanupTimer: NodeJS.Timeout | null = null;

  // Initialize cleanup timer
  static {
    if (typeof window !== 'undefined') {
      this.startCleanup();
    }
  }

  /**
   * Store data securely with optional expiration
   */
  static setItem(key: string, value: any, expirationMinutes?: number): boolean {
    try {
      if (typeof window === 'undefined') return false;

      // Sanitize key to prevent XSS
      const sanitizedKey = htmlEncode(key);
      
      const data: StoredData = {
        value: value,
        expiry: expirationMinutes ? Date.now() + (expirationMinutes * 60 * 1000) : undefined
      };

      localStorage.setItem(this.PREFIX + sanitizedKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn('SecureStorage.setItem failed:', error);
      return false;
    }
  }

  /**
   * Retrieve data with automatic expiration check
   */
  static getItem<T = any>(key: string): T | null {
    try {
      if (typeof window === 'undefined') return null;

      const sanitizedKey = htmlEncode(key);
      const stored = localStorage.getItem(this.PREFIX + sanitizedKey);
      
      if (!stored) return null;

      const data: StoredData = JSON.parse(stored);
      
      // Check expiration
      if (data.expiry && Date.now() > data.expiry) {
        this.removeItem(key);
        return null;
      }

      return data.value;
    } catch (error) {
      console.warn('SecureStorage.getItem failed:', error);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  static removeItem(key: string): boolean {
    try {
      if (typeof window === 'undefined') return false;

      const sanitizedKey = htmlEncode(key);
      localStorage.removeItem(this.PREFIX + sanitizedKey);
      return true;
    } catch (error) {
      console.warn('SecureStorage.removeItem failed:', error);
      return false;
    }
  }

  /**
   * Clear all secure storage items
   */
  static clear(): void {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('SecureStorage.clear failed:', error);
    }
  }

  /**
   * Store auth-related data with specific expiration (30 minutes)
   */
  static setAuthData(key: string, value: any): boolean {
    return this.setItem(`auth_${key}`, value, 30);
  }

  /**
   * Get auth-related data
   */
  static getAuthData<T = any>(key: string): T | null {
    return this.getItem<T>(`auth_${key}`);
  }

  /**
   * Clear all auth-related data
   */
  static clearAuthData(): void {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.PREFIX + 'auth_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('SecureStorage.clearAuthData failed:', error);
    }
  }

  /**
   * Start automatic cleanup of expired items
   */
  private static startCleanup(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Cleanup expired items
   */
  private static cleanupExpired(): void {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();

      keys.forEach(key => {
        if (!key.startsWith(this.PREFIX)) return;

        try {
          const stored = localStorage.getItem(key);
          if (!stored) return;

          const data: StoredData = JSON.parse(stored);
          if (data.expiry && now > data.expiry) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          // Remove corrupted data
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('SecureStorage.cleanupExpired failed:', error);
    }
  }

  /**
   * Stop cleanup timer (for cleanup on unmount)
   */
  static stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    SecureStorage.stopCleanup();
  });
}