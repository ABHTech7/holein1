import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { Search, Mail, Calendar, Trophy, ArrowLeft, Phone, Plus, Trash2, Eye, AlertCircle, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/formatters";
import { showSupabaseError } from "@/lib/showSupabaseError";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import NewUserModal from "@/components/admin/NewUserModal";
import IncompletePlayersModal from "@/components/admin/IncompletePlayersModal";
import PlayerDetailModal from "@/components/admin/PlayerDetailModal";
import { ROUTES } from "@/routes";

interface Player {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  age_years: number | null;
  handicap: number | null;
  gender: string | null;
  club_name?: string;
  club_id?: string;
  role: string;
  created_at: string;
  status: string;
  entry_count: number;
  last_entry_date: string | null;
  total_count: number;
}

const PlayersPage = () => {
  const navigate = useNavigate();
  const { profile, session, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewUser, setShowNewUser] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const ITEMS_PER_PAGE = 25;

  // Fetch players using the secure RPC function
  const fetchPlayers = async () => {
    // Hard gate: Only proceed when auth is fully ready
    if (!session || !profile || authLoading || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
      console.log('[PlayersPage] fetchPlayers blocked - auth not ready:', {
        hasSession: !!session,
        hasProfile: !!profile,
        authLoading,
        role: profile?.role
      });
      return;
    }

    try {
      setLoading(true);
      
      // Use the secure RPC function to get players with stats (returns array)
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const { data, error } = await supabase
        .rpc('get_admin_players_with_stats', {
          p_limit: ITEMS_PER_PAGE,
          p_offset: offset,
          p_search: searchTerm || null
        })
        .throwOnError();

      setPlayers(data || []);
      
      // Use the total_count from the first row to calculate pagination
      const totalCount = data?.[0]?.total_count || 0;
      setTotalPages(Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE)));
      
    } catch (error: any) {
      // Explicit handling for "Cannot coerce" / PGRST116 errors
      if (error?.code === 'PGRST116' || error?.message?.includes('Cannot coerce')) {
        console.warn('[PlayersPage] Session not ready, skipping fetch:', error);
        toast({ 
          title: "Session not ready yet", 
          description: "Please wait a moment and try again",
          variant: "default"
        });
        return;
      }

      const msg = showSupabaseError(error, 'PlayersPage.fetchPlayers');
      toast({ 
        title: "Failed to load players data", 
        description: msg, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (!selectedPlayer) return;

    setDeleting(true);
    try {
      const { data, error } = await supabase.rpc('admin_delete_player', {
        p_player_id: selectedPlayer.id,
        p_reason: 'Manual deletion via admin interface'
      });

      if (error) throw error;

      toast({
        title: "Player Deleted",
        description: `${selectedPlayer.first_name} ${selectedPlayer.last_name} and all related data have been deleted.`,
      });

      // Refresh the players list
      fetchPlayers();
      setShowDeleteModal(false);
      setSelectedPlayer(null);
    } catch (error: any) {
      console.error('Error deleting player:', error);
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete player",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Debounced fetch with hard gate
  useEffect(() => {
    // Only trigger when auth is fully ready
    if (!authLoading && session && profile && ['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
      // Debounce by 250ms to avoid double-calls on rapid state changes
      const timeoutId = setTimeout(() => {
        fetchPlayers();
      }, 250);

      return () => clearTimeout(timeoutId);
    }
  }, [authLoading, session?.user?.id, profile?.role, currentPage, searchTerm]);

  useEffect(() => {
    // Reset to first page when search changes
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm]);

  const getPlayerName = (player: Player) => {
    if (player.first_name || player.last_name) {
      return `${player.first_name || ''} ${player.last_name || ''}`.trim();
    }
    return 'No name provided';
  };

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <Section className="py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </Section>
      </div>
    );
  }

  // Show access denied if not admin
  if (!profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <Section className="py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
              <p className="text-muted-foreground">You need admin privileges to access this page.</p>
            </div>
          </div>
        </Section>
      </div>
    );
  }

  const handlePlayerClick = (playerId: string) => {
    navigate(`/dashboard/admin/players/${playerId}`);
  };

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
                All Players ({players?.[0]?.total_count || 0} total{players.length > 0 ? `, showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, players?.[0]?.total_count || 0)}` : ''})
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
                    {players.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? 'No players found matching your search.' : 'No players found.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      players.map((player) => (
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
                              {player.entry_count}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={player.entry_count > 0 ? "default" : "outline"}>
                                {player.entry_count > 0 ? "Active" : "Inactive"}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPlayer(player);
                                  setShowPlayerModal(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedPlayer(player);
                                  setShowDeleteModal(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
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

      <PlayerDetailModal
        isOpen={showPlayerModal}
        onClose={() => setShowPlayerModal(false)}
        playerId={selectedPlayer?.id}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Player
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">
                {selectedPlayer?.first_name} {selectedPlayer?.last_name}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">
                  This action cannot be undone
                </p>
                <p className="text-sm text-muted-foreground">
                  This will permanently delete the player and all related data including:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• All competition entries</li>
                  <li>• Verification records</li>
                  <li>• Claims and evidence</li>
                  <li>• Uploaded files</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePlayer}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayersPage;