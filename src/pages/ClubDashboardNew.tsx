import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { showSupabaseError } from '@/lib/showSupabaseError';
import useAuth from '@/hooks/useAuth';
import { ROUTES } from '@/routes';

import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import EmptyState from '@/components/ui/empty-state';
import StatsCard from '@/components/ui/stats-card';

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
  Share2,
  CreditCard,
  PoundSterling
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
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, toast]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      const clubId = profile?.club_id;
      if (!clubId) {
        console.warn('No club_id found in profile, skipping dashboard data fetch');
        return;
      }

      try {
        // Fetch competitions for this club (with basic club info from first competition)
        const { data: comps, error: compsErr } = await supabase
          .from('competitions')
          .select('id, status, start_date, end_date, name, hole_number, entry_fee')
          .eq('club_id', clubId);
          
        if (compsErr) throw compsErr;
        const compIds = (comps || []).map(c => c.id);

        // Process competitions data
        const processedCompetitions = (comps || []).map(comp => ({
          ...comp,
          entries_count: 0 // Will be calculated separately
        }));

        // Calculate stats with resilient queries
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const yearStart = new Date(now.getFullYear(), 0, 1);

        // Entries today count (use count head; fallback to minimal select)
        let entriesToday = 0;
        try {
          let { count, error } = await supabase
            .from('entries')
            .select('id', { count: 'exact', head: true })
            .in('competition_id', compIds)
            .gte('entry_date', todayStart.toISOString())
            .lte('entry_date', now.toISOString());

          if (error) {
            const { data, error: fallbackError } = await supabase
              .from('entries')
              .select('id')
              .in('competition_id', compIds)
              .gte('entry_date', todayStart.toISOString())
              .lte('entry_date', now.toISOString());
            if (fallbackError) throw fallbackError;
            entriesToday = data?.length ?? 0;
          } else {
            entriesToday = count ?? 0;
          }
        } catch (error) {
          console.warn('Failed to get entries today, defaulting to 0:', error);
          entriesToday = 0;
        }

        // Commission/revenue tiles with fallbacks
        let commissionToday = 0, commissionMonth = 0, commissionYTD = 0;
        try {
          // Try to get commission data from paid entries
          const { data: paidEntries, error: revenueError } = await supabase
            .from('entries')
            .select(`
              entry_date, paid,
              competitions!inner(commission_amount, club_id)
            `)
            .eq('competitions.club_id', clubId)
            .eq('paid', true);
            
          if (revenueError) {
            console.warn('Revenue data unavailable:', revenueError);
          } else if (paidEntries) {
            commissionToday = paidEntries
              .filter(e => new Date(e.entry_date) >= todayStart)
              .reduce((sum, e) => sum + (e.competitions.commission_amount || 0), 0);

            commissionMonth = paidEntries
              .filter(e => new Date(e.entry_date) >= monthStart)
              .reduce((sum, e) => sum + (e.competitions.commission_amount || 0), 0);

            commissionYTD = paidEntries
              .filter(e => new Date(e.entry_date) >= yearStart)
              .reduce((sum, e) => sum + (e.competitions.commission_amount || 0), 0);
          }
        } catch (e) {
          console.warn('Revenue summary unavailable, skipping:', e);
        }

        // Live competitions count: simple client logic
        const liveCompetitions = processedCompetitions.filter(c => c.status === 'ACTIVE').length;

        // Fetch recent entries for display (optional, non-critical)
        let recentEntries: Entry[] = [];
        try {
          const { data: entriesData } = await supabase
            .from('entries')
            .select(`
              id, entry_date, paid,
              profiles(email),
              competitions!inner(name, entry_fee, club_id)
            `)
            .eq('competitions.club_id', clubId)
            .order('entry_date', { ascending: false })
            .limit(10);
            
          if (entriesData) {
            recentEntries = entriesData.map(entry => ({
              id: entry.id,
              player_email: entry.profiles?.email || 'unknown@email.com',
              competition_name: entry.competitions?.name || 'Unknown',
              entry_date: entry.entry_date,
              paid: entry.paid,
              entry_fee: entry.competitions?.entry_fee || 0
            }));
          }
        } catch (e) {
          console.warn('Recent entries unavailable:', e);
        }
        
        // Set state even if some queries failed - show available data
        setCompetitions(processedCompetitions);
        setStats({
          entriesToday,
          entriesThisWeek: 0, // Not calculated in this version
          commissionToday,
          commissionMonth,
          commissionYear: commissionYTD,
          liveCompetitions,
          playerMix: { members: 0, visitors: 100 }
        });
        setRecentEntries(recentEntries);


      } catch (error) {
        const msg = showSupabaseError(error, 'Club dashboard load');
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      }
    };

    fetchDashboardData();
  }, [profile?.club_id, toast]);

  const handleShareCompetition = async (competitionId: string) => {
    // Import the function dynamically since it's not imported at the top
    const { generateCompetitionEntryUrl } = await import('@/lib/competitionUtils');
    const entryUrl = await generateCompetitionEntryUrl(competitionId);
    
    const shareUrl = entryUrl 
      ? `${window.location.origin}${entryUrl}`
      : `${window.location.origin}/enter/${competitionId}`;
    
    const success = await copyToClipboard(shareUrl);
    
    if (success) {
      toast({
        title: 'Link copied',
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
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">Club Dashboard</h1>
                <p className="text-muted-foreground mt-1">Manage your Hole in 1 Challenge competitions</p>
              </div>
              
              {/* Club Info - Use profile.club_id for minimal display */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-primary flex items-center justify-center border border-border/20">
                  <Trophy className="w-6 h-6 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Club Dashboard</h2>
              </div>
              
              {/* Date Range Filter */}
              <div className="flex justify-end">
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
              <Button
                variant="outline"
                onClick={() => navigate(ROUTES.CLUB.REVENUE)}
                className="gap-2"
                data-testid="club-revenue-card"
              >
                <PoundSterling className="w-4 h-4" />
                Revenue & Payments
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(ROUTES.CLUB.BANKING)}
                className="gap-2"
                data-testid="club-banking-card-btn"
              >
                <CreditCard className="w-4 h-4" />
                Banking Details
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
                onClick={() => navigate(ROUTES.CLUB.ENTRIES)}
                className="cursor-pointer hover:shadow-md transition-shadow"
                data-testid="club-entries-card"
              />
              <StatsCard
                title="Live Competitions"
                value={stats.liveCompetitions}
                icon={Users}
                onClick={() => navigate(ROUTES.CLUB.COMPETITIONS)}
                className="cursor-pointer hover:shadow-md transition-shadow"
                data-testid="club-competitions-card"
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
                  {formatCurrency(Math.round(stats.commissionToday))}
                </span>
              </Button>
              
               <Button
                variant="outline"
                onClick={() => navigate(ROUTES.CLUB.REVENUE)}
                className="h-auto p-6 flex flex-col items-start space-y-2 hover:bg-accent transition-colors"
                data-testid="club-revenue-card"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-medium text-muted-foreground">Commission This Month</span>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(Math.round(stats.commissionMonth))}
                </span>
              </Button>
              
               <Button
                variant="outline"
                onClick={() => navigate(ROUTES.CLUB.REVENUE)}
                className="h-auto p-6 flex flex-col items-start space-y-2 hover:bg-accent transition-colors"
                data-testid="club-revenue-month-card"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-medium text-muted-foreground">Commission Year to Date</span>
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(Math.round(stats.commissionYear))}
                </span>
              </Button>
            </div>


          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default ClubDashboardNew;