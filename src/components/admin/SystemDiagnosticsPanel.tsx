import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export default function SystemDiagnosticsPanel() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    setResults([]);
    
    const diagnostics: DiagnosticResult[] = [];

    // Test 1: Database Connection
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      diagnostics.push({
        name: 'Database Connection',
        status: error ? 'error' : 'success',
        message: error ? `Database error: ${error.message}` : 'Database connection successful'
      });
    } catch (e) {
      diagnostics.push({
        name: 'Database Connection',
        status: 'error',
        message: `Connection failed: ${e}`
      });
    }

    // Test 2: Authentication Status
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      diagnostics.push({
        name: 'Authentication Status',
        status: error || !user ? 'error' : 'success',
        message: error ? `Auth error: ${error.message}` : `Authenticated as ${user?.email}`,
        details: user ? { id: user.id, email: user.email } : null
      });
    } catch (e) {
      diagnostics.push({
        name: 'Authentication Status',
        status: 'error',
        message: `Auth check failed: ${e}`
      });
    }

    // Test 3: User Profile
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();
        
      diagnostics.push({
        name: 'User Profile',
        status: error ? 'error' : 'success',
        message: error ? `Profile error: ${error.message}` : `Profile found - Role: ${profile?.role}`,
        details: profile ? { role: profile.role, status: profile.status } : null
      });
    } catch (e) {
      diagnostics.push({
        name: 'User Profile',
        status: 'error',
        message: `Profile check failed: ${e}`
      });
    }

    // Test 4: Admin Find User Function
    try {
      const testEmail = 'test@example.com';
      const { data, error } = await supabase.functions.invoke('admin-find-user', {
        body: { email: testEmail }
      });
      
      diagnostics.push({
        name: 'Admin Find User Function',
        status: error ? 'error' : 'success',
        message: error ? `Function error: ${error.message}` : 'Function responding correctly',
        details: data
      });
    } catch (e) {
      diagnostics.push({
        name: 'Admin Find User Function',
        status: 'error',
        message: `Function call failed: ${e}`
      });
    }

    // Test 5: Club Data Access
    try {
      const { data: clubs, error } = await supabase
        .from('clubs')
        .select('id, name, active')
        .limit(5);
        
      diagnostics.push({
        name: 'Club Data Access',
        status: error ? 'error' : 'success',
        message: error ? `Clubs error: ${error.message}` : `Found ${clubs?.length || 0} clubs`,
        details: clubs?.map(c => ({ id: c.id, name: c.name, active: c.active }))
      });
    } catch (e) {
      diagnostics.push({
        name: 'Club Data Access',
        status: 'error',
        message: `Clubs check failed: ${e}`
      });
    }

    // Test 6: Competition Data Access
    try {
      const { data: competitions, error } = await supabase
        .from('competitions')
        .select('id, name, status')
        .limit(5);
        
      diagnostics.push({
        name: 'Competition Data Access',
        status: error ? 'error' : 'success',
        message: error ? `Competitions error: ${error.message}` : `Found ${competitions?.length || 0} competitions`,
        details: competitions?.map(c => ({ id: c.id, name: c.name, status: c.status }))
      });
    } catch (e) {
      diagnostics.push({
        name: 'Competition Data Access',
        status: 'error',
        message: `Competitions check failed: ${e}`
      });
    }

    setResults(diagnostics);
    setLoading(false);

    // Show summary toast
    const errors = diagnostics.filter(d => d.status === 'error').length;
    const warnings = diagnostics.filter(d => d.status === 'warning').length;
    
    if (errors === 0 && warnings === 0) {
      toast({ title: 'All Systems Operational', description: 'All diagnostic checks passed' });
    } else {
      toast({ 
        title: 'System Issues Detected', 
        description: `${errors} errors, ${warnings} warnings found`,
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variants = {
      success: 'default' as const,
      error: 'destructive' as const,
      warning: 'secondary' as const
    };
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          System Diagnostics
          <Button onClick={runDiagnostics} disabled={loading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Running...' : 'Run Diagnostics'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {results.length === 0 && !loading && (
          <Alert>
            <AlertDescription>
              Click "Run Diagnostics" to test system functionality and identify any issues.
            </AlertDescription>
          </Alert>
        )}

        {results.map((result, index) => (
          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
            <div className="mt-0.5">{getStatusIcon(result.status)}</div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{result.name}</h4>
                {getStatusBadge(result.status)}
              </div>
              <p className="text-sm text-muted-foreground">{result.message}</p>
              {result.details && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    View Details
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}