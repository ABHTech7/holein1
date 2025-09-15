// Enhanced audit logging with security event tracking
import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  event_type: 'SUSPICIOUS_ACCESS_PATTERN' | 'RATE_LIMIT_EXCEEDED' | 'INVALID_TOKEN' | 'AUTHENTICATION_FAILURE';
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  details: Record<string, any>;
}

export class AuditLogger {
  /**
   * Log security events for monitoring
   */
  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_logs')
        .insert({
          event_type: event.event_type,
          user_id: event.user_id,
          ip_address: event.ip_address,
          user_agent: event.user_agent,
          details: event.details,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Security logging error:', error);
    }
  }

  /**
   * Log authentication attempts
   */
  static async logAuthAttempt(
    email: string, 
    success: boolean, 
    method: 'otp' | 'password' | 'magic_link',
    error?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: success ? 'AUTHENTICATION_FAILURE' : 'AUTHENTICATION_FAILURE', 
      details: {
        email,
        success,
        method,
        error,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Log data access for sensitive operations
   */
  static async logDataAccess(
    table: string,
    action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    recordId?: string,
    sensitiveFields?: string[]
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('data_access_log')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          table_name: table,
          record_id: recordId,
          access_type: action,
          sensitive_fields: sensitiveFields,
          ip_address: '0.0.0.0', // Will be populated by RLS trigger
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log data access:', error);
      }
    } catch (error) {
      console.error('Data access logging error:', error);
    }
  }

  /**
   * Log file access and downloads
   */
  static async logFileAccess(
    filePath: string,
    action: 'UPLOAD' | 'DOWNLOAD' | 'DELETE',
    fileSize?: number
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'SUSPICIOUS_ACCESS_PATTERN',
      details: {
        file_path: filePath,
        action,
        file_size: fileSize,
        timestamp: Date.now()
      }
    });
  }
}