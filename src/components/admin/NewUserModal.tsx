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
import { User, Building } from "lucide-react";

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewUserModal = ({ isOpen, onClose }: NewUserModalProps) => {
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'PLAYER' | 'CLUB'>('PLAYER');
  
  // Player form data
  const [playerData, setPlayerData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: ''
  });

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

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      
      let userData;
      let clubId = null;
      
      if (userType === 'PLAYER') {
        userData = {
          email: playerData.email,
          password: playerData.password,
          options: {
            data: {
              first_name: playerData.firstName,
              last_name: playerData.lastName,
              phone: playerData.phone,
              role: 'PLAYER'
            }
          }
        };
      } else if (userType === 'CLUB') {
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
      setPlayerData({ email: '', firstName: '', lastName: '', phone: '', password: '' });
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
    if (userType === 'PLAYER') {
      return playerData.email && playerData.firstName && playerData.password;
    } else {
      return clubData.email && clubData.firstName && clubData.password && clubData.clubName;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>

        <Tabs value={userType} onValueChange={(value) => setUserType(value as 'PLAYER' | 'CLUB')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="PLAYER" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Player
            </TabsTrigger>
            <TabsTrigger value="CLUB" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Club Manager
            </TabsTrigger>
          </TabsList>

          <TabsContent value="PLAYER">
            <Card>
              <CardHeader>
                <CardTitle>Create Player Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="playerFirstName">First Name</Label>
                    <Input
                      id="playerFirstName"
                      value={playerData.firstName}
                      onChange={(e) => setPlayerData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="playerLastName">Last Name</Label>
                    <Input
                      id="playerLastName"
                      value={playerData.lastName}
                      onChange={(e) => setPlayerData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                  <div className="space-y-2">
                    <Label htmlFor="playerEmail">Email</Label>
                    <Input
                      id="playerEmail"
                      type="email"
                      value={playerData.email}
                      onChange={(e) => setPlayerData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="playerPhone">Mobile Number</Label>
                    <Input
                      id="playerPhone"
                      type="tel"
                      value={playerData.phone}
                      onChange={(e) => setPlayerData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter mobile number"
                    />
                  </div>
                <div className="space-y-2">
                  <Label htmlFor="playerPassword">Password</Label>
                  <Input
                    id="playerPassword"
                    type="password"
                    value={playerData.password}
                    onChange={(e) => setPlayerData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateUser} 
            disabled={loading || !isFormValid()}
          >
            {loading ? "Creating..." : `Create ${userType.toLowerCase()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewUserModal;