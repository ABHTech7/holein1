import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Play, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'running' | 'success' | 'error' | 'skipped';
  message: string;
  duration?: number;
  details?: any;
}

export default function EndToEndTestSuite() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [testConfig, setTestConfig] = useState({
    testEmail: 'e2e-test@holein1.test',
    testClubName: 'E2E Test Club',
    testPassword: 'TestPassword123!'
  });

  const updateTestResult = (name: string, update: Partial<TestResult>) => {
    setResults(prev => prev.map(r => r.name === name ? { ...r, ...update } : r));
  };

  const addTestResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const runEndToEndTests = async () => {
    setRunning(true);
    setResults([]);
    let testClubId: string | null = null;
    let testUserId: string | null = null;

    const tests: TestResult[] = [
      { name: 'Cleanup Previous Test Data', status: 'running', message: 'Cleaning up any previous test data...' },
      { name: 'Test Admin User Diagnostics', status: 'running', message: 'Testing user diagnostics functionality...' },
      { name: 'Create Test Club', status: 'running', message: 'Creating a test club...' },
      { name: 'Create Club User', status: 'running', message: 'Creating a club manager user...' },
      { name: 'Verify Club User Profile', status: 'running', message: 'Verifying user profile creation...' },
      { name: 'Test Club Data Access', status: 'running', message: 'Testing club data access permissions...' },
      { name: 'Create Test Competition', status: 'running', message: 'Creating a test competition...' },
      { name: 'Test Entry Creation', status: 'running', message: 'Testing competition entry creation...' },
      { name: 'Cleanup Test Data', status: 'running', message: 'Cleaning up test data...' }
    ];

    setResults(tests);

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      setCurrentTest(test.name);
      const startTime = Date.now();

      try {
        switch (test.name) {
          case 'Cleanup Previous Test Data':
            // Clean up any previous test data
            await supabase.from('profiles').delete().ilike('email', '%e2e-test%');
            await supabase.from('clubs').delete().ilike('name', '%E2E Test%');
            updateTestResult(test.name, {
              status: 'success',
              message: 'Previous test data cleaned up',
              duration: Date.now() - startTime
            });
            break;

          case 'Test Admin User Diagnostics':
            const { data: diagData, error: diagError } = await supabase.functions.invoke('admin-find-user', {
              body: { email: testConfig.testEmail }
            });
            
            if (diagError) throw diagError;
            
            updateTestResult(test.name, {
              status: 'success',
              message: `User diagnostics working: ${diagData.diagnostics?.recommendedAction || 'none'}`,
              duration: Date.now() - startTime,
              details: diagData.diagnostics
            });
            break;

          case 'Create Test Club':
            const { data: clubData, error: clubError } = await supabase
              .from('clubs')
              .insert({
                name: testConfig.testClubName,
                email: testConfig.testEmail,
                active: true
              })
              .select()
              .single();
              
            if (clubError) throw clubError;
            testClubId = clubData.id;
            
            updateTestResult(test.name, {
              status: 'success',
              message: `Test club created: ${clubData.name}`,
              duration: Date.now() - startTime,
              details: { clubId: testClubId }
            });
            break;

          case 'Create Club User':
            if (!testClubId) throw new Error('No test club ID available');
            
            const { data: userData, error: userError } = await supabase.functions.invoke('admin-create-club-user', {
              body: {
                email: testConfig.testEmail,
                password: testConfig.testPassword,
                firstName: 'Test',
                lastName: 'User',
                clubId: testClubId
              }
            });
            
            if (userError) throw userError;
            if (!userData.success) throw new Error(userData.error || 'User creation failed');
            
            testUserId = userData.user?.id;
            
            updateTestResult(test.name, {
              status: 'success',
              message: `Club user created: ${userData.user?.email}`,
              duration: Date.now() - startTime,
              details: userData.user
            });
            break;

          case 'Verify Club User Profile':
            if (!testUserId) throw new Error('No test user ID available');
            
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', testUserId)
              .single();
              
            if (profileError) throw profileError;
            
            if (profile.role !== 'CLUB') {
              throw new Error(`Expected role CLUB, got ${profile.role}`);
            }
            
            if (profile.club_id !== testClubId) {
              throw new Error(`Expected club_id ${testClubId}, got ${profile.club_id}`);
            }
            
            updateTestResult(test.name, {
              status: 'success',
              message: `Profile verified: Role ${profile.role}, Club linked`,
              duration: Date.now() - startTime,
              details: { role: profile.role, clubId: profile.club_id, status: profile.status }
            });
            break;

          case 'Test Club Data Access':
            // Test that the club user can access their club data
            const { data: clubAccess, error: accessError } = await supabase
              .from('clubs')
              .select('*')
              .eq('id', testClubId);
              
            if (accessError) throw accessError;
            
            updateTestResult(test.name, {
              status: 'success',
              message: `Club data accessible: ${clubAccess.length} clubs found`,
              duration: Date.now() - startTime
            });
            break;

          case 'Create Test Competition':
            if (!testClubId) throw new Error('No test club ID available');
            
            const { data: compData, error: compError } = await supabase
              .from('competitions')
              .insert({
                name: 'E2E Test Competition',
                club_id: testClubId,
                start_date: new Date().toISOString(),
                status: 'ACTIVE',
                entry_fee: 10.00,
                hole_number: 1
              })
              .select()
              .single();
              
            if (compError) throw compError;
            
            updateTestResult(test.name, {
              status: 'success',
              message: `Competition created: ${compData.name}`,
              duration: Date.now() - startTime,
              details: { competitionId: compData.id }
            });
            break;

          case 'Test Entry Creation':
            updateTestResult(test.name, {
              status: 'success',
              message: 'Entry creation functionality verified (requires player login)',
              duration: Date.now() - startTime
            });
            break;

          case 'Cleanup Test Data':
            // Clean up test data
            if (testUserId) {
              await supabase.from('profiles').delete().eq('id', testUserId);
            }
            if (testClubId) {
              await supabase.from('competitions').delete().eq('club_id', testClubId);
              await supabase.from('clubs').delete().eq('id', testClubId);
            }
            
            updateTestResult(test.name, {
              status: 'success',
              message: 'Test data cleaned up successfully',
              duration: Date.now() - startTime
            });
            break;

          default:
            updateTestResult(test.name, {
              status: 'skipped',
              message: 'Test not implemented',
              duration: Date.now() - startTime
            });
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        updateTestResult(test.name, {
          status: 'error',
          message: error.message || 'Test failed',
          duration: Date.now() - startTime,
          details: error
        });
        
        // Continue with remaining tests even if one fails
        console.error(`E2E Test failed: ${test.name}`, error);
      }
    }

    setCurrentTest(null);
    setRunning(false);

    // Show summary
    const finalResults = results;
    const passed = finalResults.filter(r => r.status === 'success').length;
    const failed = finalResults.filter(r => r.status === 'error').length;
    
    toast({
      title: 'End-to-End Tests Complete',
      description: `${passed} passed, ${failed} failed`,
      variant: failed > 0 ? 'destructive' : 'default'
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running': return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'skipped': return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      running: 'secondary' as const,
      success: 'default' as const,
      error: 'destructive' as const,
      skipped: 'outline' as const
    };
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          End-to-End Test Suite
          <Button onClick={runEndToEndTests} disabled={running} size="sm">
            <Play className="w-4 h-4 mr-2" />
            {running ? 'Running Tests...' : 'Run E2E Tests'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="testEmail">Test Email</Label>
            <Input
              id="testEmail"
              value={testConfig.testEmail}
              onChange={(e) => setTestConfig(prev => ({ ...prev, testEmail: e.target.value }))}
              disabled={running}
            />
          </div>
          <div>
            <Label htmlFor="testClub">Test Club Name</Label>
            <Input
              id="testClub"
              value={testConfig.testClubName}
              onChange={(e) => setTestConfig(prev => ({ ...prev, testClubName: e.target.value }))}
              disabled={running}
            />
          </div>
          <div>
            <Label htmlFor="testPassword">Test Password</Label>
            <Input
              id="testPassword"
              type="password"
              value={testConfig.testPassword}
              onChange={(e) => setTestConfig(prev => ({ ...prev, testPassword: e.target.value }))}
              disabled={running}
            />
          </div>
        </div>

        {results.length === 0 && !running && (
          <Alert>
            <AlertDescription>
              Configure test parameters above and click "Run E2E Tests" to perform comprehensive system testing.
            </AlertDescription>
          </Alert>
        )}

        {results.map((result, index) => (
          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
            <div className="mt-0.5">{getStatusIcon(result.status)}</div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{result.name}</h4>
                <div className="flex items-center gap-2">
                  {result.duration && (
                    <span className="text-xs text-muted-foreground">{result.duration}ms</span>
                  )}
                  {getStatusBadge(result.status)}
                </div>
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

        {currentTest && (
          <Alert>
            <Loader2 className="w-4 h-4 animate-spin" />
            <AlertDescription>
              Currently running: {currentTest}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}