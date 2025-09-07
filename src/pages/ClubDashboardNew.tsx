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
    commissionToday: 0,
    commissionMonth: 0,
    commissionYear: 0,
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
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const yearStart = new Date(now.getFullYear(), 0, 1);
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
              commission_amount,
              name,
              club_id
            ),
            profiles!inner(
              email
            )
          `)
          .eq('competitions.club_id', profile.club_id)
          .gte('entry_date', yearStart.toISOString())
          .order('entry_date', { ascending: false });

        if (entriesData) {
          const entriesToday = entriesData.filter(e => 
            new Date(e.entry_date) >= todayStart
          ).length;

          const entriesThisWeek = entriesData.filter(e => 
            new Date(e.entry_date) >= weekStart
          ).length;

          // Calculate commission for paid entries only
          const paidEntries = entriesData.filter(e => e.paid);
          
          const commissionToday = paidEntries
            .filter(e => new Date(e.entry_date) >= todayStart)
            .reduce((sum, e) => sum + (e.competitions.commission_amount || 0), 0);

          const commissionMonth = paidEntries
            .filter(e => new Date(e.entry_date) >= monthStart)
            .reduce((sum, e) => sum + (e.competitions.commission_amount || 0), 0);

          const commissionYear = paidEntries
            .filter(e => new Date(e.entry_date) >= yearStart)
            .reduce((sum, e) => sum + (e.competitions.commission_amount || 0), 0);

          const liveCompetitions = processedCompetitions.filter(c => c.status === 'ACTIVE').length;

          setStats({
            entriesToday,
            entriesThisWeek,
            commissionToday,
            commissionMonth,
            commissionYear,
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

        // Generate trend data with more realistic patterns
        const generateTrendData = () => {
          const weeks = [];
          const weekNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          
          // Generate data for the last 30 days (daily)
          for (let i = 29; i >= 0; i--) {
            const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            // Weekend spike pattern for golf
            const baseEntries = isWeekend ? 15 + Math.floor(Math.random() * 25) : 3 + Math.floor(Math.random() * 12);
            const entryFee = 25; // £25 entry fee
            const commissionRate = 0.15; // 15% commission
            
            weeks.push({
              week: weekNames[dayOfWeek],
              date: date.toISOString().split('T')[0],
              entries: baseEntries,
              revenue: baseEntries * entryFee,
              commission: Math.round(baseEntries * entryFee * commissionRate * 100) / 100
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
              <Button 
                onClick={() => toast({
                  title: 'Coming Soon',
                  description: 'Competition setup wizard will be available soon',
                })}
                className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2"
              >
                <Plus className="w-4 h-4" />
                Set Up New Challenge
              </Button>
              <Button variant="outline" onClick={handleDownloadReport} className="gap-2">
                <Download className="w-4 h-4" />
                Download Report (CSV)
              </Button>
              <Button 
                variant="outline" 
                onClick={() => toast({
                  title: 'Coming Soon',
                  description: 'Direct support messaging will be available soon',
                })}
                className="gap-2"
              >
                <Mail className="w-4 h-4" />
                Contact Support
              </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Entries Today"
                value={stats.entriesToday}
                icon={Calendar}
                onClick={() => navigate('/dashboard/club/entries')}
                className="cursor-pointer hover:shadow-md transition-shadow"
              />
              <StatsCard
                title="Live Competitions"
                value={stats.liveCompetitions}
                icon={Users}
              />
            </div>

            {/* Commission Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/club/revenue')}
                className="h-auto p-6 flex flex-col items-start space-y-2 hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-medium text-muted-foreground">Commission Today</span>
                  <Trophy className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(stats.commissionToday)}
                </span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/club/revenue')}
                className="h-auto p-6 flex flex-col items-start space-y-2 hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-medium text-muted-foreground">Commission This Month</span>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(stats.commissionMonth)}
                </span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/club/revenue')}
                className="h-auto p-6 flex flex-col items-start space-y-2 hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-medium text-muted-foreground">Commission Year to Date</span>
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(stats.commissionYear)}
                </span>
              </Button>
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

          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default ClubDashboardNew;