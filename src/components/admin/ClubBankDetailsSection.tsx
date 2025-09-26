import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { SecureBankingService, type ClubBankingDetails } from '@/lib/bankingService';
import { Shield, Eye, EyeOff } from 'lucide-react';

interface BankDetailsSectionProps {
  clubId: string;
}

const ClubBankDetailsSection: React.FC<BankDetailsSectionProps> = ({ clubId }) => {
  const [bankDetails, setBankDetails] = useState<ClubBankingDetails | null>(null);
  const [formData, setFormData] = useState<Partial<ClubBankingDetails>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [accessLog, setAccessLog] = useState<any[]>([]);

  useEffect(() => {
    fetchBankDetails();
  }, [clubId]);

  const fetchBankDetails = async () => {
    setIsLoading(true);
    try {
      const details = await SecureBankingService.getClubBankingDetails(clubId);
      setBankDetails(details);
      setFormData(details || {});
      
      // Access log functionality removed for simplification
    } catch (error) {
      console.error('Error fetching bank details:', error);
      toast.error('Failed to load banking details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData) return;

    // Validate before saving
    const validation = SecureBankingService.validateBankingDetails(formData);
    if (!validation.valid) {
      toast.error(`Validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    setIsSaving(true);
    try {
      const result = await SecureBankingService.updateClubBankingDetails(clubId, formData);
      
      if (result.success) {
        toast.success('Banking details updated successfully');
        setIsEditing(false);
        await fetchBankDetails(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to update banking details');
      }
    } catch (error) {
      console.error('Error saving bank details:', error);
      toast.error('Failed to save banking details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(bankDetails || {});
    setIsEditing(false);
    setShowSensitive(false);
  };

  const handleInputChange = (field: keyof ClubBankingDetails, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Secure Banking Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayDetails = showSensitive 
    ? bankDetails 
    : bankDetails ? SecureBankingService.sanitizeForDisplay(bankDetails) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Secure Banking Details
            </div>
            {bankDetails && !isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSensitive(!showSensitive)}
                className="text-muted-foreground"
              >
                {showSensitive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showSensitive ? 'Hide' : 'Show'} Details
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Banking information is encrypted and access-logged for security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!bankDetails && !isEditing ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No banking details configured</p>
              <Button onClick={() => setIsEditing(true)}>
                Add Banking Details
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_account_holder">Account Holder</Label>
                <Input
                  id="bank_account_holder"
                  value={isEditing ? (formData.bank_account_holder || '') : (displayDetails?.bank_account_holder || '')}
                  onChange={(e) => handleInputChange('bank_account_holder', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Account holder name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_account_number">Account Number</Label>
                <Input
                  id="bank_account_number"
                  value={isEditing ? (formData.bank_account_number || '') : (displayDetails?.bank_account_number || '')}
                  onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                  disabled={!isEditing}
                  placeholder="12345678"
                  type={showSensitive || isEditing ? "text" : "password"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_sort_code">Sort Code</Label>
                <Input
                  id="bank_sort_code"
                  value={isEditing ? (formData.bank_sort_code || '') : (displayDetails?.bank_sort_code || '')}
                  onChange={(e) => handleInputChange('bank_sort_code', e.target.value)}
                  disabled={!isEditing}
                  placeholder="12-34-56"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_iban">IBAN</Label>
                <Input
                  id="bank_iban"
                  value={isEditing ? (formData.bank_iban || '') : (displayDetails?.bank_iban || '')}
                  onChange={(e) => handleInputChange('bank_iban', e.target.value)}
                  disabled={!isEditing}
                  placeholder="GB29 NWBK 6016 1331 9268 19"
                  type={showSensitive || isEditing ? "text" : "password"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_swift">SWIFT/BIC</Label>
                <Input
                  id="bank_swift"
                  value={isEditing ? (formData.bank_swift || '') : (displayDetails?.bank_swift || '')}
                  onChange={(e) => handleInputChange('bank_swift', e.target.value)}
                  disabled={!isEditing}
                  placeholder="NWBKGB2L"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : bankDetails ? (
              <Button onClick={() => setIsEditing(true)}>
                Edit Details
              </Button>
            ) : null}
          </div>

          <div className="text-xs text-muted-foreground border-t pt-4">
            <p>🔒 Banking details are secured with enterprise-grade encryption and comprehensive audit logging.</p>
            <p>All access to this information is monitored and logged for security compliance.</p>
          </div>
        </CardContent>
      </Card>

      {/* Access Log for Transparency */}
      {accessLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Access Log</CardTitle>
            <CardDescription>Recent access to banking information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {accessLog.slice(0, 10).map((log) => (
                <div key={log.id} className="text-xs text-muted-foreground flex justify-between">
                  <span>{log.profiles?.email || 'System'} - {log.access_type}</span>
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClubBankDetailsSection;