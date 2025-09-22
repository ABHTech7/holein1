import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Building, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useInsuranceCompanies } from "@/hooks/useInsuranceCompanies";

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const NewUserModal = ({ isOpen, onClose, onSuccess }: NewUserModalProps) => {
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'CLUB' | 'ADMIN' | 'SUPER_ADMIN' | 'INSURANCE_PARTNER'>('CLUB');
  const { profile } = useAuth();
  const { companies: insuranceCompanies } = useInsuranceCompanies();
  
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

  // Admin form data (no more secret key)
  const [adminData, setAdminData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN'
  });

  // Insurance partner form data
  const [insuranceData, setInsuranceData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    companyId: '',
    role: 'viewer' as 'viewer' | 'admin'
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
      } else if (userType === 'INSURANCE_PARTNER') {
        // Create insurance partner user
        userData = {
          email: insuranceData.email,
          password: insuranceData.password,
          options: {
            data: {
              first_name: insuranceData.firstName,
              last_name: insuranceData.lastName,
              role: 'INSURANCE_PARTNER'
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
        setAdminData({ email: '', firstName: '', lastName: '', password: '', role: 'ADMIN' });
        setInsuranceData({ email: '', firstName: '', lastName: '', password: '', companyId: '', role: 'viewer' });
        onSuccess?.();
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

      // Create insurance user link if insurance partner
      if (userType === 'INSURANCE_PARTNER' && insuranceData.companyId && data.user) {
        const { error: insuranceError } = await supabase
          .from('insurance_users')
          .insert({
            user_id: data.user.id,
            insurance_company_id: insuranceData.companyId,
            role: insuranceData.role
          });
        
        if (insuranceError) {
          console.error('Error creating insurance user link:', insuranceError);
        }
      }

      toast({
        title: "Success",
        description: `${userType.toLowerCase()} created successfully.`,
      });

      // Reset forms
      setClubData({ email: '', firstName: '', lastName: '', password: '', clubName: '', clubAddress: '', clubPhone: '', clubEmail: '' });
      setInsuranceData({ email: '', firstName: '', lastName: '', password: '', companyId: '', role: 'viewer' });
      
      onSuccess?.();
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
    } else if (userType === 'INSURANCE_PARTNER') {
      return insuranceData.email && insuranceData.firstName && insuranceData.password && insuranceData.companyId;
    } else {
      return (
        adminData.email &&
        adminData.firstName &&
        adminData.lastName &&
        adminData.password
      );
    }
  };

  // Check if current user can create admin accounts
  const canCreateAdmins = profile?.role === 'SUPER_ADMIN';

  // Get available tabs based on user role
  const getAvailableTabs = () => {
    const tabs = ['CLUB'];
    if (canCreateAdmins) {
      tabs.push('ADMIN', 'SUPER_ADMIN', 'INSURANCE_PARTNER');
    }
    return tabs;
  };

  // Ensure selected type is valid for current user
  const availableTabs = getAvailableTabs();
  if (!availableTabs.includes(userType)) {
    setUserType('CLUB');
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>

        <Tabs value={userType} onValueChange={(value) => setUserType(value as 'CLUB' | 'ADMIN' | 'SUPER_ADMIN' | 'INSURANCE_PARTNER')}>
          <TabsList className={`grid w-full ${canCreateAdmins ? 'grid-cols-4' : 'grid-cols-1'}`}>
            <TabsTrigger value="CLUB" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Club Manager
            </TabsTrigger>
            {canCreateAdmins && (
              <TabsTrigger value="ADMIN" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin
              </TabsTrigger>
            )}
            {canCreateAdmins && (
              <TabsTrigger value="SUPER_ADMIN" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Super Admin
              </TabsTrigger>
            )}
            {canCreateAdmins && (
              <TabsTrigger value="INSURANCE_PARTNER" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Insurance Partner
              </TabsTrigger>
            )}
            {canCreateAdmins && (
              <TabsTrigger value="INSURANCE_PARTNER" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Insurance Partner
              </TabsTrigger>
            )}
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

          {canCreateAdmins && (
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
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canCreateAdmins && (
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
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canCreateAdmins && (
            <TabsContent value="INSURANCE_PARTNER">
              <Card>
                <CardHeader>
                  <CardTitle>Create Insurance Partner Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="insuranceFirstName">First Name</Label>
                      <Input
                        id="insuranceFirstName"
                        value={insuranceData.firstName}
                        onChange={(e) => setInsuranceData(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="insuranceLastName">Last Name</Label>
                      <Input
                        id="insuranceLastName"
                        value={insuranceData.lastName}
                        onChange={(e) => setInsuranceData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insuranceEmail">Email</Label>
                    <Input
                      id="insuranceEmail"
                      type="email"
                      value={insuranceData.email}
                      onChange={(e) => setInsuranceData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insurancePassword">Password</Label>
                    <Input
                      id="insurancePassword"
                      type="password"
                      value={insuranceData.password}
                      onChange={(e) => setInsuranceData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter secure password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insuranceCompany">Insurance Company</Label>
                    <Select
                      value={insuranceData.companyId}
                      onValueChange={(value) => setInsuranceData(prev => ({ ...prev, companyId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select insurance company" />
                      </SelectTrigger>
                      <SelectContent>
                        {insuranceCompanies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insuranceRole">Access Level</Label>
                    <Select
                      value={insuranceData.role}
                      onValueChange={(value: 'viewer' | 'admin') => setInsuranceData(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                        <SelectItem value="admin">Admin - Full company access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

        </Tabs>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateUser} 
            disabled={loading || !isFormValid()}
          >
            {loading ? "Creating..." : `Create ${
              userType === 'SUPER_ADMIN' ? 'Super Admin' :
              userType === 'INSURANCE_PARTNER' ? 'Insurance Partner' :
              userType.toLowerCase()
            }`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewUserModal;