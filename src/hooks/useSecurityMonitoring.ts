// React hook for security monitoring and anomaly detection
import { useEffect, useCallback } from 'react';
import { SecurityMonitoring } from '@/lib/securityMonitoring';
import { EnhancedAuthSecurity } from '@/lib/enhancedAuth';
import { toast } from '@/hooks/use-toast';

interface SecurityStatus {
  hasAnomalies: boolean;
  securityScore: number;
  recommendations: string[];
}

export const useSecurityMonitoring = () => {
  // Monitor for session expiration
  useEffect(() => {
    const handleSessionExpired = () => {
      toast({
        title: "Session Expired",
        description: "Your session has expired due to inactivity. Please log in again.",
        variant: "destructive"
      });
    };

    window.addEventListener('sessionExpired', handleSessionExpired);
    return () => window.removeEventListener('sessionExpired', handleSessionExpired);
  }, []);

  // Monitor for suspicious activity
  const monitorInput = useCallback((value: string, fieldName: string) => {
    SecurityMonitoring.monitorSuspiciousInput(value, fieldName);
  }, []);

  const trackAuthEvent = useCallback((
    eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT',
    email?: string
  ) => {
    SecurityMonitoring.monitorAuthEvent(eventType, email);
  }, []);

  const trackDataAccess = useCallback((
    tableName: string,
    operation: string,
    recordId?: string
  ) => {
    SecurityMonitoring.monitorDataAccess(tableName, operation, recordId);
  }, []);

  const getSecurityStatus = useCallback((): SecurityStatus => {
    const { hasAnomalies, patterns } = SecurityMonitoring.checkAnomalies();
    const events = SecurityMonitoring.getLocalEvents();
    
    // Calculate security score (0-100)
    let score = 100;
    
    // Deduct points for anomalies
    if (hasAnomalies) {
      score -= patterns.length * 10;
    }
    
    // Deduct points for recent high/critical events
    const recentEvents = events.filter(event => {
      const eventTime = new Date(event.timestamp).getTime();
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      return eventTime > oneDayAgo;
    });
    
    const criticalEvents = recentEvents.filter(e => e.severity === 'CRITICAL').length;
    const highEvents = recentEvents.filter(e => e.severity === 'HIGH').length;
    
    score -= (criticalEvents * 20) + (highEvents * 10);
    score = Math.max(0, score);
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (hasAnomalies) {
      recommendations.push('Anomalous activity detected - review security logs');
    }
    
    if (criticalEvents > 0) {
      recommendations.push('Critical security events found - immediate attention required');
    }
    
    if (score < 80) {
      recommendations.push('Security score below threshold - consider additional precautions');
    }
    
    if (!EnhancedAuthSecurity.isSessionValid()) {
      recommendations.push('Session validation failed - please log in again');
    }
    
    return {
      hasAnomalies,
      securityScore: score,
      recommendations
    };
  }, []);

  const clearSecurityData = useCallback(() => {
    SecurityMonitoring.clearLocalEvents();
    EnhancedAuthSecurity.clearSession();
  }, []);

  return {
    monitorInput,
    trackAuthEvent,
    trackDataAccess,
    getSecurityStatus,
    clearSecurityData
  };
};