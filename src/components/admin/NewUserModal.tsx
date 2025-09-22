import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Building, Shield } from "lucide-react";

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewUserModal = ({ isOpen, onClose }: NewUserModalProps) => {
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'CLUB' | 'ADMIN' | 'SUPER_ADMIN'>('CLUB');
  
  // Club form data
  const [clubData, setClubData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    clubName: '',
    clubAddress: '',
    clubPhone: '',
    clubEmail: ''
  });

  // Admin form data
  const [adminData, setAdminData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    adminSecretKey: '',
    role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN'
  });

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      
      let userData: any;
      let clubId = null;
      
      if (userType === 'CLUB') {
        // First create the club
        const { data: club, error: clubError } = await supabase
          .from('clubs')
          .insert({
            name: clubData.clubName,
            address: clubData.clubAddress,
            phone: clubData.clubPhone,
            email: clubData.clubEmail
          })
          .select()
          .single();

        if (clubError) throw clubError;
        clubId = club.id;

        userData = {
          email: clubData.email,
          password: clubData.password,
          options: {
            data: {
              first_name: clubData.firstName,
              last_name: clubData.lastName,
              role: 'CLUB',
              club_id: clubId
            }
          }
        };
      } else if (userType === 'ADMIN' || userType === 'SUPER_ADMIN') {
        // Use secure edge function for admin creation
        const { data: adminRes, error: adminError } = await supabase.functions.invoke('create-admin-user', {
          body: {
            email: adminData.email,
            firstName: adminData.firstName,
            lastName: adminData.lastName,
            password: adminData.password,
            adminSecretKey: adminData.adminSecretKey,
            role: adminData.role
          }
        });

        if (adminError) throw adminError;
        if (!(adminRes as any)?.success) {
          throw new Error((adminRes as any)?.error || 'Failed to create admin account');
        }

        toast({
          title: "Success",
          description: `${adminData.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Administrator'} account created successfully.`,
        });

        // Reset forms
        setAdminData({ email: '', firstName: '', lastName: '', password: '', adminSecretKey: '', role: 'ADMIN' });
        onClose();
        return;
      }

      const { data, error } = await supabase.auth.admin.createUser(userData);
      
      if (error) throw error;

      // Update the profile with club_id if it's a club user
      if (userType === 'CLUB' && clubId && data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ club_id: clubId })
          .eq('id', data.user.id);
        
        if (profileError) {
          console.error('Error updating profile with club_id:', profileError);
        }
      }

      toast({
        title: "Success",
        description: `${userType.toLowerCase()} created successfully.`,
      });

      // Reset forms
      setClubData({ email: '', firstName: '', lastName: '', password: '', clubName: '', clubAddress: '', clubPhone: '', clubEmail: '' });
      
      onClose();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    if (userType === 'CLUB') {
      return clubData.email && clubData.firstName && clubData.password && clubData.clubName;
    } else {
      return (
        adminData.email &&
        adminData.firstName &&
        adminData.lastName &&
        adminData.password &&
        adminData.adminSecretKey
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>

        <Tabs value={userType} onValueChange={(value) => setUserType(value as 'CLUB' | 'ADMIN' | 'SUPER_ADMIN')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="CLUB" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Club Manager
            </TabsTrigger>
            <TabsTrigger value="ADMIN" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Admin
            </TabsTrigger>
            <TabsTrigger value="SUPER_ADMIN" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Super Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="CLUB">
            <Card>
              <CardHeader>
                <CardTitle>Create Club Manager Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Manager Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clubFirstName">First Name</Label>
                      <Input
                        id="clubFirstName"
                        value={clubData.firstName}
                        onChange={(e) => setClubData(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clubLastName">Last Name</Label>
                      <Input
                        id="clubLastName"
                        value={clubData.lastName}
                        onChange={(e) => setClubData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clubManagerEmail">Manager Email</Label>
                    <Input
                      id="clubManagerEmail"
                      type="email"
                      value={clubData.email}
                      onChange={(e) => setClubData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter manager email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clubPassword">Password</Label>
                    <Input
                      id="clubPassword"
                      type="password"
                      value={clubData.password}
                      onChange={(e) => setClubData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Club Details</h4>
                  <div className="space-y-2">
                    <Label htmlFor="clubName">Club Name</Label>
                    <Input
                      id="clubName"
                      value={clubData.clubName}
                      onChange={(e) => setClubData(prev => ({ ...prev, clubName: e.target.value }))}
                      placeholder="Enter club name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clubAddress">Club Address</Label>
                    <Input
                      id="clubAddress"
                      value={clubData.clubAddress}
                      onChange={(e) => setClubData(prev => ({ ...prev, clubAddress: e.target.value }))}
                      placeholder="Enter club address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clubPhone">Club Phone</Label>
                      <Input
                        id="clubPhone"
                        value={clubData.clubPhone}
                        onChange={(e) => setClubData(prev => ({ ...prev, clubPhone: e.target.value }))}
                        placeholder="Enter club phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clubEmailAddress">Club Email</Label>
                      <Input
                        id="clubEmailAddress"
                        type="email"
                        value={clubData.clubEmail}
                        onChange={(e) => setClubData(prev => ({ ...prev, clubEmail: e.target.value }))}
                        placeholder="Enter club email"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ADMIN">
            <Card>
              <CardHeader>
                <CardTitle>Create Administrator Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminFirstName">First Name</Label>
                    <Input
                      id="adminFirstName"
                      value={adminData.firstName}
                      onChange={(e) => setAdminData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminLastName">Last Name</Label>
                    <Input
                      id="adminLastName"
                      value={adminData.lastName}
                      onChange={(e) => setAdminData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={adminData.email}
                    onChange={(e) => setAdminData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Password</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={adminData.password}
                    onChange={(e) => setAdminData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter secure password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminSecret">Admin Secret Key</Label>
                  <Input
                    id="adminSecret"
                    type="password"
                    value={adminData.adminSecretKey}
                    onChange={(e) => setAdminData(prev => ({ ...prev, adminSecretKey: e.target.value }))}
                    placeholder="Enter admin creation secret"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="SUPER_ADMIN">
            <Card>
              <CardHeader>
                <CardTitle>Create Super Administrator Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="superAdminFirstName">First Name</Label>
                    <Input
                      id="superAdminFirstName"
                      value={adminData.firstName}
                      onChange={(e) => setAdminData(prev => ({ ...prev, firstName: e.target.value, role: 'SUPER_ADMIN' }))}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="superAdminLastName">Last Name</Label>
                    <Input
                      id="superAdminLastName"
                      value={adminData.lastName}
                      onChange={(e) => setAdminData(prev => ({ ...prev, lastName: e.target.value, role: 'SUPER_ADMIN' }))}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="superAdminEmail">Email</Label>
                  <Input
                    id="superAdminEmail"
                    type="email"
                    value={adminData.email}
                    onChange={(e) => setAdminData(prev => ({ ...prev, email: e.target.value, role: 'SUPER_ADMIN' }))}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="superAdminPassword">Password</Label>
                  <Input
                    id="superAdminPassword"
                    type="password"
                    value={adminData.password}
                    onChange={(e) => setAdminData(prev => ({ ...prev, password: e.target.value, role: 'SUPER_ADMIN' }))}
                    placeholder="Enter secure password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="superAdminSecret">Admin Secret Key</Label>
                  <Input
                    id="superAdminSecret"
                    type="password"
                    value={adminData.adminSecretKey}
                    onChange={(e) => setAdminData(prev => ({ ...prev, adminSecretKey: e.target.value, role: 'SUPER_ADMIN' }))}
                    placeholder="Enter admin creation secret"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateUser} 
            disabled={loading || !isFormValid()}
          >
            {loading ? "Creating..." : `Create ${userType === 'SUPER_ADMIN' ? 'Super Admin' : userType.toLowerCase()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewUserModal;