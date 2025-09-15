import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Building, Mail, Phone, PoundSterling, ArrowLeft, Archive, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";
import { showSupabaseError } from "@/lib/showSupabaseError";
import { useAuth } from "@/hooks/useAuth";
import SiteHeader from "@/components/layout/SiteHeader";
import Section from "@/components/layout/Section";
import NewClubModal from "@/components/admin/NewClubModal";
import { ROUTES } from "@/routes";

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
  total_commission: number;
  manager_name: string | null;
  manager_email: string | null;
}

const ClubsPage = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [showNewClubModal, setShowNewClubModal] = useState(false);

  useEffect(() => {
    fetchClubs();
  }, [showArchived]);

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

      // Development diagnostic logging
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 [ClubsPage.fetchClubs] Starting clubs data fetch', {
          userProfile: { 
            role: profile?.role, 
            id: profile?.id, 
            club_id: profile?.club_id 
          },
          operation: 'Fetching clubs with competitions, entries, and manager statistics',
          queryParams: { 
            tables: ['clubs', 'competitions', 'entries', 'profiles'],
            filters: { archived: showArchived },
            joins: ['competitions -> entries (revenue calc)', 'profiles (managers)']
          }
        });
      }

      const { data: clubsData, error } = await supabase
        .from('clubs')
        .select(`
          id, name, address, email, phone, website, logo_url,
          active, created_at, updated_at, archived, contract_signed
        `)
        .eq('archived', showArchived)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const clubsWithStats = await Promise.all(
        (clubsData || []).map(async (club) => {
          // Get competitions with their commission amounts
          const { data: competitions, error: competitionsError } = await supabase
            .from('competitions')
            .select('id, entry_fee, commission_amount')
            .eq('club_id', club.id);

          if (competitionsError && process.env.NODE_ENV !== 'production') {
            console.error("ADMIN PAGE ERROR:", {
              location: "ClubsPage.fetchClubs.competitions",
              userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
              operation: `Fetching competitions for club: ${club.name}`,
              queryParams: { table: 'competitions', filters: { club_id: club.id } },
              code: competitionsError.code,
              message: competitionsError.message,
              details: competitionsError.details,
              hint: competitionsError.hint,
              fullError: competitionsError
            });
          }

          // Get manager details (first club member)
          const { data: managers, error: managersError } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('club_id', club.id)
            .eq('role', 'CLUB')
            .limit(1);

          if (managersError && process.env.NODE_ENV !== 'production') {
            console.error("ADMIN PAGE ERROR:", {
              location: "ClubsPage.fetchClubs.managers",
              userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
              operation: `Fetching managers for club: ${club.name}`,
              queryParams: { table: 'profiles', filters: { club_id: club.id, role: 'CLUB' } },
              code: managersError.code,
              message: managersError.message,
              details: managersError.details,
              hint: managersError.hint,
              fullError: managersError
            });
          }

          // Calculate total revenue and commission from actual paid entries
          let totalRevenue = 0;
          let totalCommission = 0;

          if (competitions) {
            const revenuePromises = competitions.map(async (competition) => {
              const { data: entries, error: entriesError } = await supabase
                .from('entries')
                .select('id, paid')
                .eq('competition_id', competition.id);

              if (entriesError && process.env.NODE_ENV !== 'production') {
                console.error("ADMIN PAGE ERROR:", {
                  location: "ClubsPage.fetchClubs.entries",
                  userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
                  operation: `Fetching entries for competition: ${competition.id}`,
                  queryParams: { table: 'entries', filters: { competition_id: competition.id } },
                  code: entriesError.code,
                  message: entriesError.message,
                  details: entriesError.details,
                  hint: entriesError.hint,
                  fullError: entriesError
                });
                return { revenue: 0, commission: 0 };
              }

              const paidEntries = entries?.filter(entry => entry.paid).length || 0;
              const entryFee = parseFloat(competition.entry_fee?.toString() || '0');
              const commissionAmount = parseFloat(competition.commission_amount?.toString() || '0');

              const competitionRevenue = paidEntries * entryFee;
              const competitionCommission = paidEntries * commissionAmount;

              return {
                revenue: competitionRevenue,
                commission: competitionCommission
              };
            });

            const results = await Promise.all(revenuePromises);
            totalRevenue = results.reduce((sum, result) => sum + result.revenue, 0);
            totalCommission = results.reduce((sum, result) => sum + result.commission, 0);
          }

          const manager = managers?.[0];
          const managerName = manager ? `${manager.first_name || ''} ${manager.last_name || ''}`.trim() : null;

          return {
            ...club,
            total_competitions: competitions?.length || 0,
            total_revenue: totalRevenue,
            total_commission: totalCommission,
            manager_name: managerName || null,
            manager_email: manager?.email || null
          };
        })
      );

      setClubs(clubsWithStats);
    } catch (error) {
      // Enhanced error handling with comprehensive logging
      if (process.env.NODE_ENV !== 'production') {
        console.error("ADMIN PAGE ERROR:", {
          location: "ClubsPage.fetchClubs.general",
          userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
          operation: "General clubs data fetching operation",
          queryParams: { tables: 'clubs with nested joins', operation: 'comprehensive clubs fetch' },
          code: (error as any)?.code,
          message: (error as any)?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          fullError: error
        });
      }

      const msg = showSupabaseError(error, 'ClubsPage.fetchClubs');
      toast({ 
        title: "Failed to load clubs data", 
        description: `${msg}${(error as any)?.code ? ` (Code: ${(error as any).code})` : ''}`, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClubClick = (clubId: string) => {
    navigate(`/dashboard/admin/clubs/${clubId}`);
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
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setShowNewClubModal(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add New Club
                </Button>
                
                <Button 
                  variant={showArchived ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  {showArchived ? "Hide Archived" : "Show Archived"}
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  {showArchived ? 'Archived' : 'Active'} Clubs ({clubs.length})
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
                        <TableHead>Commission</TableHead>
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
                                <PoundSterling className="w-4 h-4 text-green-600" />
                                <span className="font-medium">
                                  {formatCurrency(club.total_revenue)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <PoundSterling className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-blue-600">
                                  {formatCurrency(club.total_commission)}
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

      <NewClubModal 
        isOpen={showNewClubModal}
        onClose={() => setShowNewClubModal(false)}
        onSuccess={() => fetchClubs()}
      />
    </div>
  );
};

export default ClubsPage;