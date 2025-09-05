import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { CreditCard, Save, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BankDetailsSectionProps {
  clubId: string;
}

interface BankDetails {
  bank_account_holder: string | null;
  bank_account_number: string | null;
  bank_sort_code: string | null;
  bank_iban: string | null;
  bank_swift: string | null;
}

const ClubBankDetailsSection = ({ clubId }: BankDetailsSectionProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bank_account_holder: null,
    bank_account_number: null,
    bank_sort_code: null,
    bank_iban: null,
    bank_swift: null
  });
  const [formData, setFormData] = useState<BankDetails>({
    bank_account_holder: "",
    bank_account_number: "",
    bank_sort_code: "",
    bank_iban: "",
    bank_swift: ""
  });

  useEffect(() => {
    fetchBankDetails();
  }, [clubId]);

  const fetchBankDetails = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('clubs')
        .select('bank_account_holder, bank_account_number, bank_sort_code, bank_iban, bank_swift')
        .eq('id', clubId)
        .single();

      if (error) throw error;

      setBankDetails(data);
      setFormData({
        bank_account_holder: data.bank_account_holder || "",
        bank_account_number: data.bank_account_number || "",
        bank_sort_code: data.bank_sort_code || "",
        bank_iban: data.bank_iban || "",
        bank_swift: data.bank_swift || ""
      });

    } catch (error) {
      console.error('Error fetching bank details:', error);
      toast({
        title: "Error",
        description: "Failed to load bank details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('clubs')
        .update({
          bank_account_holder: formData.bank_account_holder || null,
          bank_account_number: formData.bank_account_number || null,
          bank_sort_code: formData.bank_sort_code || null,
          bank_iban: formData.bank_iban || null,
          bank_swift: formData.bank_swift || null
        })
        .eq('id', clubId);

      if (error) throw error;

      setBankDetails(formData);
      setEditMode(false);

      toast({
        title: "Success",
        description: "Bank details updated successfully"
      });

    } catch (error) {
      console.error('Error saving bank details:', error);
      toast({
        title: "Error",
        description: "Failed to save bank details",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      bank_account_holder: bankDetails.bank_account_holder || "",
      bank_account_number: bankDetails.bank_account_number || "",
      bank_sort_code: bankDetails.bank_sort_code || "",
      bank_iban: bankDetails.bank_iban || "",
      bank_swift: bankDetails.bank_swift || ""
    });
    setEditMode(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const hasAnyBankDetails = Object.values(bankDetails).some(value => value && value.trim() !== '');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Bank Account Details
          </CardTitle>
          {!editMode ? (
            <Button variant="outline" onClick={() => setEditMode(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasAnyBankDetails && !editMode ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No bank details on file</p>
            <p className="text-sm">Bank details are required for commission payments</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_holder">Account Holder Name</Label>
                <Input
                  id="account_holder"
                  value={formData.bank_account_holder}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_account_holder: e.target.value }))}
                  disabled={!editMode}
                  placeholder="Account holder full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  value={formData.bank_account_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_account_number: e.target.value }))}
                  disabled={!editMode}
                  placeholder="12345678"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sort_code">Sort Code</Label>
                <Input
                  id="sort_code"
                  value={formData.bank_sort_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_sort_code: e.target.value }))}
                  disabled={!editMode}
                  placeholder="12-34-56"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN (Optional)</Label>
                <Input
                  id="iban"
                  value={formData.bank_iban}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_iban: e.target.value }))}
                  disabled={!editMode}
                  placeholder="GB29 NWBK 6016 1331 9268 19"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="swift">SWIFT/BIC (Optional)</Label>
                <Input
                  id="swift"
                  value={formData.bank_swift}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_swift: e.target.value }))}
                  disabled={!editMode}
                  placeholder="NWBKGB2L"
                />
              </div>
            </div>

            {!editMode && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Bank details are required for processing commission payments. 
                  All information is securely stored and only used for payment processing.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClubBankDetailsSection;