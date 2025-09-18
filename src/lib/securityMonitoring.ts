// Enhanced security monitoring and anomaly detection
import { supabase } from '@/integrations/supabase/client';

interface SecurityEvent {
  type: string;
  timestamp: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  details: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface AnomalyPattern {
  type: string;
  count: number;
  timeWindow: number;
  firstOccurrence: number;
}

export class SecurityMonitoring {
  private static readonly MAX_EVENTS = 100;
  private static readonly ANOMALY_THRESHOLDS = {
    FAILED_LOGINS: { count: 3, window: 5 * 60 * 1000 }, // 3 in 5 minutes
    RAPID_REQUESTS: { count: 20, window: 60 * 1000 }, // 20 in 1 minute
    SUSPICIOUS_PATTERNS: { count: 1, window: 0 } // Immediate
  };

  /**
   * Log a security event
   */
  static async logEvent(
    type: string,
    details: any,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
  ): Promise<void> {
    const event: SecurityEvent = {
      type,
      timestamp: new Date().toISOString(),
      userId: this.getCurrentUserId(),
      ip: await this.getClientIP(),
      userAgent: navigator.userAgent.substring(0, 200),
      details,
      severity
    };

    // Store locally first
    this.storeEventLocally(event);

    // Detect anomalies
    this.detectAnomalies(event);

    // Log to Supabase if possible
    try {
      await supabase.rpc('log_security_event', {
        event_type: type,
        details: {
          ...details,
          severity,
          client_timestamp: event.timestamp
        }
      });
    } catch (error) {
      console.warn('[Security] Failed to log to Supabase:', error);
    }

    // Handle critical events immediately
    if (severity === 'CRITICAL') {
      this.handleCriticalEvent(event);
    }
  }

  /**
   * Get security events from local storage
   */
  static getLocalEvents(): SecurityEvent[] {
    try {
      const events = localStorage.getItem('security_events_v2');
      return events ? JSON.parse(events) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear local security events
   */
  static clearLocalEvents(): void {
    localStorage.removeItem('security_events_v2');
    localStorage.removeItem('anomaly_patterns');
  }

  /**
   * Check for security anomalies
   */
  static checkAnomalies(): { hasAnomalies: boolean; patterns: AnomalyPattern[] } {
    try {
      const patterns = localStorage.getItem('anomaly_patterns');
      const anomalyPatterns: AnomalyPattern[] = patterns ? JSON.parse(patterns) : [];
      
      const now = Date.now();
      const activePatterns = anomalyPatterns.filter(pattern => {
        if (pattern.timeWindow === 0) return true; // Persistent patterns
        return (now - pattern.firstOccurrence) <= pattern.timeWindow;
      });

      return {
        hasAnomalies: activePatterns.length > 0,
        patterns: activePatterns
      };
    } catch {
      return { hasAnomalies: false, patterns: [] };
    }
  }

  /**
   * Monitor authentication events
   */
  static monitorAuthEvent(eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT', email?: string): void {
    const details = {
      email,
      timestamp: Date.now(),
      url: window.location.href
    };

    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    
    if (eventType === 'LOGIN_FAILURE') {
      severity = 'MEDIUM';
      this.trackFailedLogin(email || 'unknown');
    } else if (eventType === 'LOGIN_SUCCESS') {
      this.clearFailedLoginTracking(email || 'unknown');
    }

    this.logEvent(`AUTH_${eventType}`, details, severity);
  }

  /**
   * Monitor data access events
   */
  static monitorDataAccess(tableName: string, operation: string, recordId?: string): void {
    this.logEvent('DATA_ACCESS', {
      table: tableName,
      operation,
      recordId,
      timestamp: Date.now()
    }, 'LOW');
  }

  /**
   * Monitor suspicious input patterns
   */
  static monitorSuspiciousInput(input: string, fieldName: string): void {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /union.*select/i,
      /drop.*table/i,
      /'.*or.*1=1/i
    ];

    const foundPatterns = suspiciousPatterns.filter(pattern => pattern.test(input));
    
    if (foundPatterns.length > 0) {
      this.logEvent('SUSPICIOUS_INPUT', {
        field: fieldName,
        input: input.substring(0, 100), // Truncate for storage
        patterns: foundPatterns.map(p => p.toString()),
        timestamp: Date.now()
      }, 'HIGH');
    }
  }

  private static storeEventLocally(event: SecurityEvent): void {
    try {
      const events = this.getLocalEvents();
      events.push(event);
      
      // Keep only recent events
      if (events.length > this.MAX_EVENTS) {
        events.splice(0, events.length - this.MAX_EVENTS);
      }
      
      localStorage.setItem('security_events_v2', JSON.stringify(events));
    } catch (error) {
      console.warn('[Security] Failed to store event locally:', error);
    }
  }

  private static detectAnomalies(event: SecurityEvent): void {
    const now = Date.now();
    
    // Check for rapid failed login attempts
    if (event.type === 'AUTH_LOGIN_FAILURE') {
      this.checkPattern('FAILED_LOGINS', now);
    }
    
    // Check for rapid requests
    this.checkPattern('RAPID_REQUESTS', now);
  }

  private static checkPattern(patternType: string, timestamp: number): void {
    try {
      const patterns: AnomalyPattern[] = JSON.parse(
        localStorage.getItem('anomaly_patterns') || '[]'
      );
      
      const threshold = this.ANOMALY_THRESHOLDS[patternType as keyof typeof this.ANOMALY_THRESHOLDS];
      if (!threshold) return;

      let pattern = patterns.find(p => p.type === patternType);
      
      if (!pattern) {
        pattern = {
          type: patternType,
          count: 1,
          timeWindow: threshold.window,
          firstOccurrence: timestamp
        };
        patterns.push(pattern);
      } else {
        // Check if within time window
        if (threshold.window === 0 || (timestamp - pattern.firstOccurrence) <= threshold.window) {
          pattern.count++;
        } else {
          // Reset pattern
          pattern.count = 1;
          pattern.firstOccurrence = timestamp;
        }
      }
      
      // Check if threshold exceeded
      if (pattern.count >= threshold.count) {
        this.logEvent('ANOMALY_DETECTED', {
          pattern: patternType,
          count: pattern.count,
          timeWindow: threshold.window,
          threshold: threshold.count
        }, 'HIGH');
      }
      
      localStorage.setItem('anomaly_patterns', JSON.stringify(patterns));
    } catch (error) {
      console.warn('[Security] Pattern detection failed:', error);
    }
  }

  private static handleCriticalEvent(event: SecurityEvent): void {
    console.error('[CRITICAL SECURITY EVENT]', event);
    
    // Show user notification for critical events
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Security Alert', {
        body: `Critical security event detected: ${event.type}`,
        icon: '/favicon.ico'
      });
    }
  }

  private static trackFailedLogin(email: string): void {
    const key = `failed_login_${email}`;
    const attempts = JSON.parse(localStorage.getItem(key) || '[]');
    attempts.push(Date.now());
    
    // Keep only recent attempts (last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentAttempts = attempts.filter((time: number) => time > oneHourAgo);
    
    localStorage.setItem(key, JSON.stringify(recentAttempts));
  }

  private static clearFailedLoginTracking(email: string): void {
    localStorage.removeItem(`failed_login_${email}`);
  }

  private static getCurrentUserId(): string | undefined {
    try {
      // Try to get from Supabase auth
      return JSON.parse(localStorage.getItem('supabase.auth.token') || '{}')?.user?.id;
    } catch {
      return undefined;
    }
  }

  private static async getClientIP(): Promise<string | undefined> {
    try {
      // This is a simple fallback - in production you'd want a proper IP service
      return 'client-side-unknown';
    } catch {
      return undefined;
    }
  }
}

// Auto-monitor page load and navigation
if (typeof window !== 'undefined') {
  SecurityMonitoring.logEvent('PAGE_LOAD', {
    url: window.location.href,
    referrer: document.referrer
  }, 'LOW');
  
  // Monitor for suspicious console usage
  const originalConsole = console.log;
  console.log = (...args) => {
    const message = args.join(' ');
    if (message.includes('password') || message.includes('token') || message.includes('secret')) {
      SecurityMonitoring.logEvent('SUSPICIOUS_CONSOLE_USAGE', {
        message: message.substring(0, 100)
      }, 'MEDIUM');
    }
    originalConsole.apply(console, args);
  };
}
