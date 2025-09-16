import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface SecurityEvent {
  id: string;
  event_type: string;
  created_at: string;
  details: any;
  user_id?: string;
}

const SecurityMonitor = () => {
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState(false);

  useEffect(() => {
    const checkSecurityEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('security_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        setRecentEvents(data || []);
        
        // Check for suspicious patterns
        const recentFailures = data?.filter(event => 
          event.event_type.includes('FAILURE') && 
          new Date(event.created_at) > new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
        ) || [];
        
        setSuspiciousActivity(recentFailures.length > 5);
      } catch (error) {
        console.error('Error fetching security events:', error);
      }
    };

    checkSecurityEvents();
    const interval = setInterval(checkSecurityEvents, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  if (!recentEvents.length && !suspiciousActivity) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield className="h-4 w-4 text-green-600" />
        Security monitoring active
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {suspiciousActivity && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Suspicious activity detected. Multiple failed attempts in the last 30 minutes.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="text-xs text-muted-foreground">
        Recent security events: {recentEvents.length}
      </div>
    </div>
  );
};

export default SecurityMonitor;