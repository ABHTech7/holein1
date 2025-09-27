import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, AlertTriangle, Lock } from "lucide-react";

interface SecureAdminCreationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SecureAdminCreation = ({ isOpen, onClose, onSuccess }: SecureAdminCreationProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    adminSecretKey: ''
  });

  const handleCreateAdmin = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: formData.password,
          role: 'ADMIN' // Default to ADMIN role
        }
      });

      if (error) {
        console.error('Edge function invoke error:', error);
        throw new Error(error.message || 'Failed to call admin creation service');
      }

      if (!data) {
        throw new Error('No response received from admin creation service');
      }

      if (data.success) {
        const isUpdate = data.isUpdate;
        toast({
          title: isUpdate ? "Admin Updated Successfully" : "Admin Created Successfully",
          description: data.message || `Admin account for ${formData.firstName} ${formData.lastName} has been ${isUpdate ? 'updated' : 'created'} securely.`,
        });

        // Reset form
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          password: '',
          adminSecretKey: ''
        });

        onSuccess?.();
        onClose();
      } else {
        // Handle structured error response
        const errorMessage = data.error || 'Failed to create admin account';
        const errorDetails = data.details ? ` Details: ${data.details}` : '';
        throw new Error(errorMessage + errorDetails);
      }
    } catch (error: any) {
      console.error('Error creating admin:', error);
      
      // Show user-friendly error message
      let displayMessage = error.message || 'Failed to create admin account';
      
      // Handle specific error cases
      if (displayMessage.includes('already exists') || displayMessage.includes('already been registered')) {
        displayMessage = 'A user with this email address already exists. The existing user has been updated with admin permissions.';
      }
      
      toast({
        title: "Admin Creation Failed",
        description: displayMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return formData.email && 
           formData.firstName && 
           formData.lastName && 
           formData.password;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Secure Admin Creation
          </DialogTitle>
        </DialogHeader>

        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Admin creation requires a secure secret key. This action is logged and audited for security.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Administrator Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter secure password"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateAdmin} 
            disabled={loading || !isFormValid()}
            className="gap-2"
          >
            <Shield className="w-4 h-4" />
            {loading ? "Creating Admin..." : "Create Admin"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SecureAdminCreation;