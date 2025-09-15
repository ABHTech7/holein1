import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Trophy, Calendar, PoundSterling, Users, ArrowLeft, Plus, Archive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { showSupabaseError } from "@/lib/showSupabaseError";
import { useAuth } from "@/hooks/useAuth";
import SiteHeader from "@/components/layout/SiteHeader";
import Section from "@/components/layout/Section";
import { ROUTES } from "@/routes";

interface Competition {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  entry_fee: number;
  status: string;
  club_id: string;
  club_name: string;
  total_entries: number;
  total_revenue: number;
  created_at: string;
  archived: boolean;
  is_year_round: boolean;
}

const CompetitionsPage = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCompetitions, setFilteredCompetitions] = useState<Competition[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchCompetitions();
  }, [showArchived]);

  useEffect(() => {
    const filtered = competitions.filter(competition => {
      const search = searchTerm.toLowerCase();
      return competition.name.toLowerCase().includes(search) || 
             competition.club_name.toLowerCase().includes(search) ||
             competition.description?.toLowerCase().includes(search);
    });
    setFilteredCompetitions(filtered);
  }, [competitions, searchTerm]);

  const fetchCompetitions = async () => {
    try {
      setLoading(true);

      // Development diagnostic logging
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 [CompetitionsPage.fetchCompetitions] Starting competitions data fetch', {
          userProfile: { 
            role: profile?.role, 
            id: profile?.id, 
            club_id: profile?.club_id 
          },
          operation: 'Fetching competitions with club and entry statistics',
          queryParams: { 
            tables: ['competitions', 'clubs', 'entries'],
            filters: { archived: showArchived },
            joins: ['clubs(name)', 'entries(id, paid)']
          }
        });
      }

      const { data: competitionsData, error } = await supabase
        .from('competitions')
        .select(`
          *,
          clubs(name)
        `)
        .eq('archived', showArchived)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const competitionsWithStats = await Promise.all(
        (competitionsData || []).map(async (competition) => {
          // Get entries count and calculate revenue
          const { data: entries, error: entriesError } = await supabase
            .from('entries')
            .select('id, paid')
            .eq('competition_id', competition.id);

          if (entriesError && process.env.NODE_ENV !== 'production') {
            console.error("ADMIN PAGE ERROR:", {
              location: "CompetitionsPage.fetchCompetitions.entries",
              userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
              operation: `Fetching entries for competition: ${competition.name}`,
              queryParams: { table: 'entries', filters: { competition_id: competition.id } },
              code: entriesError.code,
              message: entriesError.message,
              details: entriesError.details,
              hint: entriesError.hint,
              fullError: entriesError
            });
          }

          const totalEntries = entries?.length || 0;
          const paidEntries = entries?.filter(entry => entry.paid).length || 0;
          const totalRevenue = paidEntries * (parseFloat(competition.entry_fee?.toString() || '0'));

          // Calculate dynamic status using the database function approach
          const now = new Date();
          const startDate = new Date(competition.start_date);
          const endDate = competition.end_date ? new Date(competition.end_date) : null;
          
          let dynamicStatus: string;
          if (competition.is_year_round) {
            dynamicStatus = startDate <= now ? 'ACTIVE' : 'SCHEDULED';
          } else if (endDate) {
            if (now < startDate) {
              dynamicStatus = 'SCHEDULED';
            } else if (now >= startDate && now <= endDate) {
              dynamicStatus = 'ACTIVE';
            } else {
              dynamicStatus = 'ENDED';
            }
          } else {
            dynamicStatus = 'ENDED';
          }

          return {
            ...competition,
            club_name: competition.clubs?.name || 'Unknown Club',
            total_entries: totalEntries,
            total_revenue: totalRevenue,
            status: dynamicStatus, // Use calculated status instead of database status
          };
        })
      );

      setCompetitions(competitionsWithStats);
    } catch (error) {
      // Enhanced error handling with comprehensive logging
      if (process.env.NODE_ENV !== 'production') {
        console.error("ADMIN PAGE ERROR:", {
          location: "CompetitionsPage.fetchCompetitions.general",
          userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
          operation: "General competitions data fetching operation",
          queryParams: { tables: 'competitions with joins', operation: 'comprehensive competitions fetch' },
          code: (error as any)?.code,
          message: (error as any)?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          fullError: error
        });
      }

      const errorMessage = showSupabaseError(error, 'CompetitionsPage.fetchCompetitions');
      toast({
        title: "Failed to load competitions data",
        description: `${errorMessage}${(error as any)?.code ? ` (Code: ${(error as any).code})` : ''}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompetitionClick = (competitionId: string) => {
    navigate(`/dashboard/admin/competitions/${competitionId}`);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default';
      case 'SCHEDULED':
        return 'secondary';
      case 'ENDED':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1 bg-muted/30">
        <Section spacing="lg">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate(ROUTES.ADMIN.DASHBOARD)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <h1 className="font-display text-3xl font-bold text-foreground">All Competitions</h1>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant={showArchived ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  {showArchived ? "Hide Archived" : "Show Archived"}
                </Button>
                
                <Button 
                  onClick={() => navigate(ROUTES.ADMIN.COMPETITIONS_NEW)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Competition
                </Button>
              </div>
            </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                All Competitions ({competitions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search competitions by name, club, or description..."
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
                      <TableHead>Competition Name</TableHead>
                      <TableHead>Club</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Entry Fee</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompetitions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? 'No competitions found matching your search.' : 'No competitions found.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCompetitions.map((competition) => (
                        <TableRow key={competition.id}>
                          <TableCell className="font-medium">
                            <button
                              onClick={() => handleCompetitionClick(competition.id)}
                              className="text-left hover:text-primary hover:underline focus:outline-none focus:text-primary"
                            >
                              <div>
                                <div>{competition.name}</div>
                                {competition.description && (
                                  <div className="text-sm text-muted-foreground max-w-48 truncate">
                                    {competition.description}
                                  </div>
                                )}
                              </div>
                            </button>
                          </TableCell>
                          <TableCell>{competition.club_name}</TableCell>
                           <TableCell>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                <span>Start: {formatDate(competition.start_date, 'short')}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                <span>
                                  End: {competition.is_year_round || !competition.end_date ? 'Ongoing' : formatDate(competition.end_date, 'short')}
                                </span>
                              </div>
                              {competition.is_year_round && (
                                <div className="text-xs text-primary font-medium">Year-round</div>
                              )}
                            </div>
                          </TableCell>
                           <TableCell>
                             <div className="flex items-center gap-1">
                               <PoundSterling className="w-4 h-4 text-green-600" />
                               <span>{formatCurrency(competition.entry_fee)}</span>
                             </div>
                           </TableCell>
                           <TableCell>
                             <div className="flex items-center gap-1">
                               <Users className="w-4 h-4 text-muted-foreground" />
                               <span>
                                 {competition.total_entries}
                               </span>
                             </div>
                           </TableCell>
                           <TableCell>
                             <div className="flex items-center gap-1">
                               <PoundSterling className="w-4 h-4 text-green-600" />
                               <span className="font-medium">
                                 {formatCurrency(competition.total_revenue)}
                               </span>
                             </div>
                           </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(competition.status)}>
                              {competition.status}
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
    </main>
    </div>
  );
};

export default CompetitionsPage;