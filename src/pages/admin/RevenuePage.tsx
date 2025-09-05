import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, PoundSterling, Building, Users, TrendingUp, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "@/hooks/use-toast";
import ClubDetailModal from "@/components/admin/ClubDetailModal";
import SiteHeader from "@/components/layout/SiteHeader";
import Section from "@/components/layout/Section";

interface ClubRevenue {
  id: string;
  name: string;
  total_revenue: number;
  total_competitions: number;
  total_entries: number;
  paid_entries: number;
  average_entry_fee: number;
}

const RevenuePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clubRevenues, setClubRevenues] = useState<ClubRevenue[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClubRevenues, setFilteredClubRevenues] = useState<ClubRevenue[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [showClubDetail, setShowClubDetail] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  useEffect(() => {
    const filtered = clubRevenues.filter(club => {
      const search = searchTerm.toLowerCase();
      return club.name.toLowerCase().includes(search);
    });
    setFilteredClubRevenues(filtered);
  }, [clubRevenues, searchTerm]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);

      // Get all clubs
      const { data: clubs, error: clubsError } = await supabase
        .from('clubs')
        .select('id, name')
        .eq('active', true);

      if (clubsError) throw clubsError;

      const clubRevenueData = await Promise.all(
        (clubs || []).map(async (club) => {
          // Get all competitions for this club
          const { data: competitions, error: competitionsError } = await supabase
            .from('competitions')
            .select('id, entry_fee')
            .eq('club_id', club.id);

          if (competitionsError) {
            console.error('Error fetching competitions for club:', club.id, competitionsError);
            return {
              id: club.id,
              name: club.name,
              total_revenue: 0,
              total_competitions: 0,
              total_entries: 0,
              paid_entries: 0,
              average_entry_fee: 0
            };
          }

          // Get all entries for competitions of this club
          const competitionIds = competitions?.map(c => c.id) || [];
          let totalEntries = 0;
          let paidEntries = 0;
          let totalRevenue = 0;

          if (competitionIds.length > 0) {
            const { data: entries, error: entriesError } = await supabase
              .from('entries')
              .select('paid, competition_id')
              .in('competition_id', competitionIds);

            if (entriesError) {
              console.error('Error fetching entries for club:', club.id, entriesError);
            } else {
              totalEntries = entries?.length || 0;
              paidEntries = entries?.filter(entry => entry.paid).length || 0;

              // Calculate revenue by matching entries to competition fees
              entries?.forEach(entry => {
                if (entry.paid) {
                  const competition = competitions?.find(c => c.id === entry.competition_id);
                  if (competition) {
                    totalRevenue += parseFloat(competition.entry_fee?.toString() || '0');
                  }
                }
              });
            }
          }

          const averageEntryFee = competitions?.length > 0 
            ? competitions.reduce((sum, comp) => sum + parseFloat(comp.entry_fee?.toString() || '0'), 0) / competitions.length
            : 0;

          return {
            id: club.id,
            name: club.name,
            total_revenue: totalRevenue,
            total_competitions: competitions?.length || 0,
            total_entries: totalEntries,
            paid_entries: paidEntries,
            average_entry_fee: averageEntryFee
          };
        })
      );

      const sortedClubRevenue = clubRevenueData.sort((a, b) => b.total_revenue - a.total_revenue);
      setClubRevenues(sortedClubRevenue);
      
      const grandTotal = sortedClubRevenue.reduce((sum, club) => sum + club.total_revenue, 0);
      setTotalRevenue(grandTotal);

    } catch (error) {
      console.error('Error fetching revenue data:', error);
      toast({
        title: "Error",
        description: "Failed to load revenue data.",
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

          {/* Revenue Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                  </div>
                  <PoundSterling className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Clubs</p>
                    <p className="text-2xl font-bold">{clubRevenues.length}</p>
                  </div>
                  <Building className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Revenue per Club</p>
                     <p className="text-2xl font-bold">
                       {clubRevenues.length > 0 ? formatCurrency(totalRevenue / clubRevenues.length) : formatCurrency(0)}
                     </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Competitions</p>
                    <p className="text-2xl font-bold">
                      {clubRevenues.reduce((sum, club) => sum + club.total_competitions, 0)}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PoundSterling className="w-5 h-5" />
                Revenue by Club
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search clubs by name..."
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
                        <TableHead>Total Revenue</TableHead>
                        <TableHead>Competitions</TableHead>
                        <TableHead>Total Entries</TableHead>
                        <TableHead>Avg Entry Fee</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {filteredClubRevenues.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? 'No clubs found matching your search.' : 'No revenue data found.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClubRevenues.map((club) => (
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
                             <div className="flex items-center gap-1 font-semibold text-green-600">
                               <PoundSterling className="w-4 h-4" />
                               {formatCurrency(club.total_revenue)}
                             </div>
                          </TableCell>
                          <TableCell>{club.total_competitions}</TableCell>
                          <TableCell>{club.total_entries}</TableCell>
                          <TableCell>{formatCurrency(club.average_entry_fee)}</TableCell>
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

      <ClubDetailModal 
        isOpen={showClubDetail}
        onClose={() => setShowClubDetail(false)}
        clubId={selectedClubId}
      />
    </div>
  );
};

export default RevenuePage;