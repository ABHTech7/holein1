import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Mail, Phone, Calendar, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/formatters";

interface PlayersListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Player {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  last_entry_date: string | null;
  total_entries: number;
}

const PlayersListModal = ({ isOpen, onClose }: PlayersListModalProps) => {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
    }
  }, [isOpen]);

  useEffect(() => {
    const filtered = players.filter(player => {
      const fullName = `${player.first_name || ''} ${player.last_name || ''}`.toLowerCase();
      const search = searchTerm.toLowerCase();
      return fullName.includes(search) || player.email.toLowerCase().includes(search);
    });
    setFilteredPlayers(filtered);
  }, [players, searchTerm]);

  const fetchPlayers = async () => {
    try {
      setLoading(true);

      // Fetch all players with their entry statistics
      const { data: playersData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          created_at
        `)
        .eq('role', 'PLAYER')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each player, get their entry statistics
      const playersWithStats = await Promise.all(
        (playersData || []).map(async (player) => {
          const { data: entries, error: entriesError } = await supabase
            .from('entries')
            .select('entry_date')
            .eq('player_id', player.id)
            .order('entry_date', { ascending: false });

          if (entriesError) {
            console.error('Error fetching entries for player:', player.id, entriesError);
          }

          const totalEntries = entries?.length || 0;
          const lastEntryDate = entries && entries.length > 0 ? entries[0].entry_date : null;

          return {
            ...player,
            total_entries: totalEntries,
            last_entry_date: lastEntryDate
          };
        })
      );

      setPlayers(playersWithStats);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast({
        title: "Error",
        description: "Failed to load players data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlayerName = (player: Player) => {
    if (player.first_name || player.last_name) {
      return `${player.first_name || ''} ${player.last_name || ''}`.trim();
    }
    return 'No name provided';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            All Players ({players.length})
          </DialogTitle>
        </DialogHeader>

        <div className="flex-shrink-0 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search players by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-3 border rounded">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Signed Up</TableHead>
                  <TableHead>Last Entry</TableHead>
                  <TableHead>Total Entries</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No players found matching your search.' : 'No players found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlayers.map((player) => (
                    <TableRow key={player.id}>
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
                        {player.last_entry_date ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {formatDate(player.last_entry_date, 'short')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {player.total_entries}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={player.total_entries > 0 ? "default" : "outline"}>
                          {player.total_entries > 0 ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayersListModal;