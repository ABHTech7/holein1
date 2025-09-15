import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, EyeOff, CreditCard, Save, Edit2, X, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SecureBankingService, ClubBankingDetails } from "@/lib/bankingService";
import { useAuth } from "@/hooks/useAuth";

interface ClubBankingSectionProps {
  clubId: string;
}

const ClubBankingSection: React.FC<ClubBankingSectionProps> = ({ clubId }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [bankingDetails, setBankingDetails] = useState<ClubBankingDetails | null>(null);
  const [formData, setFormData] = useState<Partial<ClubBankingDetails>>({});

  useEffect(() => {
    fetchBankDetails();
  }, [clubId]);

  const fetchBankDetails = async () => {
    try {
      setLoading(true);
      const details = await SecureBankingService.getClubBankingDetails(clubId);
      setBankingDetails(details);
      setFormData(details || {});
    } catch (error) {
      console.error('Error fetching banking details:', error);
      toast({
        title: "Error",
        description: "Failed to load banking details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const validation = SecureBankingService.validateBankingDetails(formData);
      if (!validation.valid) {
        toast({
          title: "Validation Error",
          description: validation.errors.join(", "),
          variant: "destructive"
        });
        return;
      }

      const result = await SecureBankingService.updateClubBankingDetails(clubId, formData);
      
      if (result.success) {
        await fetchBankDetails();
        setIsEditing(false);
        toast({
          title: "Success",
          description: "Banking details updated successfully."
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving banking details:', error);
      toast({
        title: "Error", 
        description: "Failed to save banking details.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(bankingDetails || {});
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof ClubBankingDetails, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const displayDetails = showSensitive 
    ? bankingDetails 
    : (bankingDetails ? SecureBankingService.sanitizeForDisplay(bankingDetails) : null);

  // Check if current user can edit (Club role with matching club_id or Admin)
  const canEdit = profile?.role === 'ADMIN' || (profile?.role === 'CLUB' && profile?.club_id === clubId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Banking Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canEdit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Banking Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>You don't have permission to view banking details for this club.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Banking Details
        </CardTitle>
        <div className="flex items-center gap-2">
          {bankingDetails && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSensitive(!showSensitive)}
              className="flex items-center gap-2"
            >
              {showSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showSensitive ? "Hide Details" : "Show Details"}
            </Button>
          )}
          {!isEditing ? (
            <Button
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit Details
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!bankingDetails && !isEditing ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No banking details configured yet.</p>
            <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
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
              <Label htmlFor="bank_iban">IBAN <span className="text-muted-foreground text-sm">(Optional)</span></Label>
              <Input
                id="bank_iban"
                value={isEditing ? (formData.bank_iban || '') : (displayDetails?.bank_iban || '')}
                onChange={(e) => handleInputChange('bank_iban', e.target.value)}
                disabled={!isEditing}
                placeholder="GB29 NWBK 6016 1331 9268 19 (Optional)"
                type={showSensitive || isEditing ? "text" : "password"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_swift">SWIFT/BIC <span className="text-muted-foreground text-sm">(Optional)</span></Label>
              <Input
                id="bank_swift"
                value={isEditing ? (formData.bank_swift || '') : (displayDetails?.bank_swift || '')}
                onChange={(e) => handleInputChange('bank_swift', e.target.value)}
                disabled={!isEditing}
                placeholder="NWBKGB2L (Optional)"
              />
            </div>
          </div>
        )}

        {bankingDetails?.updated_at && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Last updated: {new Date(bankingDetails.updated_at).toLocaleDateString()}</span>
              <Badge variant="secondary">
                Accessed {bankingDetails.access_count || 0} times
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClubBankingSection;