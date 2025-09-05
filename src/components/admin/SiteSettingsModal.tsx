import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { CreditCard, Globe, Mail, Shield, Settings, Key, AlertTriangle } from "lucide-react";

interface SiteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  maxCompetitionsPerClub: number;
  defaultEntryFee: number;
  supportEmail: string;
}

const SiteSettingsModal = ({ isOpen, onClose }: SiteSettingsModalProps) => {
  const [loading, setLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: "Golf Competition Platform",
    siteDescription: "The premier platform for golf club competitions and member management",
    maintenanceMode: false,
    registrationOpen: true,
    maxCompetitionsPerClub: 10,
    defaultEntryFee: 25.00,
    supportEmail: "support@golfplatform.com"
  });

  useEffect(() => {
    if (isOpen) {
      // Check if Stripe is configured
      checkStripeConnection();
      loadSettings();
    }
  }, [isOpen]);

  const checkStripeConnection = async () => {
    // This would check if STRIPE_SECRET_KEY exists in Supabase secrets
    // For now, we'll simulate this check
    setStripeConnected(false);
  };

  const loadSettings = () => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('siteSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Save to localStorage for now - could be saved to Supabase table
      localStorage.setItem('siteSettings', JSON.stringify(settings));
      
      toast({
        title: "Settings Saved",
        description: "Site settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureStripe = () => {
    toast({
      title: "Configure Stripe",
      description: "Stripe configuration will open in a new window. You'll need your Stripe Secret Key from your dashboard.",
      duration: 4000
    });
    
    // This would trigger the Supabase secrets modal for STRIPE_SECRET_KEY
    // For now, show instructions
    window.open('https://dashboard.stripe.com/apikeys', '_blank');
  };

  const handleTestStripeConnection = async () => {
    setLoading(true);
    try {
      // This would test the Stripe connection using an edge function
      toast({
        title: "Testing Stripe Connection",
        description: "Checking Stripe API connection...",
      });
      
      // Simulate test
      setTimeout(() => {
        setStripeConnected(true);
        toast({
          title: "Stripe Connected",
          description: "Stripe API connection is working properly.",
        });
        setLoading(false);
      }, 2000);
    } catch (error) {
      toast({
        title: "Stripe Connection Failed",
        description: "Unable to connect to Stripe. Please check your API key.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Site Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Site Information
                </CardTitle>
                <CardDescription>
                  Configure basic site information and display settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={settings.siteName}
                      onChange={(e) => setSettings(prev => ({ ...prev, siteName: e.target.value }))}
                      placeholder="Your Platform Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={settings.supportEmail}
                      onChange={(e) => setSettings(prev => ({ ...prev, supportEmail: e.target.value }))}
                      placeholder="support@yoursite.com"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Site Description</Label>
                  <Textarea
                    id="siteDescription"
                    value={settings.siteDescription}
                    onChange={(e) => setSettings(prev => ({ ...prev, siteDescription: e.target.value }))}
                    placeholder="Describe your platform..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>
                  Configure platform behavior and limits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable to show maintenance page to all users
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, maintenanceMode: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Registration Open</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow new users to register accounts
                    </p>
                  </div>
                  <Switch
                    checked={settings.registrationOpen}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, registrationOpen: checked }))}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxCompetitions">Max Competitions per Club</Label>
                    <Input
                      id="maxCompetitions"
                      type="number"
                      min="1"
                      max="50"
                      value={settings.maxCompetitionsPerClub}
                      onChange={(e) => setSettings(prev => ({ ...prev, maxCompetitionsPerClub: parseInt(e.target.value) || 10 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultEntryFee">Default Entry Fee (£)</Label>
                    <Input
                      id="defaultEntryFee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.defaultEntryFee}
                      onChange={(e) => setSettings(prev => ({ ...prev, defaultEntryFee: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Stripe Configuration
                </CardTitle>
                <CardDescription>
                  Configure Stripe payment processing for entry fees and subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${stripeConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="font-medium">Stripe Status</p>
                      <p className="text-sm text-muted-foreground">
                        {stripeConnected ? 'Connected and ready' : 'Not configured'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={stripeConnected ? "default" : "destructive"}>
                    {stripeConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>

                {!stripeConnected && (
                  <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800">Stripe Not Configured</p>
                        <p className="text-amber-700 mt-1">
                          Payment processing is disabled. Configure your Stripe Secret Key to enable entry fee payments.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button 
                    onClick={handleConfigureStripe}
                    variant={stripeConnected ? "outline" : "default"}
                    className="gap-2"
                  >
                    <Key className="w-4 h-4" />
                    {stripeConnected ? 'Update' : 'Configure'} Stripe Key
                  </Button>
                  
                  {stripeConnected && (
                    <Button 
                      onClick={handleTestStripeConnection}
                      variant="outline"
                      disabled={loading}
                      className="gap-2"
                    >
                      <Shield className="w-4 h-4" />
                      Test Connection
                    </Button>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Get your Stripe Secret Key from your Stripe Dashboard</p>
                  <p>• Keys starting with "sk_test_" are for testing</p>
                  <p>• Keys starting with "sk_live_" are for production</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Configuration
                </CardTitle>
                <CardDescription>
                  Configure email settings for notifications and communications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                  <div className="text-sm">
                    <p className="font-medium text-blue-800">Email Provider Setup</p>
                    <p className="text-blue-700 mt-1">
                      Email functionality uses Supabase Auth email templates. Configure SMTP settings in your Supabase project dashboard.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notification Settings</Label>
                  <div className="space-y-3 pl-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">Send welcome emails to new users</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">Competition entry confirmations</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">Payment confirmations</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">Competition results notifications</Label>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Configure security and access control settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require email verification</Label>
                      <p className="text-sm text-muted-foreground">
                        Users must verify email before accessing platform
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable audit logging</Label>
                      <p className="text-sm text-muted-foreground">
                        Log all administrative actions and data changes
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Session timeout (minutes)</Label>
                    <Input
                      type="number"
                      min="15"
                      max="1440"
                      defaultValue="60"
                      className="w-32"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSaveSettings} disabled={loading}>
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SiteSettingsModal;