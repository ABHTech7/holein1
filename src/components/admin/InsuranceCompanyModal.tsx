import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Building2 } from 'lucide-react';

interface InsuranceCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  company?: {
    id: string;
    name: string;
    contact_email: string;
    premium_rate_per_entry: number;
    logo_url?: string;
    contract_url?: string;
  } | null;
}

const InsuranceCompanyModal = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  company = null 
}: InsuranceCompanyModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: company?.name || '',
    contact_email: company?.contact_email || '',
    premium_rate_per_entry: company?.premium_rate_per_entry || 1.00,
    logo_url: company?.logo_url || '',
    contract_url: company?.contract_url || ''
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.contact_email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const operation = company 
        ? supabase.from('insurance_companies').update(formData).eq('id', company.id)
        : supabase.from('insurance_companies').insert([formData]);

      const { error } = await operation;

      if (error) throw error;

      toast({
        title: "Success",
        description: `Insurance company ${company ? 'updated' : 'created'} successfully`
      });

      onSuccess?.();
      onClose();
      
    } catch (error) {
      console.error('Error saving insurance company:', error);
      toast({
        title: "Error",
        description: `Failed to ${company ? 'update' : 'create'} insurance company`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {company ? 'Edit Insurance Company' : 'Add New Insurance Company'}
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Acme Insurance Ltd"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Contact Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                placeholder="contact@acmeinsurance.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">Premium Rate per Entry (£)</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.premium_rate_per_entry}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  premium_rate_per_entry: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract">Contract URL</Label>
              <Input
                id="contract"
                type="url"
                value={formData.contract_url}
                onChange={(e) => setFormData(prev => ({ ...prev, contract_url: e.target.value }))}
                placeholder="https://example.com/contract.pdf"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : (company ? 'Update Company' : 'Create Company')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InsuranceCompanyModal;