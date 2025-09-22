import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Users, Crown, Building, UserCheck, Trash2, Search, Filter, UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/formatters';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CLUB' | 'PLAYER';
  club_id?: string;
  created_at: string;
  club_name?: string;
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserManagementModal = ({ isOpen, onClose }: UserManagementModalProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'incomplete' | 'complete'>('all');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, email, first_name, last_name, role, club_id, created_at,
          clubs(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithClubs = data.map(user => ({
        ...user,
        club_name: (user.clubs as any)?.name || null
      }));

      setUsers(usersWithClubs);
      setFilteredUsers(usersWithClubs);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search and filter type
  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply completion filter
    if (filterType === 'incomplete') {
      filtered = filtered.filter(user => 
        !user.first_name || !user.last_name || user.first_name.trim() === '' || user.last_name.trim() === ''
      );
    } else if (filterType === 'complete') {
      filtered = filtered.filter(user => 
        user.first_name && user.last_name && user.first_name.trim() !== '' && user.last_name.trim() !== ''
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterType]);

  const updateUserRole = async (userId: string, newRole: 'SUPER_ADMIN' | 'ADMIN' | 'CLUB' | 'PLAYER') => {
    setUpdating(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      toast({
        title: 'Role Updated',
        description: `User role changed to ${newRole}`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive'
      });
    } finally {
      setUpdating(null);
    }
  };

  const deleteUser = async (userId: string) => {
    setDeleting(userId);
    try {
      // First delete the user's profile (cascade will handle related data)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error('Profile deletion error:', profileError);
        // Continue with auth deletion even if profile deletion fails
      }

      // Then delete from Supabase Auth using admin API
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        console.error('Auth deletion error:', authError);
        throw authError;
      }

      // Update local state
      setUsers(users.filter(user => user.id !== userId));
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });

      toast({
        title: 'User Deleted',
        description: 'User and all associated data have been removed',
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive'
      });
    } finally {
      setDeleting(null);
    }
  };

  const bulkDeleteUsers = async () => {
    if (selectedUsers.size === 0) return;

    setLoading(true);
    try {
      const userIds = Array.from(selectedUsers);
      
      // Delete profiles first (batch operation)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .in('id', userIds);

      if (profileError) {
        console.error('Bulk profile deletion error:', profileError);
      }

      // Delete from auth one by one (no bulk delete available)
      const deletePromises = userIds.map(userId => 
        supabase.auth.admin.deleteUser(userId)
      );

      const results = await Promise.allSettled(deletePromises);
      
      // Count successful deletions
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;

      // Update local state (remove all selected users)
      setUsers(users.filter(user => !selectedUsers.has(user.id)));
      setSelectedUsers(new Set());

      toast({
        title: 'Bulk Deletion Complete',
        description: `Successfully deleted ${successful} users${failed > 0 ? `, ${failed} failed` : ''}`,
        variant: failed > 0 ? 'destructive' : 'default'
      });
    } catch (error: any) {
      console.error('Error in bulk delete:', error);
      toast({
        title: 'Bulk Delete Failed',
        description: error.message || 'Failed to delete selected users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)));
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Crown className="w-4 h-4" />;
      case 'CLUB':
        return <Building className="w-4 h-4" />;
      case 'PLAYER':
        return <UserCheck className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'CLUB':
        return 'default';
      case 'PLAYER':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-muted/50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-foreground">
                {users.filter(u => u.role === 'ADMIN').length}
              </div>
              <div className="text-sm text-muted-foreground">Admins</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-foreground">
                {users.filter(u => u.role === 'CLUB').length}
              </div>
              <div className="text-sm text-muted-foreground">Club Managers</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-foreground">
                {users.filter(u => u.role === 'PLAYER').length}
              </div>
              <div className="text-sm text-muted-foreground">Players</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-destructive">
                {users.filter(u => !u.first_name || !u.last_name || u.first_name.trim() === '' || u.last_name.trim() === '').length}
              </div>
              <div className="text-sm text-muted-foreground">Incomplete</div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={(value: 'all' | 'incomplete' | 'complete') => setFilterType(value)}>
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
              {selectedUsers.size > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      Delete ({selectedUsers.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Selected Users</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {selectedUsers.size} selected user(s) and all their associated data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={bulkDeleteUsers} className="bg-destructive hover:bg-destructive/90">
                        Delete Users
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all users"
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      {users.length === 0 ? 'No users found' : 'No users match the current filters'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                          aria-label={`Select ${user.first_name} ${user.last_name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground">
                            {user.first_name || 'No first name'} {user.last_name || 'No last name'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(!user.first_name || !user.last_name || user.first_name.trim() === '' || user.last_name.trim() === '') ? (
                          <Badge variant="destructive" className="gap-1">
                            <UserX className="w-3 h-3" />
                            Incomplete
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <UserCheck className="w-3 h-3" />
                            Complete
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleVariant(user.role)} className="gap-1">
                          {getRoleIcon(user.role)}
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {user.club_name || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(user.created_at, 'short')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={user.role}
                            onValueChange={(value: 'ADMIN' | 'CLUB' | 'PLAYER') => 
                              updateUserRole(user.id, value)
                            }
                            disabled={updating === user.id}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="CLUB">Club</SelectItem>
                              <SelectItem value="PLAYER">Player</SelectItem>
                            </SelectContent>
                          </Select>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="w-8 h-8 p-0"
                                disabled={deleting === user.id}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete {user.first_name} {user.last_name} ({user.email}) and all their associated data. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteUser(user.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={fetchUsers} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserManagementModal;