// Secure storage utility with automatic cleanup and encryption
import { htmlEncode } from './inputSanitization';

interface StoredData {
  value: any;
  expiry?: number;
  encrypted?: boolean;
  timestamp?: number;
  checksum?: string;
}

// Simple encryption/decryption for browser storage
class SimpleEncryption {
  private static readonly KEY_PREFIX = 'sk_';
  
  static encrypt(data: string, key?: string): string {
    try {
      const encKey = key || this.getSessionKey();
      const encoded = btoa(encodeURIComponent(data));
      const shifted = encoded.split('').map((char, i) => 
        String.fromCharCode(char.charCodeAt(0) + (i % 7) + 1)
      ).join('');
      return `${this.KEY_PREFIX}${btoa(shifted)}`;
    } catch {
      return data; // Fallback to unencrypted if encryption fails
    }
  }
  
  static decrypt(encryptedData: string): string {
    try {
      if (!encryptedData.startsWith(this.KEY_PREFIX)) {
        return encryptedData; // Not encrypted
      }
      
      const shifted = atob(encryptedData.substring(this.KEY_PREFIX.length));
      const decoded = shifted.split('').map((char, i) => 
        String.fromCharCode(char.charCodeAt(0) - (i % 7) - 1)
      ).join('');
      return decodeURIComponent(atob(decoded));
    } catch {
      return ''; // Return empty string if decryption fails
    }
  }
  
  private static getSessionKey(): string {
    const key = `session_${Date.now().toString(36)}`;
    return key.substring(0, 16);
  }
}

// Security event logger for monitoring
class SecurityMonitor {
  static logSecurityEvent(eventType: string, details: any) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      details: details,
      userAgent: navigator.userAgent.substring(0, 100),
      url: window.location.href
    };
    
    console.warn(`[Security] ${eventType}:`, event);
    
    // Store security events in a separate secure location
    try {
      const events = JSON.parse(localStorage.getItem('security_events') || '[]');
      events.push(event);
      
      // Keep only last 50 events to prevent storage bloat
      if (events.length > 50) {
        events.splice(0, events.length - 50);
      }
      
      localStorage.setItem('security_events', JSON.stringify(events));
    } catch (error) {
      console.warn('[Security] Failed to log security event:', error);
    }
  }
  
  static getSecurityEvents(): any[] {
    try {
      return JSON.parse(localStorage.getItem('security_events') || '[]');
    } catch {
      return [];
    }
  }
  
  static clearSecurityEvents() {
    localStorage.removeItem('security_events');
  }
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
   * Store data securely with optional expiration and encryption
   */
  static setItem(key: string, value: any, expirationMinutes?: number, encrypt: boolean = false): boolean {
    try {
      if (typeof window === 'undefined') return false;

      // Sanitize key to prevent XSS
      const sanitizedKey = htmlEncode(key);
      
      // Generate checksum for integrity verification
      const valueStr = JSON.stringify(value);
      const checksum = btoa(valueStr).substring(0, 8);
      
      const data: StoredData = {
        value: encrypt ? SimpleEncryption.encrypt(valueStr) : value,
        expiry: expirationMinutes ? Date.now() + (expirationMinutes * 60 * 1000) : undefined,
        encrypted: encrypt,
        timestamp: Date.now(),
        checksum: checksum
      };

      localStorage.setItem(this.PREFIX + sanitizedKey, JSON.stringify(data));
      
      // Log security event for sensitive data storage
      if (encrypt || sanitizedKey.includes('auth') || sanitizedKey.includes('token')) {
        SecurityMonitor.logSecurityEvent('SECURE_STORAGE_WRITE', {
          key: sanitizedKey,
          encrypted: encrypt,
          hasExpiry: !!expirationMinutes
        });
      }
      
      return true;
    } catch (error) {
      console.warn('SecureStorage.setItem failed:', error);
      SecurityMonitor.logSecurityEvent('STORAGE_ERROR', {
        operation: 'setItem',
        key: key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Retrieve data with automatic expiration check and decryption
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
        SecurityMonitor.logSecurityEvent('DATA_EXPIRED', {
          key: sanitizedKey,
          expiredAt: new Date(data.expiry).toISOString()
        });
        this.removeItem(key);
        return null;
      }

      let value = data.value;
      
      // Decrypt if necessary
      if (data.encrypted && typeof data.value === 'string') {
        const decrypted = SimpleEncryption.decrypt(data.value);
        try {
          value = JSON.parse(decrypted);
        } catch {
          // If JSON parsing fails, return as string
          value = decrypted;
        }
      }
      
      // Verify data integrity if checksum exists
      if (data.checksum) {
        const currentChecksum = btoa(JSON.stringify(value)).substring(0, 8);
        if (currentChecksum !== data.checksum) {
          SecurityMonitor.logSecurityEvent('DATA_INTEGRITY_VIOLATION', {
            key: sanitizedKey,
            expectedChecksum: data.checksum,
            actualChecksum: currentChecksum
          });
          this.removeItem(key);
          return null;
        }
      }

      return value;
    } catch (error) {
      console.warn('SecureStorage.getItem failed:', error);
      SecurityMonitor.logSecurityEvent('STORAGE_ERROR', {
        operation: 'getItem',
        key: key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
   * Store auth-related data with encryption and short expiration (30 minutes)
   */
  static setAuthData(key: string, value: any): boolean {
    return this.setItem(`auth_${key}`, value, 30, true); // Always encrypt auth data
  }
  
  /**
   * Store sensitive data with encryption
   */
  static setSensitiveData(key: string, value: any, expirationMinutes: number = 60): boolean {
    return this.setItem(`sensitive_${key}`, value, expirationMinutes, true);
  }
  
  /**
   * Get sensitive data with automatic decryption
   */
  static getSensitiveData<T = any>(key: string): T | null {
    return this.getItem<T>(`sensitive_${key}`);
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
      const clearedKeys: string[] = [];
      
      keys.forEach(key => {
        if (key.startsWith(this.PREFIX + 'auth_') || key.startsWith(this.PREFIX + 'sensitive_')) {
          localStorage.removeItem(key);
          clearedKeys.push(key);
        }
      });
      
      SecurityMonitor.logSecurityEvent('AUTH_DATA_CLEARED', {
        keysCleared: clearedKeys.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn('SecureStorage.clearAuthData failed:', error);
    }
  }
  
  /**
   * Emergency wipe - clears ALL storage including security events
   */
  static emergencyWipe(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      console.warn('[Security] Emergency storage wipe completed');
    } catch (error) {
      console.error('Emergency wipe failed:', error);
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