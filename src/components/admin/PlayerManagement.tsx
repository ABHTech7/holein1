import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Users, Search, Filter, Trash2, UserCheck, UserX, Mail, Calendar, Trophy, Hash, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/formatters";

interface Player {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  age_years: number | null;
  handicap: number | null;
  gender: string | null;
  status: string;
  created_at: string;
  last_entry_date?: string;
  total_entries?: number;
  total_spend?: number;
}

interface PlayerManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerManagement = ({ isOpen, onClose }: PlayerManagementProps) => {
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive' | 'incomplete'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPlayer, setDeletingPlayer] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
    }
  }, [isOpen]);

  useEffect(() => {
    filterPlayers();
  }, [players, searchTerm, filterType]);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      // Get players with entry statistics
      const { data, error } = await supabase.rpc('get_admin_players_with_stats', {
        p_limit: 1000,
        p_offset: 0,
        p_search: null
      });

      if (error) throw error;
      setPlayers((data || []).map(player => ({
        ...player,
        age_years: null,
        handicap: null,
        gender: null
      })));
    } catch (error: any) {
      console.error('Error fetching players:', error);
      toast({
        title: 'Error',
        description: 'Failed to load players',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPlayers = () => {
    let filtered = players;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(player =>
        player.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${player.first_name || ''} ${player.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    switch (filterType) {
      case 'active':
        filtered = filtered.filter(player => player.status === 'active');
        break;
      case 'inactive':
        filtered = filtered.filter(player => player.status === 'inactive');
        break;
      case 'incomplete':
        filtered = filtered.filter(player => 
          !player.first_name || !player.last_name || !player.age_years
        );
        break;
    }

    setFilteredPlayers(filtered);
  };

  const handleDeletePlayer = async (playerId: string) => {
    setDeletingPlayer(playerId);
    try {
      const { error } = await supabase.rpc('admin_delete_player', {
        p_player_id: playerId,
        p_reason: 'Deleted via admin player management'
      });

      if (error) throw error;

      toast({
        title: 'Player Deleted',
        description: 'Player and all associated data have been removed',
      });

      // Refresh data
      fetchPlayers();
      setSelectedPlayers(prev => {
        const newSet = new Set(prev);
        newSet.delete(playerId);
        return newSet;
      });
    } catch (error: any) {
      console.error('Error deleting player:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete player',
        variant: 'destructive'
      });
    } finally {
      setDeletingPlayer(null);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const playerIds = Array.from(selectedPlayers);
      
      // Delete players one by one (could be optimized with a bulk function)
      const deletePromises = playerIds.map(playerId => 
        supabase.rpc('admin_delete_player', {
          p_player_id: playerId,
          p_reason: 'Bulk deletion via admin player management'
        })
      );

      const results = await Promise.allSettled(deletePromises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;

      toast({
        title: 'Bulk Deletion Complete',
        description: `Successfully deleted ${successful} players${failed > 0 ? `, ${failed} failed` : ''}`,
        variant: failed > 0 ? 'destructive' : 'default'
      });

      // Refresh data
      fetchPlayers();
      setSelectedPlayers(new Set());
    } catch (error: any) {
      console.error('Error in bulk delete:', error);
      toast({
        title: 'Bulk Delete Failed',
        description: error.message || 'Failed to delete selected players',
        variant: 'destructive'
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleTogglePlayerStatus = async (playerId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const { error } = await supabase.rpc('admin_toggle_user_status', {
        p_user_id: playerId,
        p_active: newStatus === 'active',
        p_reason: `Status changed via player management`
      });

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Player has been ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
      });

      fetchPlayers();
    } catch (error: any) {
      console.error('Error toggling player status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update player status',
        variant: 'destructive'
      });
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPlayers.size === filteredPlayers.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(filteredPlayers.map(player => player.id)));
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <Badge variant="secondary" className="gap-1">
          <UserCheck className="w-3 h-3" />
          Active
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="gap-1">
          <UserX className="w-3 h-3" />
          Inactive
        </Badge>
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Player Management
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Players
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{players.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-green-600" />
                  Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {players.filter(p => p.status === 'active').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserX className="w-4 h-4 text-red-600" />
                  Inactive
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {players.filter(p => p.status === 'inactive').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserX className="w-4 h-4 text-orange-600" />
                  Incomplete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {players.filter(p => !p.first_name || !p.last_name || !p.age_years).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search players by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
                <SelectItem value="incomplete">Incomplete Only</SelectItem>
              </SelectContent>
            </Select>
            {selectedPlayers.size > 0 && (
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteConfirm(true)}
                disabled={bulkDeleting}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedPlayers.size})
              </Button>
            )}
          </div>

          {/* Players Table */}
          <div className="flex-1 overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filteredPlayers.length > 0 && selectedPlayers.size === filteredPlayers.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No players found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlayers.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPlayers.has(player.id)}
                          onCheckedChange={() => togglePlayerSelection(player.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {player.first_name && player.last_name 
                              ? `${player.first_name} ${player.last_name}`
                              : 'Incomplete Name'
                            }
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {player.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(player.status)}
                          <Switch
                            checked={player.status === 'active'}
                            onCheckedChange={() => handleTogglePlayerStatus(player.id, player.status)}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {player.age_years && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {player.age_years} years
                            </div>
                          )}
                          {player.handicap !== null && (
                            <div className="flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              HCP: {player.handicap}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {player.total_entries || 0} entries
                          </div>
                          {player.total_spend && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              £{player.total_spend.toFixed(2)}
                            </div>
                          )}
                          {player.last_entry_date && (
                            <div className="text-xs text-muted-foreground">
                              Last: {formatDate(player.last_entry_date, 'short')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePlayer(player.id)}
                          disabled={deletingPlayer === player.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                          {deletingPlayer === player.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {filteredPlayers.length} of {players.length} players
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchPlayers}>
              Refresh
            </Button>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Bulk Delete Confirmation */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Selected Players</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedPlayers.size} selected player(s)? 
                This will permanently remove all their entries, verifications, claims, and uploaded files. 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {bulkDeleting ? 'Deleting...' : 'Delete Players'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};