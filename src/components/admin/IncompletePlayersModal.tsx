import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, AlertTriangle, Calendar, Mail, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/formatters";
import { showSupabaseError } from "@/lib/showSupabaseError";

interface IncompletePlayer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  has_success_payment: boolean;
  has_paid_entry: boolean;
  onboarding_complete: boolean;
}

interface IncompletePlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayersDeleted?: () => void;
}

const IncompletePlayersModal = ({ isOpen, onClose, onPlayersDeleted }: IncompletePlayersModalProps) => {
  const [players, setPlayers] = useState<IncompletePlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deletionResults, setDeletionResults] = useState<{ deleted: number; skipped: number; errors: string[] } | null>(null);

  // Feature flag for soft delete
  const softDeleteEnabled = import.meta.env.VITE_SOFT_DELETE_PLAYERS !== 'false';

  useEffect(() => {
    if (isOpen) {
      fetchIncompleteUsers();
      setSelectedPlayers(new Set());
      setDeletionResults(null);
    }
  }, [isOpen]);

  const fetchIncompleteUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_incomplete_players');
      
      if (error) throw error;
      
      setPlayers(data || []);
    } catch (error: any) {
      console.error('Error fetching incomplete players:', error);
      toast({
        title: "Error loading incomplete players",
        description: showSupabaseError(error, 'fetch incomplete players'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPlayers(new Set(players.map(p => p.id)));
    } else {
      setSelectedPlayers(new Set());
    }
  };

  const handleSelectPlayer = (playerId: string, checked: boolean) => {
    const newSelected = new Set(selectedPlayers);
    if (checked) {
      newSelected.add(playerId);
    } else {
      newSelected.delete(playerId);
    }
    setSelectedPlayers(newSelected);
  };

  const getPlayerName = (player: IncompletePlayer) => {
    if (player.first_name || player.last_name) {
      return `${player.first_name || ''} ${player.last_name || ''}`.trim();
    }
    return 'No name provided';
  };

  const isPlayerDeletable = (player: IncompletePlayer) => {
    // Player is deletable if they have no success payments AND no paid entries
    return !player.has_success_payment && !player.has_paid_entry;
  };

  const getDeletionReason = (player: IncompletePlayer) => {
    if (player.has_success_payment) return 'has successful payment';
    if (player.has_paid_entry) return 'has paid entry';
    return '';
  };

  const handleDelete = async () => {
    if (selectedPlayers.size === 0) return;

    try {
      setDeleting(true);
      const results = { deleted: 0, skipped: 0, errors: [] as string[] };
      
      for (const playerId of selectedPlayers) {
        const player = players.find(p => p.id === playerId);
        if (!player) continue;

        if (!isPlayerDeletable(player)) {
          results.skipped++;
          continue;
        }

        try {
          const { data, error } = await supabase.functions.invoke('admin-delete-incomplete-user', {
            body: { 
              user_id: playerId,
              reason: 'Admin bulk deletion of incomplete players'
            }
          });

          if (error) throw error;
          
          if (data?.success) {
            results.deleted++;
            
            // Show freed email message if email was freed for reuse
            if (data.freed_email) {
              console.log(`[IncompletePlayersModal] Email freed for reuse: ${player.email}`);
            }
          } else {
            results.skipped++;
            results.errors.push(`${player.email}: ${data?.error || 'Unknown error'}`);
          }
        } catch (error: any) {
          results.errors.push(`${player.email}: ${error.message}`);
        }
      }

      setDeletionResults(results);
      
      // Show result toast
      if (results.deleted > 0) {
        toast({
          title: `Deleted ${results.deleted} player(s)`,
          description: `${results.deleted} email(s) freed for re-use` + (results.skipped > 0 ? ` • Skipped ${results.skipped} player(s)` : ''),
        });
      }

      if (results.errors.length > 0) {
        toast({
          title: "Some deletions failed",
          description: `${results.errors.length} error(s) occurred`,
          variant: "destructive"
        });
      }

      // Refresh data and notify parent
      await fetchIncompleteUsers();
      setSelectedPlayers(new Set());
      onPlayersDeleted?.();

    } catch (error: any) {
      console.error('Bulk deletion error:', error);
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const deletableCount = Array.from(selectedPlayers).filter(id => {
    const player = players.find(p => p.id === id);
    return player && isPlayerDeletable(player);
  }).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Manage Incomplete Players
            {softDeleteEnabled && (
              <Badge variant="outline" className="text-xs">
                Soft Delete Mode
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-3 border rounded">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No incomplete players found</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={selectedPlayers.size === players.length && players.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    Select All ({selectedPlayers.size} of {players.length} selected)
                  </span>
                </div>
                {selectedPlayers.size > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {deletableCount} can be deleted, {selectedPlayers.size - deletableCount} will be skipped
                  </div>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead className="w-20">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player) => {
                    const isDeletable = isPlayerDeletable(player);
                    const reason = getDeletionReason(player);
                    
                    return (
                      <TableRow key={player.id} className={!isDeletable ? 'opacity-60' : ''} data-testid={`incomplete-player-row-${player.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPlayers.has(player.id)}
                            onCheckedChange={(checked) => handleSelectPlayer(player.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {getPlayerName(player)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            {player.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {formatDate(player.created_at, 'short')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {!player.onboarding_complete && (
                              <Badge variant="outline" className="text-xs">Incomplete Profile</Badge>
                            )}
                            {!player.has_paid_entry && (
                              <Badge variant="outline" className="text-xs">No Entries</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {!isDeletable && (
                            <div className="flex items-center gap-1 text-xs text-amber-600">
                              <AlertTriangle className="w-3 h-3" />
                              {reason}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!isDeletable}
                            className={isDeletable ? "text-destructive hover:text-destructive" : ""}
                            data-testid="delete-incomplete-btn"
                            onClick={() => {
                              setSelectedPlayers(new Set([player.id]));
                              // The delete action will be triggered by the AlertDialog
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {players.length} incomplete players found
            {deletionResults && (
              <span className="ml-4">
                Last operation: {deletionResults.deleted} deleted, {deletionResults.skipped} skipped
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            
            {selectedPlayers.size > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting || deletableCount === 0} data-testid="incomplete-delete-selected">
                    {deleting ? 'Deleting...' : `Delete Selected (${deletableCount})`}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {deletableCount} incomplete player(s)?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will {softDeleteEnabled ? 'soft delete' : 'permanently delete'} {deletableCount} player(s). 
                      {selectedPlayers.size - deletableCount > 0 && ` ${selectedPlayers.size - deletableCount} player(s) will be skipped due to successful payments or completed entries.`}
                      {!softDeleteEnabled && ' This action cannot be undone.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="confirm-delete-btn">
                      {softDeleteEnabled ? 'Soft Delete' : 'Permanently Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncompletePlayersModal;