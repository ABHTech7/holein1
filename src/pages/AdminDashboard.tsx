import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import SiteHeader from "@/components/layout/SiteHeader";
import Section from "@/components/layout/Section";
import StatsCard from "@/components/ui/stats-card";
import ChartWrapper from "@/components/ui/chart-wrapper";
import SiteSettingsModal from "@/components/admin/SiteSettingsModal";
import NewUserModal from "@/components/admin/NewUserModal";
import AdminQuickActions from "@/components/admin/AdminQuickActions";
import { Users, Calendar, Trophy, TrendingUp, Plus, Settings, PoundSterling } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/formatters";
import { showSupabaseError } from "@/lib/showSupabaseError";
import { ROUTES } from "@/routes";

interface DashboardStats {
  totalPlayers: number;
  newPlayersThisMonth: number;
  totalClubs: number;
  activeCompetitions: number;
  todayRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
}

interface Competition {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  entry_count: number;
  club_name: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showSiteSettings, setShowSiteSettings] = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalPlayers: 0,
    newPlayersThisMonth: 0,
    totalClubs: 0,
    activeCompetitions: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0
  });
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [membershipData, setMembershipData] = useState<Array<{month: string, members: number}>>([]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Get current dates for revenue calculations
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

        // Fetch basic stats with proper error handling
        const [playersRes, newPlayersRes, clubsRes, activeCompsRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'PLAYER'),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'PLAYER').gte('created_at', monthStart),
          supabase.from('clubs').select('id', { count: 'exact', head: true }),
          supabase.from('competitions').select('id, name, status').eq('status', 'ACTIVE')
        ]);

        // Fetch revenue data for different periods
        const [todayEntriesRes, monthlyEntriesRes, yearlyEntriesRes] = await Promise.all([
          // Today's revenue
          supabase
            .from('entries')
            .select(`
              entry_date,
              paid,
              competitions!inner(entry_fee)
            `)
            .eq('paid', true)
            .gte('entry_date', today)
            .lt('entry_date', tomorrow),
          
          // Month-to-date revenue
          supabase
            .from('entries')
            .select(`
              entry_date,
              paid,
              competitions!inner(entry_fee)
            `)
            .eq('paid', true)
            .gte('entry_date', monthStart),
          
          // Year-to-date revenue
          supabase
            .from('entries')
            .select(`
              entry_date,
              paid,
              competitions!inner(entry_fee)
            `)
            .eq('paid', true)
            .gte('entry_date', yearStart)
        ]);

        // Log any errors for debugging
        if (playersRes.error) console.error('Players query error:', showSupabaseError(playersRes.error, 'fetchDashboardData players'));
        if (newPlayersRes.error) console.error('New players query error:', showSupabaseError(newPlayersRes.error, 'fetchDashboardData newPlayers'));
        if (clubsRes.error) console.error('Clubs query error:', showSupabaseError(clubsRes.error, 'fetchDashboardData clubs'));
        if (activeCompsRes.error) console.error('Active competitions error:', showSupabaseError(activeCompsRes.error, 'fetchDashboardData activeComps'));
        if (todayEntriesRes.error) console.error('Today entries query error:', showSupabaseError(todayEntriesRes.error, 'fetchDashboardData todayEntries'));
        if (monthlyEntriesRes.error) console.error('Monthly entries query error:', showSupabaseError(monthlyEntriesRes.error, 'fetchDashboardData monthlyEntries'));
        if (yearlyEntriesRes.error) console.error('Yearly entries query error:', showSupabaseError(yearlyEntriesRes.error, 'fetchDashboardData yearlyEntries'));

        // Calculate revenue for different periods
        const todayRevenue = (todayEntriesRes.data || []).reduce((sum, entry) => {
          const fee = (entry as any).competitions?.entry_fee || 0;
          return sum + fee;
        }, 0);

        const monthlyRevenue = (monthlyEntriesRes.data || []).reduce((sum, entry) => {
          const fee = (entry as any).competitions?.entry_fee || 0;
          return sum + fee;
        }, 0);

        const yearlyRevenue = (yearlyEntriesRes.data || []).reduce((sum, entry) => {
          const fee = (entry as any).competitions?.entry_fee || 0;
          return sum + fee;
        }, 0);

        setStats({
          totalPlayers: playersRes.count || 0,
          newPlayersThisMonth: newPlayersRes.count || 0,
          totalClubs: clubsRes.count || 0,
          activeCompetitions: activeCompsRes.data?.length || 0,
          todayRevenue: todayRevenue,
          monthlyRevenue: monthlyRevenue,
          yearlyRevenue: yearlyRevenue
        });

        // Fetch recent competitions with entry counts and club info
        const { data: recentComps, error: compsError } = await supabase
          .from('competitions')
          .select(`
            id, name, start_date, end_date, status, entry_fee,
            clubs(name),
            entries(id)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (compsError) {
          console.error('Recent competitions query error:', showSupabaseError(compsError, 'fetchDashboardData recentComps'));
        }

        if (recentComps) {
          setCompetitions(recentComps.map(comp => ({
            id: comp.id,
            name: comp.name,
            start_date: comp.start_date,
            end_date: comp.end_date,
            status: comp.status,
            entry_count: (comp.entries as any[])?.length || 0,
            club_name: (comp.clubs as any)?.name || 'Unknown Club'
          })));
        }

        // Generate last 4 months new player registrations data
        const membershipTrendData = [];
        for (let i = 3; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthName = monthDate.toLocaleDateString('en-GB', { month: 'short' });
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString();
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
          
          // Get actual new players for this specific month
          const { count: monthlyCount, error: monthlyPlayersError } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'PLAYER')
            .gte('created_at', monthStart)
            .lte('created_at', monthEnd);

          if (monthlyPlayersError) {
            console.error('Error fetching monthly players:', showSupabaseError(monthlyPlayersError, 'fetchDashboardData monthlyPlayers'));
          }

          const newPlayersThisMonth = monthlyCount || 0;
          
          membershipTrendData.push({
            month: monthName,
            members: newPlayersThisMonth
          });
        }
        setMembershipData(membershipTrendData);

                        console.log('Dashboard data loaded successfully:', {
          totalPlayers: playersRes.count,
          newPlayersThisMonth: newPlayersRes.count,
          clubs: clubsRes.count,
          activeCompetitions: activeCompsRes.data?.length,
          todayRevenue: todayRevenue,
          monthlyRevenue: monthlyRevenue,
          yearlyRevenue: yearlyRevenue,
          competitions: recentComps?.length
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        const errorMessage = showSupabaseError(error, 'fetchDashboardData');
        toast({
          title: 'Error',
          description: `Failed to load dashboard data: ${errorMessage}`,
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleSettings = () => {
    setShowSiteSettings(true);
  };

  const handleUserManagement = () => {
    navigate(ROUTES.ADMIN.USERS);
  };

  const handleAddUser = () => {
    setShowNewUser(true);
  };

  const handlePlayersClick = () => {
    navigate(ROUTES.ADMIN.PLAYERS);
  };

  const handleClubsClick = () => {
    navigate(ROUTES.ADMIN.CLUBS);
  };

  const handleCompetitionsClick = () => {
    console.log('Competition link clicked, navigating to:', ROUTES.ADMIN.COMPETITIONS);
    navigate(ROUTES.ADMIN.COMPETITIONS);
  };

  const handleRevenueClick = () => {
    navigate(ROUTES.ADMIN.REVENUE);
  };

  const clubDistribution = [
    { name: "Active Clubs", value: stats.totalClubs, color: "hsl(var(--primary))" },
    { name: "Inactive", value: Math.max(0, 10 - stats.totalClubs), color: "hsl(var(--muted))" }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="lg">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">The Clubhouse HQ</h1>
                <p className="text-muted-foreground mt-1 text-sm md:text-base">Keeping score, counting cash, and dodging sand traps.</p>
              </div>
              <div className="flex flex-wrap gap-2 md:gap-3">
                <Button variant="outline" className="gap-2" onClick={handleSettings}>
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => navigate('/dashboard/admin/entries')}>
                  <Trophy className="w-4 h-4" />
                  <span className="hidden sm:inline">Entry Management</span>
                  <span className="sm:hidden">Entries</span>
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => navigate('/dashboard/admin/claims')}>
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Claims Review</span>
                  <span className="sm:hidden">Claims</span>
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleUserManagement}>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Manage Users</span>
                  <span className="sm:hidden">Users</span>
                </Button>
                <Button className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2" onClick={handleAddUser}>
                  <Plus className="w-4 h-4" />
                  <span className="hidden md:inline">Add New User</span>
                  <span className="md:hidden">Add User</span>
                </Button>
              </div>
            </div>

            {/* Revenue Overview - Top Priority */}
            <Card 
              className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(ROUTES.ADMIN.REVENUE_BREAKDOWN)}
              data-testid="admin-revenue-breakdown"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PoundSterling className="w-5 h-5 text-primary" />
                  Show Me the Money
                  <span className="text-sm font-normal text-muted-foreground ml-auto">Click to view breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="text-center">
                        <Skeleton className="h-8 w-24 mx-auto mb-2" />
                        <Skeleton className="h-4 w-20 mx-auto" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <TooltipProvider>
                      <div className="text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-2xl font-bold text-primary mb-1 cursor-help">
                              {formatCurrency(stats.todayRevenue)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Cha-ching!</p>
                          </TooltipContent>
                        </Tooltip>
                        <div className="text-sm text-muted-foreground">Today's Revenue</div>
                      </div>
                      <div className="text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-2xl font-bold text-primary mb-1 cursor-help">
                              {formatCurrency(stats.monthlyRevenue)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Cha-ching!</p>
                          </TooltipContent>
                        </Tooltip>
                        <div className="text-sm text-muted-foreground">Month to Date</div>
                      </div>
                      <div className="text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-2xl font-bold text-primary mb-1 cursor-help">
                              {formatCurrency(stats.yearlyRevenue)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Cha-ching!</p>
                          </TooltipContent>
                        </Tooltip>
                        <div className="text-sm text-muted-foreground">Year to Date</div>
                      </div>
                    </TooltipProvider>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Grid - New Enhanced Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Quick Actions</h2>
                <p className="text-sm text-muted-foreground">Fast access to key management areas</p>
              </div>
              <AdminQuickActions 
                stats={{
                  totalPlayers: stats.totalPlayers,
                  pendingEntries: 0, // This would need to be calculated from entries data
                  pendingClaims: 0,  // This would need to be calculated from claims data
                  monthlyRevenue: stats.monthlyRevenue,
                  activeCompetitions: stats.activeCompetitions,
                  totalClubs: stats.totalClubs
                }}
              />
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {loading ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="p-6">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-8 w-16 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </Card>
                  ))}
                </>
              ) : (
                <>
                  <StatsCard
                    title="Total Players"
                    value={stats.totalPlayers.toString()}
                    description="Registered players"
                    icon={Users}
                    onClick={handlePlayersClick}
                  />
                  <StatsCard
                    title="New Players This Month"
                    value={stats.newPlayersThisMonth.toString()}
                    description={`Since ${new Date().toLocaleDateString('en-GB', { month: 'long' })} 1st`}
                    icon={Users}
                  />
                  <StatsCard
                    title="Active Clubs"
                    value={stats.totalClubs.toString()}
                    description="Golf clubs using platform"
                    icon={Calendar}
                    onClick={handleClubsClick}
                  />
                  <StatsCard
                    title="Active Competitions"
                    value={stats.activeCompetitions.toString()}
                    description="Currently running"
                    icon={Trophy}
                    onClick={handleCompetitionsClick}
                  />
                </>
              )}
            </div>

            <div className="grid lg:grid-cols-1 gap-8">
              {/* Main Content Area */}
              <div className="space-y-8">
                {/* Membership Growth Chart */}
                <ChartWrapper
                  title="New Player Registrations"
                  description="Monthly new player sign-ups over the last 4 months"
                >
                  {loading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <Skeleton className="h-[250px] w-full" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={membershipData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Bar dataKey="members" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartWrapper>
              </div>
            </div>
          </div>
        </Section>
      </main>

      {/* Site Settings Modal */}
        <SiteSettingsModal 
          isOpen={showSiteSettings}
          onClose={() => setShowSiteSettings(false)}
        />

        <NewUserModal 
          isOpen={showNewUser}
          onClose={() => setShowNewUser(false)}
        />
      </div>
    );
  };

export default AdminDashboard;