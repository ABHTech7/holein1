import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SiteHeader from "@/components/layout/SiteHeader";
import Section from "@/components/layout/Section";
import { ArrowLeft, Plus, Search, Edit, MoreHorizontal, Shield, Building, FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/formatters";
import NewUserModal from "@/components/admin/NewUserModal";
import { PermissionManagement } from "@/components/admin/PermissionManagement";

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CLUB' | 'INSURANCE_PARTNER';
  club_id: string | null;
  created_at: string;
  clubs?: {
    name: string;
  };
}

interface Club {
  id: string;
  name: string;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [showPermissionManagement, setShowPermissionManagement] = useState(false);
  const [permissionUserId, setPermissionUserId] = useState<string>("");
  const [permissionUserEmail, setPermissionUserEmail] = useState<string>("");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUser, setEditUser] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    role: "CLUB" as "SUPER_ADMIN" | "ADMIN" | "CLUB" | "INSURANCE_PARTNER",
    clubId: ""
  });

  // Fetch users and clubs
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch non-player users with club information
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select(`
            id, email, first_name, last_name, phone, role, club_id, created_at,
            clubs(name)
          `)
          .in('role', ['SUPER_ADMIN', 'ADMIN', 'CLUB', 'INSURANCE_PARTNER'])
          .order('created_at', { ascending: false });

        if (usersError) {
          console.error('Error fetching users:', usersError);
          toast({
            title: "Error",
            description: "Failed to load users",
            variant: "destructive"
          });
        } else {
          // Type assertion since we're filtering for only ADMIN and CLUB roles
          setUsers((usersData || []) as UserProfile[]);
        }

        // Fetch clubs for the dropdown
        const { data: clubsData, error: clubsError } = await supabase
          .from('clubs')
          .select('id, name')
          .eq('active', true)
          .order('name');

        if (clubsError) {
          console.error('Error fetching clubs:', clubsError);
        } else {
          setClubs(clubsData || []);
        }

      } catch (error) {
        console.error('Error in fetchData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditUser({
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      phone: user.phone || "",
      role: user.role,
      clubId: user.club_id || ""
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;

    try {
      // Update profile in the profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editUser.firstName,
          last_name: editUser.lastName,
          phone: editUser.phone,
          role: editUser.role,
          club_id: editUser.role === 'CLUB' ? editUser.clubId : null
        })
        .eq('id', editingUser.id);

      if (error) {
        console.error('Error updating user:', error);
        toast({
          title: "Error",
          description: `Failed to update user: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "User updated successfully"
      });

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === editingUser.id
            ? {
                ...user,
                first_name: editUser.firstName,
                last_name: editUser.lastName,
                phone: editUser.phone,
                role: editUser.role,
                club_id: editUser.role === 'CLUB' ? editUser.clubId : null
              }
            : user
        )
      );

      // Close edit modal
      setEditingUser(null);

    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.clubs?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ADMIN':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CLUB':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'INSURANCE_PARTNER':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleManagePermissions = (user: UserProfile) => {
    setPermissionUserId(user.id);
    setPermissionUserEmail(user.email);
    setShowPermissionManagement(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="lg">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/dashboard/admin')}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Button>
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground">User Management</h1>
                  <p className="text-muted-foreground mt-1">Manage administrators, club managers, and insurance partners</p>
                </div>
              </div>
              <Button 
                className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2"
                onClick={() => setShowAddUser(true)}
              >
                <Plus className="w-4 h-4" />
                Add User
              </Button>
            </div>

            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or club..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Staff Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-600" />
                    Administrator Accounts ({filteredUsers.filter(u => u.role === 'ADMIN').length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-48 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredUsers.filter(user => user.role === 'ADMIN').length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No administrators found</p>
                      </div>
                    ) : (
                      filteredUsers.filter(user => user.role === 'ADMIN').map((user) => (
                        <div key={user.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-red-600">
                              {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">
                                {user.first_name && user.last_name 
                                  ? `${user.first_name} ${user.last_name}`
                                  : user.email
                                }
                              </h3>
                              <Badge className={getRoleColor(user.role)}>
                                {user.role}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>{user.email}</p>
                              {user.phone && <p>📱 {user.phone}</p>}
                              <p>Created {formatDate(user.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </Button>
                            {user.role === 'ADMIN' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleManagePermissions(user)}
                                className="gap-2"
                              >
                                <Shield className="w-4 h-4" />
                                Permissions
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Club Managers Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-blue-600" />
                    Club Managers ({filteredUsers.filter(u => u.role === 'CLUB').length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-48 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredUsers.filter(user => user.role === 'CLUB').length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No club managers found</p>
                      </div>
                    ) : (
                      filteredUsers.filter(user => user.role === 'CLUB').map((user) => (
                        <div key={user.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">
                                {user.first_name && user.last_name 
                                  ? `${user.first_name} ${user.last_name}`
                                  : user.email
                                }
                              </h3>
                              <Badge className={getRoleColor(user.role)}>
                                {user.role}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>{user.email}</p>
                              {user.phone && <p>📱 {user.phone}</p>}
                              {user.clubs?.name && <p>🏌️ {user.clubs.name}</p>}
                              <p>Created {formatDate(user.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </Button>
                            {user.role === 'ADMIN' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleManagePermissions(user)}
                                className="gap-2"
                              >
                                <Shield className="w-4 h-4" />
                                Permissions
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Insurance Partners Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileBarChart className="w-5 h-5 text-green-600" />
                    Insurance Partners ({filteredUsers.filter(u => u.role === 'INSURANCE_PARTNER').length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-48 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredUsers.filter(user => user.role === 'INSURANCE_PARTNER').length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No insurance partners found</p>
                      </div>
                    ) : (
                      filteredUsers.filter(user => user.role === 'INSURANCE_PARTNER').map((user) => (
                        <div key={user.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-green-600">
                              {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">
                                {user.first_name && user.last_name 
                                  ? `${user.first_name} ${user.last_name}`
                                  : user.email
                                }
                              </h3>
                              <Badge className={getRoleColor(user.role)}>
                                INSURANCE_PARTNER
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>{user.email}</p>
                              {user.phone && <p>📱 {user.phone}</p>}
                              <p>Created {formatDate(user.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </Section>
      </main>

      {/* Add User Modal */}
      <NewUserModal 
        isOpen={showAddUser}
        onClose={() => setShowAddUser(false)}
        onSuccess={() => {
          // Refresh users list
          const fetchData = async () => {
            try {
              const { data: usersData, error: usersError } = await supabase
                .from('profiles')
                .select(`
                  id, email, first_name, last_name, phone, role, club_id, created_at,
                  clubs(name)
                `)
                .in('role', ['SUPER_ADMIN', 'ADMIN', 'CLUB', 'INSURANCE_PARTNER'])
                .order('created_at', { ascending: false });

              if (!usersError && usersData) {
                setUsers(usersData as UserProfile[]);
              }
            } catch (error) {
              console.error('Error refreshing users:', error);
            }
          };
          fetchData();
        }}
      />

      {/* Edit User Modal */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editFirstName">First Name</Label>
                  <Input
                    id="editFirstName"
                    value={editUser.firstName}
                    onChange={(e) => setEditUser({...editUser, firstName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="editLastName">Last Name</Label>
                  <Input
                    id="editLastName"
                    value={editUser.lastName}
                    onChange={(e) => setEditUser({...editUser, lastName: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed after account creation
                </p>
              </div>

              <div>
                <Label htmlFor="editPhone">Phone</Label>
                <Input
                  id="editPhone"
                  type="tel"
                  value={editUser.phone}
                  onChange={(e) => setEditUser({...editUser, phone: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="editRole">Role</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(value: "SUPER_ADMIN" | "ADMIN" | "CLUB") => setEditUser({...editUser, role: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLUB">Club Manager</SelectItem>
                    <SelectItem value="ADMIN">Administrator</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editUser.role === 'CLUB' && (
                <div>
                  <Label htmlFor="editClub">Assign to Club</Label>
                  <Select
                    value={editUser.clubId}
                    onValueChange={(value) => setEditUser({...editUser, clubId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a club" />
                    </SelectTrigger>
                    <SelectContent>
                      {clubs.map((club) => (
                        <SelectItem key={club.id} value={club.id}>
                          {club.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-primary hover:opacity-90 text-primary-foreground"
                >
                  Update User
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Permission Management Modal */}
      {showPermissionManagement && (
        <Dialog open={showPermissionManagement} onOpenChange={setShowPermissionManagement}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Permission Management</DialogTitle>
            </DialogHeader>
            <PermissionManagement
              userId={permissionUserId}
              userEmail={permissionUserEmail}
              onClose={() => setShowPermissionManagement(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default UserManagement;