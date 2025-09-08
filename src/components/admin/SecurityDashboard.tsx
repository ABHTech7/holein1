// Enhanced security monitoring dashboard for administrators
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  Eye, 
  AlertTriangle, 
  Activity, 
  Users, 
  Database,
  Clock,
  MapPin
} from 'lucide-react';

interface AccessLogEntry {
  id: string;
  user_id: string | null;
  table_name: string;
  record_id: string | null;
  access_type: string;
  sensitive_fields: string[] | null;
  ip_address: string | null;
  created_at: string;
  user_agent: string | null;
}

interface SecurityLogEntry {
  id: string;
  event_type: string;
  user_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const SecurityDashboard: React.FC = () => {
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSecurityData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSecurityData, 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const loadSecurityData = async () => {
    try {
      setIsLoading(true);

      // Load access logs without user details (foreign key doesn't exist yet)
      const { data: accessData, error: accessError } = await supabase
        .from('data_access_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (accessError) throw accessError;

      // Load security logs without user details (foreign key doesn't exist yet)
      const { data: securityData, error: securityError } = await supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (securityError) throw securityError;

      // Type cast to handle unknown types
      setAccessLogs((accessData || []).map(log => ({
        ...log,
        ip_address: log.ip_address as string | null,
        sensitive_fields: log.sensitive_fields as string[] | null
      })));
      
      setSecurityLogs((securityData || []).map(log => ({
        ...log,
        ip_address: log.ip_address as string | null,
        user_agent: log.user_agent as string | null
      })));
    } catch (error: any) {
      console.error('Error loading security data:', error);
      toast.error('Failed to load security monitoring data');
    } finally {
      setIsLoading(false);
    }
  };

  const getAccessTypeColor = (accessType: string) => {
    switch (accessType) {
      case 'SELECT': return 'bg-blue-500';
      case 'ADMIN_SELECT': return 'bg-orange-500';
      case 'INSERT': return 'bg-green-500';
      case 'UPDATE': return 'bg-yellow-500';
      case 'DELETE': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'SUSPICIOUS_ACCESS_PATTERN': return 'bg-red-500';
      case 'FAILED_LOGIN': return 'bg-orange-500';
      case 'ROLE_CHANGE': return 'bg-purple-500';
      case 'ADMIN_ACTION': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getSecurityStats = () => {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentAccess = accessLogs.filter(log => new Date(log.created_at) > last24Hours);
    const recentSecurity = securityLogs.filter(log => new Date(log.created_at) > last24Hours);
    
    const sensitiveAccess = recentAccess.filter(log => 
      log.table_name === 'club_banking' || 
      log.sensitive_fields?.some(field => ['phone', 'bank_account_number', 'bank_iban'].includes(field))
    );

    return {
      totalAccess: recentAccess.length,
      sensitiveAccess: sensitiveAccess.length,
      securityEvents: recentSecurity.length,
      uniqueUsers: new Set(recentAccess.map(log => log.user_id)).size
    };
  };

  const stats = getSecurityStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-40 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Access (24h)</p>
                <p className="text-2xl font-bold">{stats.totalAccess}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Sensitive Access</p>
                <p className="text-2xl font-bold">{stats.sensitiveAccess}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Security Events</p>
                <p className="text-2xl font-bold">{stats.securityEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security Monitoring
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadSecurityData}>
              Refresh
            </Button>
          </div>
          <CardDescription>
            Real-time monitoring of data access and security events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="access" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="access" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Data Access
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Security Events
              </TabsTrigger>
            </TabsList>

            <TabsContent value="access" className="space-y-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {accessLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={`${getAccessTypeColor(log.access_type)} text-white`}>
                        {log.access_type}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">
                          User {log.user_id} accessed {log.table_name}
                        </p>
                        {log.sensitive_fields?.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Sensitive fields: {log.sensitive_fields.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{log.ip_address}</span>
                      <Clock className="h-3 w-3" />
                      <span>{formatTimeAgo(log.created_at)}</span>
                    </div>
                  </div>
                ))}
                {accessLogs.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No access logs available</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {securityLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={`${getEventTypeColor(log.event_type)} text-white`}>
                        {log.event_type.replace('_', ' ')}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">
                          User {log.user_id} - {log.event_type}
                        </p>
                        {log.details && (
                          <p className="text-xs text-muted-foreground">
                            {JSON.stringify(log.details)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{log.ip_address}</span>
                      <Clock className="h-3 w-3" />
                      <span>{formatTimeAgo(log.created_at)}</span>
                    </div>
                  </div>
                ))}
                {securityLogs.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No security events</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;