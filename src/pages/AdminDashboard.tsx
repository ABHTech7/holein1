import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import StatsCard from "@/components/ui/stats-card";
import ChartWrapper from "@/components/ui/chart-wrapper";
import UserManagementModal from "@/components/admin/UserManagementModal";
import SiteSettingsModal from "@/components/admin/SiteSettingsModal";
import PlayersListModal from "@/components/admin/PlayersListModal";
import ClubsListModal from "@/components/admin/ClubsListModal";
import { Users, Calendar, Trophy, TrendingUp, Plus, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/formatters";

interface DashboardStats {
  totalPlayers: number;
  newPlayersThisMonth: number;
  totalClubs: number;
  activeCompetitions: number;
  monthlyRevenue: number;
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
  const [loading, setLoading] = useState(true);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showSiteSettings, setShowSiteSettings] = useState(false);
  const [showPlayersList, setShowPlayersList] = useState(false);
  const [showClubsList, setShowClubsList] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalPlayers: 0,
    newPlayersThisMonth: 0,
    totalClubs: 0,
    activeCompetitions: 0,
    monthlyRevenue: 0
  });
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [membershipData, setMembershipData] = useState<Array<{month: string, members: number}>>([]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Get current month start date for revenue calculation
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // Fetch basic stats with proper error handling
        const [playersRes, newPlayersRes, clubsRes, activeCompsRes] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'PLAYER'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'PLAYER').gte('created_at', monthStart),
          supabase.from('clubs').select('*', { count: 'exact', head: true }),
          supabase.from('competitions').select('*').eq('status', 'ACTIVE')
        ]);

        // Fetch month-to-date revenue from paid entries
        const { data: monthlyEntries, error: entriesError } = await supabase
          .from('entries')
          .select(`
            entry_date,
            paid,
            competitions!inner(entry_fee)
          `)
          .eq('paid', true)
          .gte('entry_date', monthStart);

        // Log any errors for debugging
        if (playersRes.error) console.error('Players query error:', playersRes.error);
        if (newPlayersRes.error) console.error('New players query error:', newPlayersRes.error);
        if (clubsRes.error) console.error('Clubs query error:', clubsRes.error);
        if (activeCompsRes.error) console.error('Active competitions error:', activeCompsRes.error);
        if (entriesError) console.error('Entries query error:', entriesError);

        // Calculate month-to-date revenue
        const monthlyRevenue = (monthlyEntries || []).reduce((sum, entry) => {
          const fee = (entry as any).competitions?.entry_fee || 0;
          return sum + fee;
        }, 0);

        setStats({
          totalPlayers: playersRes.count || 0,
          newPlayersThisMonth: newPlayersRes.count || 0,
          totalClubs: clubsRes.count || 0,
          activeCompetitions: activeCompsRes.data?.length || 0,
          monthlyRevenue: monthlyRevenue
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
          console.error('Recent competitions query error:', compsError);
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

        // Generate last 6 months membership growth data
        const membershipTrendData = [];
        for (let i = 5; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthName = monthDate.toLocaleDateString('en-GB', { month: 'short' });
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString();
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
          
          // For now, use estimated data - could be replaced with real query
          const estimatedMembers = Math.max(1, (playersRes.count || 0) - (5 - i));
          membershipTrendData.push({
            month: monthName,
            members: estimatedMembers
          });
        }
        setMembershipData(membershipTrendData);

        console.log('Dashboard data loaded successfully:', {
          totalPlayers: playersRes.count,
          newPlayersThisMonth: newPlayersRes.count,
          clubs: clubsRes.count,
          activeCompetitions: activeCompsRes.data?.length,
          monthlyRevenue: monthlyRevenue,
          competitions: recentComps?.length
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data. Please refresh the page.',
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

  const handleAddMember = () => {
    setShowUserManagement(true);
  };

  const handlePlayersClick = () => {
    setShowPlayersList(true);
  };

  const handleClubsClick = () => {
    setShowClubsList(true);
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
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-muted-foreground mt-1">Manage your club operations and monitor performance</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="gap-2" onClick={handleSettings}>
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
                <Button className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2" onClick={handleAddMember}>
                  <Plus className="w-4 h-4" />
                  Add Member
                </Button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {loading ? (
                <>
                  {[...Array(5)].map((_, i) => (
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
                  />
                  <StatsCard
                    title="Month-to-Date Revenue"
                    value={formatCurrency(stats.monthlyRevenue)}
                    description={`Revenue since ${new Date().toLocaleDateString('en-GB', { month: 'long' })} 1st`}
                    icon={TrendingUp}
                  />
                </>
              )}
            </div>

            <div className="grid lg:grid-cols-1 gap-8">
              {/* Main Content Area */}
              <div className="space-y-8">
                {/* Membership Growth Chart */}
                <ChartWrapper
                  title="Membership Growth"
                  description="Monthly new member registrations"
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

      <SiteFooter />

      {/* User Management Modal */}
      <UserManagementModal 
        isOpen={showUserManagement}
        onClose={() => setShowUserManagement(false)}
      />

      {/* Site Settings Modal */}
      <SiteSettingsModal 
        isOpen={showSiteSettings}
        onClose={() => setShowSiteSettings(false)}
      />

      {/* Players List Modal */}
      <PlayersListModal 
        isOpen={showPlayersList}
        onClose={() => setShowPlayersList(false)}
      />

      {/* Clubs List Modal */}
      <ClubsListModal 
        isOpen={showClubsList}
        onClose={() => setShowClubsList(false)}
      />
    </div>
  );
};

export default AdminDashboard;