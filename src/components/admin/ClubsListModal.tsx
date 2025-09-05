import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Mail, Phone, Building, PoundSterling } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/formatters";
import ClubDetailModal from "./ClubDetailModal";

interface ClubsListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Club {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  active: boolean;
  created_at: string;
  manager_name: string | null;
  manager_email: string | null;
  total_revenue: number;
  total_competitions: number;
  total_entries: number;
}

const ClubsListModal = ({ isOpen, onClose }: ClubsListModalProps) => {
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [showClubDetail, setShowClubDetail] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchClubs();
    }
  }, [isOpen]);

  useEffect(() => {
    const filtered = clubs.filter(club => {
      const search = searchTerm.toLowerCase();
      return club.name.toLowerCase().includes(search) || 
             (club.address && club.address.toLowerCase().includes(search)) ||
             (club.email && club.email.toLowerCase().includes(search));
    });
    setFilteredClubs(filtered);
  }, [clubs, searchTerm]);

  const fetchClubs = async () => {
    try {
      setLoading(true);

      // Fetch all clubs
      const { data: clubsData, error } = await supabase
        .from('clubs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each club, get their statistics
      const clubsWithStats = await Promise.all(
        (clubsData || []).map(async (club) => {
          // Get club manager (first CLUB role user for this club)
          const { data: manager } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('club_id', club.id)
            .eq('role', 'CLUB')
            .limit(1)
            .single();

          // Get competitions for this club
          const { data: competitions } = await supabase
            .from('competitions')
            .select('id, entry_fee, entries(id)')
            .eq('club_id', club.id);

          // Calculate revenue from paid entries
          const { data: paidEntries } = await supabase
            .from('entries')
            .select(`
              competitions!inner(entry_fee, club_id)
            `)
            .eq('paid', true)
            .eq('competitions.club_id', club.id);

          const totalRevenue = (paidEntries || []).reduce((sum, entry) => {
            const fee = (entry as any).competitions?.entry_fee || 0;
            return sum + fee;
          }, 0);

          const totalCompetitions = competitions?.length || 0;
          const totalEntries = competitions?.reduce((sum, comp) => {
            return sum + ((comp.entries as any[])?.length || 0);
          }, 0) || 0;

          return {
            ...club,
            manager_name: manager ? `${manager.first_name || ''} ${manager.last_name || ''}`.trim() : null,
            manager_email: manager?.email || null,
            total_revenue: totalRevenue,
            total_competitions: totalCompetitions,
            total_entries: totalEntries
          };
        })
      );

      setClubs(clubsWithStats);
    } catch (error) {
      console.error('Error fetching clubs:', error);
      toast({
        title: "Error",
        description: "Failed to load clubs data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClubClick = (clubId: string) => {
    setSelectedClubId(clubId);
    setShowClubDetail(true);
  };

  const parseAddress = (address: string | null) => {
    if (!address) return { town: 'N/A', postcode: 'N/A' };
    
    // Simple parsing - assumes format includes town and postcode
    const parts = address.split(',').map(part => part.trim());
    const postcode = parts[parts.length - 1];
    const town = parts.length > 2 ? parts[parts.length - 2] : parts[0];
    
    return {
      town: town || 'N/A',
      postcode: postcode || 'N/A'
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            All Clubs ({clubs.length})
          </DialogTitle>
        </DialogHeader>

        <div className="flex-shrink-0 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search clubs by name, address, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-3 border rounded">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Club Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Competitions</TableHead>
                  <TableHead>Total Entries</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClubs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No clubs found matching your search.' : 'No clubs found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClubs.map((club) => {
                    const { town, postcode } = parseAddress(club.address);
                    return (
                      <TableRow key={club.id}>
                        <TableCell className="font-medium">
                          <button
                            onClick={() => handleClubClick(club.id)}
                            className="text-left hover:text-primary hover:underline focus:outline-none focus:text-primary"
                          >
                            {club.name}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <div className="text-sm">
                              <div>{town}</div>
                              <div className="text-muted-foreground">{postcode}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {club.manager_name || 'No manager assigned'}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {club.manager_email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                {club.manager_email}
                              </div>
                            )}
                            {club.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                {club.phone}
                              </div>
                            )}
                            {!club.manager_email && !club.phone && (
                              <span className="text-muted-foreground text-sm">No contact info</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <PoundSterling className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{formatCurrency(club.total_revenue)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {club.total_competitions}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {club.total_entries}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={club.active ? "default" : "destructive"}>
                            {club.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
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

      {/* Club Details Modal */}
      <ClubDetailModal 
        isOpen={showClubDetail}
        onClose={() => setShowClubDetail(false)}
        clubId={selectedClubId}
      />
    </Dialog>
  );
};

export default ClubsListModal;