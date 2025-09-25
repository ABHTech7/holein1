import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import { runSessionDiagnostics, forceSessionRefresh, SessionDiagnostics } from '@/lib/authDiagnostics';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';

export const SessionDiagnosticsPanel: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<SessionDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const { clubId } = useParams<{ clubId: string }>();

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const results = await runSessionDiagnostics();
      setDiagnostics(results);
      
      if (results.jwtIssue) {
        toast({
          title: "Authentication Issue Detected",
          description: results.jwtIssue,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Authentication OK",
          description: "All authentication checks passed",
        });
      }
    } catch (error) {
      toast({
        title: "Diagnostics Failed",
        description: "Unable to run session diagnostics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    setLoading(true);
    try {
      const success = await forceSessionRefresh();
      if (success) {
        toast({
          title: "Session Refreshed",
          description: "Authentication session has been refreshed",
        });
        // Re-run diagnostics after refresh
        await runDiagnostics();
      } else {
        toast({
          title: "Refresh Failed",
          description: "Unable to refresh session. Please sign out and sign back in.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Refresh Error",
        description: "An error occurred while refreshing the session",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyLogo = async () => {
    if (!clubId) {
      toast({
        title: "Error",
        description: "No club ID available",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get current club data
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('logo_url')
        .eq('id', clubId)
        .single();

      if (clubError) {
        toast({
          title: "Database Error",
          description: `Error fetching club data: ${clubError.message}`,
          variant: "destructive"
        });
        return;
      }

      if (!clubData?.logo_url) {
        toast({
          title: "No Logo",
          description: "No logo URL set for this club",
        });
        return;
      }

      // Check if the file exists in storage
      const fileName = clubData.logo_url.split('/').pop();
      if (!fileName) {
        toast({
          title: "Invalid URL",
          description: "Invalid logo URL format",
          variant: "destructive"
        });
        return;
      }

      const { data: fileData, error: fileError } = await supabase.storage
        .from('club-logos')
        .download(fileName);

      if (fileError) {
        toast({
          title: "Logo Not Found",
          description: `Logo file not found in storage: ${fileError.message}`,
          variant: "destructive"
        });
        console.log('Available logo URL:', clubData.logo_url);
        console.log('Attempting to download:', fileName);
      } else {
        toast({
          title: "Logo Verified",
          description: "Logo file exists and is accessible",
        });
        console.log('Logo file verified:', fileData);
      }
    } catch (error) {
      console.error('Logo verification error:', error);
      toast({
        title: "Verification Failed",
        description: "Failed to verify logo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (value: boolean | null, trueText: string, falseText: string) => {
    if (value === null) return <Badge variant="secondary">Unknown</Badge>;
    return value ? 
      <Badge className="bg-green-100 text-green-800">{trueText}</Badge> : 
      <Badge variant="destructive">{falseText}</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Session Diagnostics
            </CardTitle>
            <CardDescription>
              Check authentication status and permissions
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={runDiagnostics} disabled={loading} size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run Diagnostics"}
            </Button>
            <Button onClick={refreshSession} disabled={loading} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              Refresh Session
            </Button>
            <Button onClick={verifyLogo} disabled={loading} variant="ghost" size="sm">
              Verify Logo
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {diagnostics && (
        <CardContent className="space-y-4">
          {diagnostics.jwtIssue && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <div className="font-medium text-red-900">Authentication Issue</div>
                <div className="text-sm text-red-700">{diagnostics.jwtIssue}</div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="font-medium">Session Status</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Has Session:</span>
                  {getStatusBadge(diagnostics.hasSession, "Yes", "No")}
                </div>
                <div className="flex justify-between">
                  <span>Session Valid:</span>
                  {getStatusBadge(diagnostics.sessionValid, "Valid", "Invalid")}
                </div>
                <div className="flex justify-between">
                  <span>Profile Exists:</span>
                  {getStatusBadge(diagnostics.profileExists, "Yes", "No")}
                </div>
                <div className="flex justify-between">
                  <span>Is Admin:</span>
                  {getStatusBadge(diagnostics.isAdmin, "Yes", "No")}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="font-medium">User Details</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>User ID:</span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {diagnostics.userId ? `${diagnostics.userId.substring(0, 8)}...` : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="text-muted-foreground text-xs">
                    {diagnostics.userEmail || 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Role:</span>
                  <Badge variant="outline">{diagnostics.userRole || 'None'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Token:</span>
                  <span className="text-muted-foreground text-xs">
                    {diagnostics.accessToken || 'None'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};