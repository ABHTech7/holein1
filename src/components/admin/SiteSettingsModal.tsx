import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useInsuranceCompanies } from '@/hooks/useInsuranceCompanies';

interface SiteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SiteSettings {
  id: string;
  site_name: string;
  site_description: string;
  support_email: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  max_competitions_per_club: number;
  max_entry_fee_pounds: number;
  insurance_enabled: boolean;
  current_insurance_company_id: string | null;
  insurance_contact_name: string | null;
  insurance_contact_phone: string | null;
}

const SiteSettingsModal = ({ isOpen, onClose }: SiteSettingsModalProps) => {
  const { company: currentInsuranceCompany } = useInsuranceCompanies();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data);
      } else {
        // Create default settings if none exist
        const { data: newSettings, error: createError } = await supabase
          .from('site_settings')
          .insert([{
            site_name: 'Official Hole in 1',
            site_description: 'Professional golf hole-in-one competitions',
            support_email: 'support@holein1.com',
            maintenance_mode: false,
            maintenance_message: 'We are currently performing scheduled maintenance. Please check back soon.',
            max_competitions_per_club: 10,
            max_entry_fee_pounds: 500,
            insurance_enabled: false
          }])
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
      toast({
        title: "Error",
        description: "Failed to load site settings",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('site_settings')
        .update({
          site_name: settings.site_name,
          site_description: settings.site_description,
          support_email: settings.support_email,
          maintenance_mode: settings.maintenance_mode,
          maintenance_message: settings.maintenance_message,
          max_competitions_per_club: settings.max_competitions_per_club,
          max_entry_fee_pounds: settings.max_entry_fee_pounds,
          insurance_enabled: settings.insurance_enabled,
          current_insurance_company_id: settings.current_insurance_company_id,
          insurance_contact_name: settings.insurance_contact_name,
          insurance_contact_phone: settings.insurance_contact_phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Site settings updated successfully"
      });

      onClose();
    } catch (error) {
      console.error('Error updating site settings:', error);
      toast({
        title: "Error",
        description: "Failed to update site settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!settings) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Site Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="site_name">Site Name</Label>
                <Input
                  id="site_name"
                  value={settings.site_name}
                  onChange={(e) => setSettings(prev => prev ? {...prev, site_name: e.target.value} : null)}
                />
              </div>

              <div>
                <Label htmlFor="site_description">Site Description</Label>
                <Textarea
                  id="site_description"
                  value={settings.site_description || ''}
                  onChange={(e) => setSettings(prev => prev ? {...prev, site_description: e.target.value} : null)}
                />
              </div>

              <div>
                <Label htmlFor="support_email">Support Email</Label>
                <Input
                  id="support_email"
                  type="email"
                  value={settings.support_email || ''}
                  onChange={(e) => setSettings(prev => prev ? {...prev, support_email: e.target.value} : null)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Insurance Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Insurance Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="insurance_enabled"
                  checked={settings.insurance_enabled}
                  onCheckedChange={(checked) => setSettings(prev => prev ? {...prev, insurance_enabled: checked} : null)}
                />
                <Label htmlFor="insurance_enabled">Enable Insurance Integration</Label>
              </div>

              {settings.insurance_enabled && (
                <>
                  <Separator />
                  
                  <div>
                    <Label>Current Insurance Partner</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      {currentInsuranceCompany ? currentInsuranceCompany.name : 'No active insurance partner'}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="insurance_contact_name">Insurance Contact Name</Label>
                    <Input
                      id="insurance_contact_name"
                      value={settings.insurance_contact_name || ''}
                      onChange={(e) => setSettings(prev => prev ? {...prev, insurance_contact_name: e.target.value} : null)}
                      placeholder="Primary contact name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="insurance_contact_phone">Insurance Contact Phone</Label>
                    <Input
                      id="insurance_contact_phone"
                      value={settings.insurance_contact_phone || ''}
                      onChange={(e) => setSettings(prev => prev ? {...prev, insurance_contact_phone: e.target.value} : null)}
                      placeholder="Contact phone number"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SiteSettingsModal;