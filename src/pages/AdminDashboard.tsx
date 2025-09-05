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
import { Users, Calendar, Trophy, TrendingUp, Plus, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/formatters";

interface DashboardStats {
  totalMembers: number;
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
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
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

        // Fetch basic stats
        const [membersRes, clubsRes, competitionsRes, entriesRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('clubs').select('id', { count: 'exact', head: true }),
          supabase.from('competitions').select('id').eq('status', 'ACTIVE'),
          supabase.from('entries').select('entry_fee:competitions(entry_fee), paid').eq('paid', true)
        ]);

        // Calculate revenue (sum of paid entry fees)
        const paidEntries = entriesRes.data || [];
        const revenue = paidEntries.reduce((sum, entry) => {
          const fee = (entry as any)?.entry_fee?.entry_fee || 0;
          return sum + fee;
        }, 0);

        setStats({
          totalMembers: membersRes.count || 0,
          totalClubs: clubsRes.count || 0,
          activeCompetitions: competitionsRes.data?.length || 0,
          monthlyRevenue: revenue
        });

        // Fetch recent competitions with entry counts
        const { data: recentComps } = await supabase
          .from('competitions')
          .select(`
            id, name, start_date, end_date, status,
            clubs(name),
            entries(id)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

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

        // Generate mock membership trend data (could be replaced with real data)
        const mockMembershipData = [
          { month: "Jan", members: Math.max(0, stats.totalMembers - 50) },
          { month: "Feb", members: Math.max(0, stats.totalMembers - 40) },
          { month: "Mar", members: Math.max(0, stats.totalMembers - 30) },
          { month: "Apr", members: Math.max(0, stats.totalMembers - 20) },
          { month: "May", members: Math.max(0, stats.totalMembers - 10) },
          { month: "Jun", members: stats.totalMembers }
        ];
        setMembershipData(mockMembershipData);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleSettings = () => {
    toast({
      title: "Settings",
      description: "Settings page coming soon!"
    });
  };

  const handleAddMember = () => {
    toast({
      title: "Add Member",
      description: "Member management coming soon!"
    });
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
                    title="Total Members"
                    value={stats.totalMembers.toString()}
                    description="Registered users"
                    icon={Users}
                  />
                  <StatsCard
                    title="Active Clubs"
                    value={stats.totalClubs.toString()}
                    description="Golf clubs using platform"
                    icon={Calendar}
                  />
                  <StatsCard
                    title="Active Competitions"
                    value={stats.activeCompetitions.toString()}
                    description="Currently running"
                    icon={Trophy}
                  />
                  <StatsCard
                    title="Revenue"
                    value={formatCurrency(stats.monthlyRevenue)}
                    description="Total entry fees collected"
                    icon={TrendingUp}
                  />
                </>
              )}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content Area */}
              <div className="lg:col-span-2 space-y-8">
                {/* Membership Growth Chart */}
                <ChartWrapper
                  title="Membership Growth"
                  description="Monthly new member registrations"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={membershipData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Bar dataKey="members" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>

                {/* Club Distribution */}
                <ChartWrapper
                  title="Platform Usage"
                  description="Active vs inactive clubs"
                >
                  {loading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <Skeleton className="h-[200px] w-[200px] rounded-full" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={clubDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {clubDistribution.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartWrapper>

                {/* Recent Competitions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Competitions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="p-3 border border-border rounded-lg">
                            <Skeleton className="h-4 w-40 mb-2" />
                            <Skeleton className="h-3 w-60" />
                          </div>
                        ))}
                      </div>
                    ) : competitions.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No competitions found</p>
                    ) : (
                      <div className="space-y-4">
                        {competitions.map((competition) => (
                          <div key={competition.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                            <div>
                              <h4 className="font-medium text-foreground">{competition.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {competition.club_name} • {competition.entry_count} entries • {formatDate(competition.start_date, 'short')}
                              </p>
                            </div>
                            <Badge variant={competition.status === "ACTIVE" ? "default" : "secondary"}>
                              {competition.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={handleAddMember}>
                      <Users className="w-4 h-4" />
                      Manage Users
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={() => toast({ title: "Feature Coming Soon", description: "Club management features are in development." })}>
                      <Calendar className="w-4 h-4" />
                      Manage Clubs
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={() => toast({ title: "Feature Coming Soon", description: "Competition oversight tools are in development." })}>
                      <Trophy className="w-4 h-4" />
                      Oversee Competitions
                    </Button>
                  </CardContent>
                </Card>

                {/* Platform Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Platform Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="text-sm">
                            <Skeleton className="h-4 w-32 mb-1" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4 text-sm">
                        <div>
                          <p className="font-medium text-foreground">Total Platform Users</p>
                          <p className="text-muted-foreground">{stats.totalMembers} registered accounts</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Active Golf Clubs</p>
                          <p className="text-muted-foreground">{stats.totalClubs} clubs using platform</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Live Competitions</p>
                          <p className="text-muted-foreground">{stats.activeCompetitions} competitions running</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Total Revenue</p>
                          <p className="text-muted-foreground">{formatCurrency(stats.monthlyRevenue)} collected</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default AdminDashboard;