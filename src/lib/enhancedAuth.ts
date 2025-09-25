// Enhanced authentication security with session management and monitoring
import { SecureStorage } from './secureStorage';

interface SessionData {
  lastActivity: number;
  loginTime: number;
  sessionId: string;
  attempts: number;
}

export class EnhancedAuthSecurity {
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  
  /**
   * Track user session activity
   */
  static trackActivity(): void {
    const sessionData = this.getSessionData();
    if (sessionData) {
      sessionData.lastActivity = Date.now();
      SecureStorage.setAuthData('session', sessionData);
    }
  }
  
  /**
   * Check if session is valid and not expired
   */
  static isSessionValid(): boolean {
    const sessionData = this.getSessionData();
    if (!sessionData) return false;
    
    const now = Date.now();
    const timeSinceActivity = now - sessionData.lastActivity;
    
    if (timeSinceActivity > this.SESSION_TIMEOUT) {
      console.warn('[Security] Session expired due to inactivity');
      this.clearSession();
      return false;
    }
    
    return true;
  }
  
  /**
   * Initialize a new session
   */
  static initializeSession(): void {
    const sessionId = this.generateSessionId();
    const sessionData: SessionData = {
      lastActivity: Date.now(),
      loginTime: Date.now(),
      sessionId: sessionId,
      attempts: 0
    };
    
    SecureStorage.setAuthData('session', sessionData);
    
    // Start activity monitoring
    this.startActivityMonitoring();
  }
  
  /**
   * Clear current session
   */
  static clearSession(): void {
    SecureStorage.clearAuthData();
    this.stopActivityMonitoring();
  }
  
  /**
   * Track failed login attempts
   */
  static trackFailedAttempt(email: string): boolean {
    const attempts = this.getFailedAttempts(email);
    const newAttempts = attempts + 1;
    
    SecureStorage.setSensitiveData(`failed_attempts_${email}`, {
      count: newAttempts,
      lastAttempt: Date.now()
    }, 60); // Store for 1 hour
    
    if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      this.lockAccount(email);
      return true; // Account locked
    }
    
    return false; // Not locked yet
  }
  
  /**
   * Clear failed attempts on successful login
   */
  static clearFailedAttempts(email: string): void {
    SecureStorage.removeItem(`failed_attempts_${email}`);
    SecureStorage.removeItem(`account_locked_${email}`);
  }
  
  /**
   * Check if account is locked
   */
  static isAccountLocked(email: string): boolean {
    const lockData = SecureStorage.getSensitiveData(`account_locked_${email}`);
    if (!lockData) return false;
    
    const timeSinceLock = Date.now() - lockData.lockTime;
    if (timeSinceLock > this.LOCKOUT_DURATION) {
      // Lock expired, clear it
      SecureStorage.removeItem(`account_locked_${email}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Get remaining lockout time in minutes
   */
  static getRemainingLockoutTime(email: string): number {
    const lockData = SecureStorage.getSensitiveData(`account_locked_${email}`);
    if (!lockData) return 0;
    
    const elapsed = Date.now() - lockData.lockTime;
    const remaining = this.LOCKOUT_DURATION - elapsed;
    
    return Math.max(0, Math.ceil(remaining / 60000)); // Convert to minutes
  }
  
  private static getSessionData(): SessionData | null {
    return SecureStorage.getAuthData<SessionData>('session');
  }
  
  private static getFailedAttempts(email: string): number {
    const data = SecureStorage.getSensitiveData(`failed_attempts_${email}`);
    return data?.count || 0;
  }
  
  private static lockAccount(email: string): void {
    SecureStorage.setSensitiveData(`account_locked_${email}`, {
      lockTime: Date.now(),
      email: email
    }, Math.ceil(this.LOCKOUT_DURATION / 60000)); // Convert to minutes
    
    console.warn(`[Security] Account locked for ${email} due to too many failed attempts`);
  }
  
  private static generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
  
  private static activityTimer: NodeJS.Timeout | null = null;
  
  private static startActivityMonitoring(): void {
    if (this.activityTimer) return;
    
    // Check session validity every minute
    this.activityTimer = setInterval(() => {
      if (!this.isSessionValid()) {
        window.dispatchEvent(new CustomEvent('sessionExpired'));
      }
    }, 60 * 1000);
  }
  
  private static stopActivityMonitoring(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
  }
}

// Track user activity automatically with throttling
if (typeof window !== 'undefined') {
  let lastActivityUpdate = 0;
  const ACTIVITY_THROTTLE = 30000; // Only update every 30 seconds
  
  const throttledTrackActivity = () => {
    const now = Date.now();
    if (now - lastActivityUpdate > ACTIVITY_THROTTLE) {
      lastActivityUpdate = now;
      EnhancedAuthSecurity.trackActivity();
    }
  };
  
  // Track mouse and keyboard activity (throttled)
  ['mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, throttledTrackActivity, { passive: true });
  });
  
  // Handle session expiration
  window.addEventListener('sessionExpired', () => {
    console.warn('[Security] Session expired - user will be logged out');
    // The auth hook will handle the actual logout
  });
}