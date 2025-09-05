import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Building, Mail, Phone, DollarSign, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/formatters";
import ClubDetailModal from "@/components/admin/ClubDetailModal";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";

interface Club {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  active: boolean;
  created_at: string;
  total_competitions: number;
  total_revenue: number;
  manager_name: string | null;
  manager_email: string | null;
}

const ClubsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [showClubDetail, setShowClubDetail] = useState(false);

  useEffect(() => {
    fetchClubs();
  }, []);

  useEffect(() => {
    const filtered = clubs.filter(club => {
      const search = searchTerm.toLowerCase();
      return club.name.toLowerCase().includes(search) || 
             club.address?.toLowerCase().includes(search) ||
             club.email?.toLowerCase().includes(search);
    });
    setFilteredClubs(filtered);
  }, [clubs, searchTerm]);

  const fetchClubs = async () => {
    try {
      setLoading(true);

      const { data: clubsData, error } = await supabase
        .from('clubs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const clubsWithStats = await Promise.all(
        (clubsData || []).map(async (club) => {
          // Get competitions count
          const { data: competitions, error: competitionsError } = await supabase
            .from('competitions')
            .select('id, entry_fee')
            .eq('club_id', club.id);

          if (competitionsError) {
            console.error('Error fetching competitions for club:', club.id, competitionsError);
          }

          // Get manager details (first club member)
          const { data: managers, error: managersError } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('club_id', club.id)
            .eq('role', 'CLUB')
            .limit(1);

          if (managersError) {
            console.error('Error fetching managers for club:', club.id, managersError);
          }

          // Calculate total revenue from entry fees
          const totalRevenue = competitions?.reduce((sum, comp) => {
            return sum + (parseFloat(comp.entry_fee?.toString() || '0'));
          }, 0) || 0;

          const manager = managers?.[0];
          const managerName = manager ? `${manager.first_name || ''} ${manager.last_name || ''}`.trim() : null;

          return {
            ...club,
            total_competitions: competitions?.length || 0,
            total_revenue: totalRevenue,
            manager_name: managerName || null,
            manager_email: manager?.email || null
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

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <Section className="py-8">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                All Clubs ({clubs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search clubs by name, address, or email..."
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
                      <TableHead>Club Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Competitions</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClubs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? 'No clubs found matching your search.' : 'No clubs found.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClubs.map((club) => (
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
                            <div className="max-w-48 truncate">
                              {club.address || 'No address provided'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {club.manager_name || 'No manager assigned'}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {club.email && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="w-3 h-3 text-muted-foreground" />
                                  <span className="truncate max-w-32">{club.email}</span>
                                </div>
                              )}
                              {club.phone && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="w-3 h-3 text-muted-foreground" />
                                  <span>{club.phone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {club.total_competitions}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              <span className="font-medium">
                                £{club.total_revenue.toFixed(2)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={club.active ? "default" : "outline"}>
                              {club.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>

      <SiteFooter />

      <ClubDetailModal 
        isOpen={showClubDetail}
        onClose={() => setShowClubDetail(false)}
        clubId={selectedClubId}
      />
    </div>
  );
};

export default ClubsPage;