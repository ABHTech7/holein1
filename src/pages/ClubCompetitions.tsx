import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import useAuth from '@/hooks/useAuth';

import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import EmptyState from '@/components/ui/empty-state';

import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import Section from '@/components/layout/Section';
import { 
  Calendar, 
  Users, 
  Trophy, 
  Search,
  Plus,
  ArrowLeft,
  Eye
} from 'lucide-react';
import { ROUTES } from '@/routes';
import { showSupabaseError } from '@/lib/showSupabaseError';
import { 
  formatCurrency, 
  formatDate, 
  getCompetitionStatusColor
} from '@/lib/formatters';

interface Profile {
  id: string;
  role: 'ADMIN' | 'CLUB' | 'PLAYER';
  club_id?: string;
}

interface Competition {
  id: string;
  name: string;
  description: string | null;
  hole_number: number;
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED';
  start_date: string;
  end_date: string;
  entry_fee: number;
  commission_amount: number;
  entries_count: number;
  commission_revenue: number;
  created_at: string;
}

const ClubCompetitions = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCompetitions, setFilteredCompetitions] = useState<Competition[]>([]);

  // Fetch user profile and check permissions
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, role, club_id')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        const msg = showSupabaseError(error, 'Failed to load user profile');
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    };

    fetchProfile();
  }, [user, toast]);

  // Fetch competitions data
  useEffect(() => {
    const fetchCompetitions = async () => {
      if (!profile?.club_id) return;

      try {
        // Fetch competitions with entry counts
        const { data: competitionsData, error } = await supabase
          .from('competitions')
          .select(`
            id,
            name,
            description,
            hole_number,
            status,
            start_date,
            end_date,
            entry_fee,
            commission_amount,
            created_at,
            entries:entries(count)
          `)
          .eq('club_id', profile.club_id)
          .eq('archived', false)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Process competitions data with entry counts and commission
        const processedCompetitions = competitionsData?.map(comp => ({
          ...comp,
          entries_count: comp.entries[0]?.count || 0,
          commission_revenue: (comp.entries[0]?.count || 0) * (comp.commission_amount || 0)
        })) || [];

        setCompetitions(processedCompetitions);
        setFilteredCompetitions(processedCompetitions);
      } catch (error) {
        const msg = showSupabaseError(error, 'Failed to load competitions');
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      fetchCompetitions();
    }
  }, [profile, toast]);

  // Filter competitions based on search term
  useEffect(() => {
    const filtered = competitions.filter(competition => {
      const search = searchTerm.toLowerCase();
      return competition.name.toLowerCase().includes(search) || 
             competition.description?.toLowerCase().includes(search);
    });
    setFilteredCompetitions(filtered);
  }, [searchTerm, competitions]);

  // Loading states
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading competitions...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authorized
  if (!user || !profile || profile.role !== 'CLUB') {
    return <Navigate to="/auth" replace />;
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default';
      case 'SCHEDULED': return 'secondary';
      case 'ENDED': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="lg">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Back Button */}
            <Button
              variant="outline"
              onClick={() => navigate(ROUTES.CLUB.DASHBOARD)}
              className="flex items-center gap-2 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">Competitions</h1>
                <p className="text-muted-foreground mt-1">Manage your Official Hole In 1 competitions</p>
              </div>
              
              <Button onClick={() => navigate('/dashboard/club/competition/new')} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Competition
              </Button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search competitions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Competitions Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Your Competitions ({filteredCompetitions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredCompetitions.length === 0 ? (
                  <EmptyState
                    icon={Trophy}
                    title="No competitions found"
                    description={searchTerm ? "No competitions match your search criteria." : "You haven't created any competitions yet."}
                    action={!searchTerm ? {
                      label: "Create Your First Competition",
                      onClick: () => navigate('/dashboard/club/competition/new')
                    } : undefined}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Competition</TableHead>
                        <TableHead>Hole</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>View Entries</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompetitions.map((competition) => (
                        <TableRow key={competition.id}>
                          <TableCell>
                            <div>
                              <button 
                                className="font-medium text-left hover:text-primary cursor-pointer"
                                onClick={() => navigate(ROUTES.DETAIL.COMPETITION_CLUB(competition.id))}
                              >
                                {competition.name}
                              </button>
                              {competition.description && (
                                <div className="text-sm text-muted-foreground">
                                  {competition.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">Hole {competition.hole_number}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(competition.status)}>
                              {competition.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div>{formatDate(competition.start_date)}</div>
                            {competition.end_date && (
                              <div className="text-muted-foreground">
                                to {formatDate(competition.end_date)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(competition.commission_revenue)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/dashboard/club/entries?competition=${competition.id}`)}
                              className="gap-1"
                            >
                              <Users className="w-4 h-4" />
                              Entries ({competition.entries_count})
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </Section>
      </main>
      
      <SiteFooter />
    </div>
  );
};

export default ClubCompetitions;