import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Database, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Credentials {
  admin: { email: string; password: string };
  club1: { email: string; password: string };
  club2: { email: string; password: string };
  player: { email: string; password: string };
}

const DeveloperDemo = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [demoSecret, setDemoSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  // Check if we're in development mode (this is a heuristic since we can't access NODE_ENV directly)
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname.includes('lovable.app');

  const needsSecret = !isDevelopment;

  const handleUnlock = () => {
    if (demoSecret.trim()) {
      setIsUnlocked(true);
      toast({
        title: "Access granted",
        description: "Demo tools are now available."
      });
    } else {
      toast({
        title: "Access denied", 
        description: "Please enter the correct demo secret.",
        variant: "destructive"
      });
    }
  };

  const handleSeedData = async () => {
    setLoading(true);
    try {
      const payload = needsSecret ? { demoSecret } : {};
      
      const { data, error } = await supabase.functions.invoke('seed-demo-data', {
        body: payload
      });

      if (error) throw error;

      if (data.credentials) {
        setCredentials(data.credentials);
      }

      toast({
        title: "Demo data seeded",
        description: "All demo users, clubs, and competitions have been created."
      });
    } catch (error: any) {
      console.error("Seed error:", error);
      toast({
        title: "Seed failed",
        description: error.message || "Failed to seed demo data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFlushData = async () => {
    setLoading(true);
    try {
      const payload = needsSecret ? { demoSecret } : {};
      
      const { data, error } = await supabase.functions.invoke('flush-demo-data', {
        body: payload
      });

      if (error) throw error;

      setCredentials(null);
      
      toast({
        title: "Demo data flushed",
        description: `Removed ${data.deletedUsers || 0} users and ${data.deletedClubs || 0} clubs.`
      });
    } catch (error: any) {
      console.error("Flush error:", error);
      toast({
        title: "Flush failed",
        description: error.message || "Failed to flush demo data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${label} copied to clipboard.`
    });
  };

  const canUseTools = isDevelopment || isUnlocked;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section>
          <Container>
            <div className="max-w-4xl mx-auto">
              
              {/* Header */}
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Database className="w-6 h-6 text-primary" />
                  <Badge variant="secondary">Developer Tools</Badge>
                </div>
                <h1 className="text-3xl font-bold mb-4">Demo Data Management</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Seed and flush demo data for Hole in 1 Challenge. Use these tools to quickly 
                  set up test accounts, clubs, competitions, and entries.
                </p>
              </div>

              {/* Warning Card */}
              <Card className="mb-8 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                    <AlertTriangle className="w-5 h-5" />
                    Development Tool Warning
                  </CardTitle>
                  <CardDescription className="text-orange-700 dark:text-orange-300">
                    This page manipulates real database data. Only use in development environments 
                    unless you know exactly what you're doing.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Secret Input (Production) */}
              {needsSecret && !isUnlocked && (
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Production Access</CardTitle>
                    <CardDescription>
                      Enter the demo secret to unlock these tools in production.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="demoSecret">Demo Secret</Label>
                      <Input
                        id="demoSecret"
                        type="password"
                        placeholder="Enter demo secret..."
                        value={demoSecret}
                        onChange={(e) => setDemoSecret(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                      />
                    </div>
                    <Button onClick={handleUnlock} disabled={!demoSecret.trim()}>
                      Unlock Demo Tools
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Demo Tools */}
              {canUseTools && (
                <div className="grid lg:grid-cols-2 gap-8 mb-8">
                  
                  {/* Seed Data */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-primary" />
                        Seed Demo Data
                      </CardTitle>
                      <CardDescription>
                        Create demo users, clubs, competitions, and entries. Safe to run multiple times.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-2">This will create:</p>
                        <ul className="space-y-1 ml-4">
                          <li>• 4 demo users (admin, 2 clubs, 1 player)</li>
                          <li>• 2 demo golf clubs</li>
                          <li>• 3 competitions (active, scheduled, ended)</li>
                          <li>• Sample entries and data</li>
                        </ul>
                      </div>
                      <Button 
                        onClick={handleSeedData} 
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? "Seeding..." : "Seed Demo Data"}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Flush Data */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-destructive" />
                        Flush Demo Data
                      </CardTitle>
                      <CardDescription>
                        Remove all demo users, clubs, and related data. Only touches demo accounts.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-2">This will remove:</p>
                        <ul className="space-y-1 ml-4">
                          <li>• Demo user accounts</li>
                          <li>• Demo clubs and competitions</li>
                          <li>• Associated entries and claims</li>
                          <li>• Demo leads and profiles</li>
                        </ul>
                      </div>
                      <Button 
                        onClick={handleFlushData} 
                        disabled={loading}
                        variant="destructive"
                        className="w-full"
                      >
                        {loading ? "Flushing..." : "Flush Demo Data"}
                      </Button>
                    </CardContent>
                  </Card>

                </div>
              )}

              {/* Credentials Display */}
              {credentials && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Demo Credentials
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPasswords(!showPasswords)}
                      >
                        {showPasswords ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Show
                          </>
                        )}
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      Use these credentials to log in and test different user roles.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      
                      {Object.entries(credentials).map(([role, cred]) => (
                        <div key={role} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="space-y-1">
                            <div className="font-medium capitalize">{role} Account</div>
                            <div className="text-sm text-muted-foreground">
                              {cred.email} / {showPasswords ? cred.password : '••••••••'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(cred.email, 'Email')}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Email
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(cred.password, 'Password')}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Password
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default DeveloperDemo;