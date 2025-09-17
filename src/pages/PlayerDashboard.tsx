import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import { Hero, HeroTitle, HeroSubtitle } from "@/components/ui/hero";
import { PlayerGreeting } from "@/components/ui/player-greeting";
import { 
  Trophy, 
  Target, 
  Calendar, 
  Clock, 
  PoundSterling,
  TrendingUp,
  Bell,
  Play
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import useAuth from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/formatters";

// Data structures
interface DashboardEntry {
  id: string;
  entry_date: string;
  attempt_window_end: string | null;
  outcome_self: string | null;
  competition: {
    id: string;
    name: string;
    entry_fee: number;
    clubs: {
      name: string;
    };
  };
}

interface ActiveCompetition {
  id: string;
  name: string;
  entry_fee: number;
  end_date: string | null;
  is_year_round: boolean;
  clubs: {
    name: string;
  };
}

interface DashboardStats {
  totalEntries: number;
  wins: number;
  winRate: number;
  totalSpent: number;
}

interface UpcomingDeadline {
  id: string;
  competition_name: string;
  venue_name: string;
  attempt_window_end: string;
  time_remaining: number;
}

interface DashboardData {
  recentEntries: DashboardEntry[];
  activeCompetitions: ActiveCompetition[];
  stats: DashboardStats;
  upcomingDeadlines: UpcomingDeadline[];
}

const PlayerDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
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
          attempt_window_end,
          outcome_self,
          competition:competitions(
            id,
            name,
            entry_fee,
            clubs:clubs(name)
          )
        `)
        .eq('player_id', user.id)
        .order('entry_date', { ascending: false })
        .limit(5);

      if (entriesError) throw entriesError;

      // Fetch active competitions (simplified)
      const { data: competitions, error: competitionsError } = await supabase
        .from('competitions')
        .select(`
          id,
          name,
          entry_fee,
          end_date,
          is_year_round,
          clubs:clubs(name)
        `)
        .eq('status', 'ACTIVE')
        .limit(4);

      if (competitionsError) throw competitionsError;

      // Calculate stats
      const allEntries = entries || [];
      const stats: DashboardStats = {
        totalEntries: allEntries.length,
        wins: allEntries.filter(entry => entry.outcome_self === 'win').length,
        winRate: allEntries.length > 0 ? 
          (allEntries.filter(entry => entry.outcome_self === 'win').length / allEntries.length) * 100 : 0,
        totalSpent: allEntries.reduce((sum, entry) => sum + (entry.competition?.entry_fee || 0), 0)
      };

      // Mock upcoming deadlines (would need to enhance entries schema for real data)
      const upcomingDeadlines: UpcomingDeadline[] = allEntries
        .filter(entry => entry.attempt_window_end && new Date(entry.attempt_window_end) > new Date())
        .map(entry => ({
          id: entry.id,
          competition_name: entry.competition?.name || 'Unknown',
          venue_name: entry.competition?.clubs?.name || 'Unknown Venue',
          attempt_window_end: entry.attempt_window_end!,
          time_remaining: new Date(entry.attempt_window_end!).getTime() - new Date().getTime()
        }))
        .sort((a, b) => a.time_remaining - b.time_remaining)
        .slice(0, 3);

      setDashboardData({
        recentEntries: allEntries,
        activeCompetitions: competitions || [],
        stats,
        upcomingDeadlines
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error loading dashboard",
        description: "Unable to load your dashboard data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amountMinor: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amountMinor / 100);
  };

  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Dashboard Unavailable</h2>
            <p className="text-muted-foreground mb-4">Unable to load your dashboard data</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
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
        {/* Hero Section with Personalized Greeting */}
        <Hero>
          <Container>
            <div className="text-center">
              {/* Dynamic Player Greeting */}
              {user && profile?.first_name && (
                <PlayerGreeting 
                  firstName={profile.first_name} 
                  variant="hero"
                  className="mb-4"
                />
              )}
              
              <HeroTitle>Your Golf Journey</HeroTitle>
              <HeroSubtitle className="max-w-2xl mx-auto">
                Track your progress, view active challenges, and chase that perfect shot
              </HeroSubtitle>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 max-w-4xl mx-auto">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Entries</p>
                        <p className="text-2xl font-bold text-foreground">{dashboardData.stats.totalEntries}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                        <Target className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Wins</p>
                        <p className="text-2xl font-bold text-foreground">{dashboardData.stats.wins}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                        <p className="text-2xl font-bold text-foreground">{dashboardData.stats.winRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <PoundSterling className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Invested</p>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(dashboardData.stats.totalSpent)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Button asChild size="lg" className="bg-gradient-primary hover:opacity-90" data-testid="browse-competitions-btn">
                  <Link to="/competitions">
                    <Play className="w-4 h-4 mr-2" />
                    Browse Competitions
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" data-testid="player-dashboard-btn">
                  <Link to="/players/entries">My Dashboard</Link>
                </Button>
              </div>
            </div>
          </Container>
        </Hero>

        {/* Main Dashboard Content */}
        <Section spacing="lg">
          <Container>
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column: Urgent & Recent */}
              <div className="space-y-8">
                {/* Urgent: Active Attempts */}
                {dashboardData.upcomingDeadlines.length > 0 && (
                  <Card className="shadow-medium border-amber-200 dark:border-amber-800">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                        <Bell className="w-5 h-5" />
                        <span>Urgent: Active Attempts</span>
                      </CardTitle>
                      <CardDescription>Complete these attempts before time runs out</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {dashboardData.upcomingDeadlines.map((deadline) => (
                          <div
                            key={deadline.id}
                            className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                          >
                            <div>
                              <p className="font-medium text-foreground">{deadline.competition_name}</p>
                              <p className="text-sm text-muted-foreground">{deadline.venue_name}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400">
                                {formatTimeRemaining(deadline.time_remaining)} left
                              </Badge>
                              <Button 
                                asChild 
                                size="sm" 
                                className="mt-2 w-full bg-amber-600 hover:bg-amber-700"
                              >
                                <Link to={`/entry/${deadline.id}/confirmation`}>Complete Now</Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Entries */}
                <Card className="shadow-medium">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-accent" />
                      <span>Recent Entries</span>
                    </CardTitle>
                    <CardDescription>Your latest competition activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dashboardData.recentEntries.length === 0 ? (
                      <div className="text-center py-8">
                        <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No entries yet</p>
                        <Button asChild className="mt-4" size="sm">
                          <Link to="/competitions">Enter Your First Competition</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dashboardData.recentEntries.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{entry.competition.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {entry.competition.clubs.name} • {formatDateTime(entry.entry_date)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {entry.outcome_self === 'win' && (
                                <Badge className="bg-accent text-accent-foreground">Won! 🏆</Badge>
                              )}
                              {entry.outcome_self === 'miss' && (
                                <Badge variant="secondary">Missed</Badge>
                              )}
                              {!entry.outcome_self && (
                                <Badge variant="outline">In Progress</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Active Competitions */}
              <div>
                <Card className="shadow-medium">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Trophy className="w-5 h-5 text-primary" />
                      <span>Active Competitions</span>
                    </CardTitle>
                    <CardDescription>Available competitions you can enter</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dashboardData.activeCompetitions.length === 0 ? (
                      <div className="text-center py-8">
                        <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No active competitions</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {dashboardData.activeCompetitions.map((competition) => (
                          <Card key={competition.id} className="border">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold mb-1">{competition.name}</h4>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {competition.clubs.name}
                                  </p>
                                  <div className="flex items-center space-x-4 text-sm">
                                    <span className="flex items-center space-x-1">
                                      <PoundSterling className="w-3 h-3" />
                                      <span>{formatCurrency(competition.entry_fee)}</span>
                                    </span>
                                    {competition.is_year_round ? (
                                      <Badge variant="outline">Year-round</Badge>
                                    ) : (
                                      <Badge variant="outline">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Limited time
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <Button asChild size="sm">
                                  <Link to={`/enter/${competition.id}`}>Enter</Link>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        <Button asChild variant="outline" className="w-full">
                          <Link to="/competitions">View All Competitions</Link>
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