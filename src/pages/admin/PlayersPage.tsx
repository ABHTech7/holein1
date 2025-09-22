import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { Search, Mail, Calendar, Trophy, ArrowLeft, Phone, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/formatters";
import { showSupabaseError } from "@/lib/showSupabaseError";
import { useAuth } from "@/hooks/useAuth";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import NewUserModal from "@/components/admin/NewUserModal";
import IncompletePlayersModal from "@/components/admin/IncompletePlayersModal";
import { ROUTES } from "@/routes";

interface Player {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  last_entry_date: string | null;
  total_entries: number;
}

const PlayersPage = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewUser, setShowNewUser] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);

  const ITEMS_PER_PAGE = 25;

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    const filtered = players.filter(player => {
      const fullName = `${player.first_name || ''} ${player.last_name || ''}`.toLowerCase();
      const search = searchTerm.toLowerCase();
      return fullName.includes(search) || player.email.toLowerCase().includes(search);
    });
    setFilteredPlayers(filtered);
    // Reset to first page when search changes
    setCurrentPage(1);
  }, [players, searchTerm]);

  const fetchPlayers = async () => {
    try {
      setLoading(true);

      // Development diagnostic logging
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 [PlayersPage.fetchPlayers] Starting players data fetch', {
          userProfile: { 
            role: profile?.role, 
            id: profile?.id, 
            club_id: profile?.club_id 
          },
          operation: 'Fetching players with entry statistics',
          queryParams: { 
            tables: ['profiles', 'entries'],
            filters: { role: 'PLAYER' },
            joins: ['entries (for statistics)'],
            orderBy: 'created_at desc'
          }
        });
      }

      const { data: playersData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          phone,
          created_at
        `)
        .eq('role', 'PLAYER')
        .neq('status', 'deleted')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const playersWithStats = await Promise.all(
        (playersData || []).map(async (player) => {
          const { data: entries, error: entriesError } = await supabase
            .from('entries')
            .select('entry_date')
            .eq('player_id', player.id)
            .order('entry_date', { ascending: false });

          if (entriesError && process.env.NODE_ENV !== 'production') {
            console.error("ADMIN PAGE ERROR:", {
              location: "PlayersPage.fetchPlayers.entries",
              userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
              operation: `Fetching entries for player: ${player.email}`,
              queryParams: { table: 'entries', filters: { player_id: player.id } },
              code: entriesError.code,
              message: entriesError.message,
              details: entriesError.details,
              hint: entriesError.hint,
              fullError: entriesError
            });
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
      // Enhanced error handling with comprehensive logging
      if (process.env.NODE_ENV !== 'production') {
        console.error("ADMIN PAGE ERROR:", {
          location: "PlayersPage.fetchPlayers.general",
          userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
          operation: "General players data fetching operation",
          queryParams: { tables: 'profiles with entries join', operation: 'comprehensive players fetch' },
          code: (error as any)?.code,
          message: (error as any)?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          fullError: error
        });
      }

      const msg = showSupabaseError(error, 'PlayersPage.fetchPlayers');
      toast({ 
        title: "Failed to load players data", 
        description: `${msg}${(error as any)?.code ? ` (Code: ${(error as any).code})` : ''}`, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerClick = (playerId: string) => {
    navigate(`/dashboard/admin/players/${playerId}`);
  };

  const getPlayerName = (player: Player) => {
    if (player.first_name || player.last_name) {
      return `${player.first_name || ''} ${player.last_name || ''}`.trim();
    }
    return 'No name provided';
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPlayers = filteredPlayers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <Section className="py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate(ROUTES.ADMIN.DASHBOARD)}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground border-none"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <Button 
              className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground gap-2 border-none"
              onClick={() => setShowNewUser(true)}
            >
              <Plus className="w-4 h-4" />
              Add New Player
            </Button>
            <Button 
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive border-destructive/20"
              onClick={() => setShowIncompleteModal(true)}
              data-testid="admin-manage-incomplete-btn"
            >
              <Trash2 className="w-4 h-4" />
              Manage Incomplete
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                All Players ({filteredPlayers.length} total, showing {currentPlayers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search players by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

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
                      <TableHead>Mobile</TableHead>
                      <TableHead>Signed Up</TableHead>
                      <TableHead>Last Entry</TableHead>
                      <TableHead>Total Entries</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPlayers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? 'No players found matching your search.' : 'No players found.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentPlayers.map((player) => (
                        <TableRow key={player.id}>
                          <TableCell className="font-medium">
                            <button
                              onClick={() => handlePlayerClick(player.id)}
                              className="text-left hover:text-primary hover:underline focus:outline-none focus:text-primary"
                            >
                              {getPlayerName(player)}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              {player.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              {player.phone || 'Not provided'}
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

              {/* Pagination */}
              {filteredPlayers.length > ITEMS_PER_PAGE && (
                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredPlayers.length)} of {filteredPlayers.length} players
                  </div>
                  
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                          className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {/* First page */}
                      {currentPage > 3 && (
                        <>
                          <PaginationItem>
                            <PaginationLink onClick={() => handlePageChange(1)} className="cursor-pointer">
                              1
                            </PaginationLink>
                          </PaginationItem>
                          {currentPage > 4 && <PaginationEllipsis />}
                        </>
                      )}
                      
                      {/* Pages around current page */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => page >= currentPage - 2 && page <= currentPage + 2)
                        .map(page => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => handlePageChange(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))
                      }
                      
                      {/* Last page */}
                      {currentPage < totalPages - 2 && (
                        <>
                          {currentPage < totalPages - 3 && <PaginationEllipsis />}
                          <PaginationItem>
                            <PaginationLink onClick={() => handlePageChange(totalPages)} className="cursor-pointer">
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        </>
                      )}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                          className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>

      <SiteFooter />

      <NewUserModal 
        isOpen={showNewUser}
        onClose={() => setShowNewUser(false)}
      />

      <IncompletePlayersModal
        isOpen={showIncompleteModal}
        onClose={() => setShowIncompleteModal(false)}
        onPlayersDeleted={fetchPlayers}
      />
    </div>
  );
};

export default PlayersPage;