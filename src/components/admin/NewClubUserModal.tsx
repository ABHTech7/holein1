import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "lucide-react";

interface NewClubUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  clubName: string;
  onSuccess: () => void;
}

const NewClubUserModal = ({ isOpen, onClose, clubId, clubName, onSuccess }: NewClubUserModalProps) => {
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: ''
  });

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      
      // Create the user with CLUB role and club_id
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: 'CLUB',
          club_id: clubId
        }
      });
      
      if (error) throw error;

      // Update the profile with club_id to ensure it's set correctly
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ club_id: clubId, role: 'CLUB' })
          .eq('id', data.user.id);
        
        if (profileError) {
          console.error('Error updating profile with club_id:', profileError);
        }
      }

      toast({
        title: "Success",
        description: `Club manager created successfully for ${clubName}.`,
      });

      // Reset form
      setUserData({ email: '', firstName: '', lastName: '', password: '' });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating club user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create club user.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return userData.email && userData.firstName && userData.password;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Club Manager</DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5" />
              Create Club Manager Account
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Add a new user with club management access for {clubName}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={userData.firstName}
                  onChange={(e) => setUserData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={userData.lastName}
                  onChange={(e) => setUserData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={userData.email}
                onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={userData.password}
                onChange={(e) => setUserData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
              />
            </div>
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded border">
              <strong>Note:</strong> This user will be created with CLUB role and assigned to manage {clubName}. 
              They will have access to club competitions, entries, and management features.
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateUser} 
            disabled={loading || !isFormValid()}
          >
            {loading ? "Creating..." : "Create Club Manager"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewClubUserModal;