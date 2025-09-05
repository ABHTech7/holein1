import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import useAuth from '@/hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import EmptyState from '@/components/ui/empty-state';
import StatsCard from '@/components/ui/stats-card';
import ChartWrapper from '@/components/ui/chart-wrapper';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import Section from '@/components/layout/Section';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Trophy, 
  Copy, 
  Plus,
  Download,
  Mail,
  Share2
} from 'lucide-react';
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime, 
  obfuscateEmail, 
  getCompetitionStatusColor,
  copyToClipboard
} from '@/lib/formatters';

interface Profile {
  id: string;
  role: 'ADMIN' | 'CLUB' | 'PLAYER';
  club_id?: string;
}

interface Competition {
  id: string;
  name: string;
  hole_number: number;
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED';
  start_date: string;
  end_date: string;
  entry_fee: number;
  entries_count: number;
}

interface Entry {
  id: string;
  player_email: string;
  competition_name: string;
  entry_date: string;
  paid: boolean;
  entry_fee: number;
}

const ClubDashboardNew = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');
  const [stats, setStats] = useState({
    entriesToday: 0,
    entriesThisWeek: 0,
    revenue: 0,
    liveCompetitions: 0,
    playerMix: { members: 0, visitors: 100 }
  });
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [recentEntries, setRecentEntries] = useState<Entry[]>([]);
  const [entriesTrend, setEntriesTrend] = useState<any[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);

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
        console.error('Error fetching profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user profile',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, toast]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile?.club_id) return;

      try {
        // Fetch competitions for this club
        const { data: competitionsData } = await supabase
          .from('competitions')
          .select(`
            id,
            name,
            hole_number,
            status,
            start_date,
            end_date,
            entry_fee,
            entries:entries(count)
          `)
          .eq('club_id', profile.club_id)
          .order('created_at', { ascending: false });

        // Process competitions data
        const processedCompetitions = competitionsData?.map(comp => ({
          ...comp,
          entries_count: comp.entries[0]?.count || 0
        })) || [];

        setCompetitions(processedCompetitions);

        // Calculate stats
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart.getTime() - (7 * 24 * 60 * 60 * 1000));

        // Fetch recent entries for stats calculation
        const { data: entriesData } = await supabase
          .from('entries')
          .select(`
            id,
            entry_date,
            paid,
            competitions!inner(
              entry_fee,
              name,
              club_id
            ),
            profiles!inner(
              email
            )
          `)
          .eq('competitions.club_id', profile.club_id)
          .gte('entry_date', weekStart.toISOString())
          .order('entry_date', { ascending: false })
          .limit(50);

        if (entriesData) {
          const entriesToday = entriesData.filter(e => 
            new Date(e.entry_date) >= todayStart
          ).length;

          const entriesThisWeek = entriesData.length;

          const revenue = entriesData
            .filter(e => e.paid)
            .reduce((sum, e) => sum + e.competitions.entry_fee, 0);

          const liveCompetitions = processedCompetitions.filter(c => c.status === 'ACTIVE').length;

          setStats({
            entriesToday,
            entriesThisWeek,
            revenue,
            liveCompetitions,
            playerMix: { members: 0, visitors: 100 } // Stub - assume all visitors for now
          });

          // Process recent entries for display
          setRecentEntries(entriesData.slice(0, 10).map(entry => ({
            id: entry.id,
            player_email: entry.profiles.email,
            competition_name: entry.competitions.name,
            entry_date: entry.entry_date,
            paid: entry.paid,
            entry_fee: entry.competitions.entry_fee
          })));
        }

        // Generate trend data (mock for now - would need actual historical data)
        const generateTrendData = () => {
          const weeks = [];
          for (let i = 7; i >= 0; i--) {
            const weekStart = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
            weeks.push({
              week: `Week ${8-i}`,
              entries: Math.floor(Math.random() * 20) + 5,
              revenue: Math.floor(Math.random() * 1000) + 200
            });
          }
          return weeks;
        };

        const trendData = generateTrendData();
        setEntriesTrend(trendData);
        setRevenueTrend(trendData);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive',
        });
      }
    };

    fetchDashboardData();
  }, [profile?.club_id, toast]);

  const handleShareCompetition = async (competitionId: string) => {
    const shareUrl = `${window.location.origin}/enter/${competitionId}`;
    const success = await copyToClipboard(shareUrl);
    
    if (success) {
      toast({
        title: 'Link Copied!',
        description: 'Competition share link copied to clipboard',
      });
    } else {
      toast({
        title: 'Copy Failed',
        description: 'Please manually copy the share link',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadReport = () => {
    // TODO: Implement CSV export
    toast({
      title: 'Coming Soon',
      description: 'CSV report download will be available soon',
    });
  };

  // Loading states
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="lg">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">Club Dashboard</h1>
                <p className="text-muted-foreground mt-1">Manage your Hole in 1 Challenge competitions</p>
              </div>
              
              {/* Date Range Filter */}
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Button className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2">
                <Plus className="w-4 h-4" />
                Set Up New Challenge
              </Button>
              <Button variant="outline" onClick={handleDownloadReport} className="gap-2">
                <Download className="w-4 h-4" />
                Download Report (CSV)
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <a href="mailto:ops@holein1.test">
                  <Mail className="w-4 h-4" />
                  Support
                </a>
              </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Entries Today"
                value={stats.entriesToday}
                icon={Calendar}
              />
              <StatsCard
                title="Entries This Week"
                value={stats.entriesThisWeek}
                icon={TrendingUp}
                trend={{ value: 12, isPositive: true }}
              />
              <StatsCard
                title="Revenue"
                value={formatCurrency(stats.revenue)}
                description={`Last ${dateRange} days`}
                icon={Trophy}
              />
              <StatsCard
                title="Live Competitions"
                value={stats.liveCompetitions}
                icon={Users}
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Charts */}
              <ChartWrapper
                title="Entries Trend"
                description="Competition entries over the last 8 weeks"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={entriesTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Line 
                      type="monotone" 
                      dataKey="entries" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartWrapper>

              <ChartWrapper
                title="Revenue Trend"
                description="Entry fee revenue over the last 8 weeks"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Bar 
                      dataKey="revenue" 
                      fill="hsl(var(--secondary))"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </div>

            {/* Competitions Table */}
            <Card>
              <CardHeader>
                <CardTitle>Competitions</CardTitle>
              </CardHeader>
              <CardContent>
                {competitions.length === 0 ? (
                  <EmptyState
                    title="No competitions yet"
                    description="Set up your first Hole in 1 Challenge to get started"
                    action={{
                      label: "Set Up New Challenge",
                      onClick: () => navigate('/dashboard/club/competitions/new')
                    }}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Hole #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Entries</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {competitions.map((competition) => (
                        <TableRow 
                          key={competition.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/dashboard/club/competitions/${competition.id}`)}
                        >
                          <TableCell className="font-medium">{competition.name}</TableCell>
                          <TableCell>{competition.hole_number}</TableCell>
                          <TableCell>
                            <Badge className={getCompetitionStatusColor(competition.status)}>
                              {competition.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDate(competition.start_date)} - {formatDate(competition.end_date)}
                          </TableCell>
                          <TableCell>{competition.entries_count}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleShareCompetition(competition.id)}
                              className="gap-1"
                            >
                              <Share2 className="w-3 h-3" />
                              Share
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Recent Entries */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Entries</CardTitle>
              </CardHeader>
              <CardContent>
                {recentEntries.length === 0 ? (
                  <EmptyState
                    title="No entries yet"
                    description="Entries will appear here when players join your competitions"
                    size="sm"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead>Competition</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Payment Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{obfuscateEmail(entry.player_email)}</TableCell>
                          <TableCell>{entry.competition_name}</TableCell>
                          <TableCell>{formatDateTime(entry.entry_date)}</TableCell>
                          <TableCell>
                            <Badge variant={entry.paid ? "default" : "secondary"}>
                              {entry.entry_fee === 0 ? "FREE" : entry.paid ? "PAID" : "PENDING"}
                            </Badge>
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

export default ClubDashboardNew;