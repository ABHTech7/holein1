import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import { 
  Trophy, 
  Target, 
  Calendar, 
  Clock, 
  PoundSterling, 
  Play,
  Eye,
  MapPin,
  TrendingUp,
  Award
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import useAuth from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/formatters";

interface DashboardData {
  recentEntries: Array<{
    id: string;
    entry_date: string;
    status: string;
    outcome_self: string | null;
    competition: {
      id: string;
      name: string;
      hole_number: number;
      entry_fee: number;
      club: { name: string; };
    };
  }>;
  activeCompetitions: Array<{
    id: string;
    name: string;
    hole_number: number;
    entry_fee: number;
    prize_pool: number | null;
    start_date: string;
    end_date: string | null;
    club_id: string;
    club: { name: string; };
    venue: { slug: string; };
  }>;
  stats: {
    totalEntries: number;
    activeEntries: number;
    completedEntries: number;
    totalSpent: number;
    winCount: number;
    winRate: number;
  };
  upcomingDeadlines: Array<{
    entryId: string;
    competitionName: string;
    attemptWindowEnd: string;
  }>;
}

const PlayerDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch recent entries
      const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select(`
          id,
          entry_date,
          status,
          outcome_self,
          paid,
          attempt_window_end,
          competition:competitions(
            id,
            name,
            hole_number,
            entry_fee,
            club:clubs(name),
            venues!inner(slug)
          )
        `)
        .eq('player_id', user.id)
        .order('entry_date', { ascending: false })
        .limit(5);

      if (entriesError) throw entriesError;

      // Fetch active competitions nearby (simplified - could use geolocation)
      const { data: competitions, error: competitionsError } = await supabase
        .from('competitions')
        .select(`
          id,
          name,
          hole_number,
          entry_fee,
          prize_pool,
          start_date,
          end_date,
          club_id,
          club:clubs(name)
        `)
        .eq('status', 'ACTIVE')
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(6);


      // Get venue slugs for each competition
      const competitionsWithVenues = [];
      if (competitions) {
        for (const comp of competitions) {
          const { data: venue } = await supabase
            .from('venues')
            .select('slug')
            .eq('club_id', comp.club_id)
            .single();
          
          competitionsWithVenues.push({
            ...comp,
            venue: { slug: venue?.slug || '' }
          });
        }
      }

      if (competitionsError) throw competitionsError;

      // Get all user entries for stats calculation
      const { data: allEntries, error: allEntriesError } = await supabase
        .from('entries')
        .select(`
          id,
          paid,
          outcome_self,
          competition:competitions(entry_fee),
          claims!left(status)
        `)
        .eq('player_id', user.id);

      if (allEntriesError) throw allEntriesError;

      // Calculate stats
      const totalEntries = allEntries?.length || 0;
      const paidEntries = allEntries?.filter(e => e.paid) || [];
      const completedEntries = allEntries?.filter(e => e.outcome_self) || [];
      const totalSpent = paidEntries.reduce((sum, entry) => 
        sum + (entry.competition?.entry_fee || 0), 0);
      
      // Count wins (entries with approved claims)
      const winCount = allEntries?.filter(entry => 
        entry.claims?.some((claim: any) => claim.status === 'APPROVED')
      ).length || 0;
      
      const winRate = completedEntries.length > 0 ? 
        Math.round((winCount / completedEntries.length) * 100) : 0;

      // Find upcoming deadlines (entries with attempt windows ending soon)
      const upcomingDeadlines = entries
        ?.filter(entry => 
          entry.attempt_window_end && 
          new Date(entry.attempt_window_end) > new Date() &&
          !entry.outcome_self
        )
        .map(entry => ({
          entryId: entry.id,
          competitionName: entry.competition?.name || 'Unknown',
          attemptWindowEnd: entry.attempt_window_end
        }))
        .slice(0, 3) || [];

      setData({
        recentEntries: entries || [],
        activeCompetitions: competitionsWithVenues || [],
        stats: {
          totalEntries,
          activeEntries: paidEntries.filter(e => !e.outcome_self).length,
          completedEntries: completedEntries.length,
          totalSpent,
          winCount,
          winRate
        },
        upcomingDeadlines
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error Loading Dashboard",
        description: "Unable to load dashboard data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatTimeRemaining = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const remaining = Math.max(0, end.getTime() - now.getTime());
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m`;
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Welcome Section */}
        <Section spacing="lg" className="bg-gradient-to-br from-primary/5 to-primary/10">
          <Container>
            <div className="text-center mb-8">
              <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
                Welcome back, {profile?.first_name || 'Golfer'}!
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Track your progress, discover new challenges, and chase that perfect shot
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/20">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl md:text-3xl font-bold text-foreground">{data?.stats.totalEntries || 0}</p>
                      <p className="text-sm text-muted-foreground">Total Entries</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/20">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                      <Award className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl md:text-3xl font-bold text-foreground">{data?.stats.winCount || 0}</p>
                      <p className="text-sm text-muted-foreground">Wins</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/20">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl md:text-3xl font-bold text-foreground">{data?.stats.winRate || 0}%</p>
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/20">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                      <PoundSterling className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl md:text-3xl font-bold text-foreground">{formatCurrency(data?.stats.totalSpent || 0)}</p>
                      <p className="text-sm text-muted-foreground">Invested</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Container>
        </Section>

        {/* Main Dashboard Content */}
        <Section spacing="lg">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Recent Activity & Deadlines */}
              <div className="lg:col-span-2 space-y-8">
                {/* Upcoming Deadlines */}
                {data?.upcomingDeadlines && data.upcomingDeadlines.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-amber-800 dark:text-amber-200">
                        <Clock className="w-5 h-5" />
                        <span>Urgent: Active Attempts</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.upcomingDeadlines.map((deadline) => (
                          <div key={deadline.entryId} className="flex items-center justify-between p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg">
                            <div>
                              <p className="font-medium text-amber-900 dark:text-amber-100">{deadline.competitionName}</p>
                              <p className="text-sm text-amber-700 dark:text-amber-300">
                                Time remaining: {formatTimeRemaining(deadline.attemptWindowEnd)}
                              </p>
                            </div>
                            <Button 
                              size="sm" 
                              asChild
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              <Link to={`/entry/${deadline.entryId}/confirmation`}>
                                Complete Now
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Entries */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Trophy className="w-5 h-5 text-primary" />
                      <span>Recent Entries</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data?.recentEntries && data.recentEntries.length > 0 ? (
                      <div className="space-y-4">
                        {data.recentEntries.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                            <div className="flex-1">
                              <h4 className="font-medium">{entry.competition?.name}</h4>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center space-x-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>{entry.competition?.club?.name}</span>
                                </span>
                                <span>Hole {entry.competition?.hole_number}</span>
                                <span>{formatDateTime(entry.entry_date)}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              {entry.outcome_self ? (
                                <Badge 
                                  variant={entry.outcome_self === 'win' ? 'default' : 'secondary'}
                                  className={entry.outcome_self === 'win' ? 'bg-green-500 hover:bg-green-600' : ''}
                                >
                                  {entry.outcome_self === 'win' ? 'Win Claimed' : 'Missed'}
                                </Badge>
                              ) : (
                                <Badge variant="outline">In Progress</Badge>
                              )}
                              <Button size="sm" variant="outline" asChild>
                                <Link to={`/entry/${entry.id}/confirmation`}>
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="pt-4 border-t">
                          <Button variant="outline" asChild className="w-full">
                            <Link to="/entries">View All Entries</Link>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">No entries yet. Ready to take your first shot?</p>
                        <Button asChild className="bg-gradient-primary hover:opacity-90">
                          <Link to="/">Browse Competitions</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Active Competitions */}
              <div className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Play className="w-5 h-5 text-primary" />
                      <span>Active Competitions</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data?.activeCompetitions && data.activeCompetitions.length > 0 ? (
                      <div className="space-y-4">
                        {data.activeCompetitions.map((competition) => (
                          <div key={competition.id} className="p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                            <h4 className="font-medium mb-2">{competition.name}</h4>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center space-x-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>{competition.club?.name}</span>
                                </span>
                                <span>Hole {competition.hole_number}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Entry: {formatCurrency(competition.entry_fee)}</span>
                                {competition.prize_pool && (
                                  <span className="text-green-600 font-medium">
                                    Prize: {formatCurrency(competition.prize_pool)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full mt-3 bg-gradient-primary hover:opacity-90" 
                              asChild
                            >
                              <Link to={`/enter/${competition.venue?.slug}/${competition.hole_number}`}>
                                Enter Now
                              </Link>
                            </Button>
                          </div>
                        ))}
                        <div className="pt-4 border-t">
                          <Button variant="outline" asChild className="w-full">
                            <Link to="/">Browse All Competitions</Link>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">No active competitions found</p>
                        <Button variant="outline" asChild>
                          <Link to="/">Explore Competitions</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default PlayerDashboard;