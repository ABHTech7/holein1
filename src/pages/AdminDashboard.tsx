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
import { SimpleResetDemoButton } from "@/components/admin/SimpleResetDemoButton";
import { TopUpClubsButton } from "@/components/admin/TopUpClubsButton";
import { TopUpPlayersButton } from "@/components/admin/TopUpPlayersButton";
import { TopUpEntriesButton } from "@/components/admin/TopUpEntriesButton";
import { SuperAdminProfileModal } from "@/components/admin/SuperAdminProfileModal";
import { Users, Calendar, Trophy, TrendingUp, Plus, Settings, PoundSterling, UserPlus, Edit3, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/formatters";
import { showSupabaseError } from "@/lib/showSupabaseError";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import { ROUTES } from "@/routes";
import { getDemoModeDisplayConfig } from "@/lib/demoMode";
import { EnvironmentBadge } from "@/components/ui/environment-badge";
import { addDemoFilter } from "@/lib/supabaseHelpers";
interface DashboardStats {
  totalPlayers: number;
  newPlayersThisMonth: number;
  totalClubs: number;
  activeCompetitions: number;
  todayRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  monthToDateEntries: number;
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
  const {
    profile,
    refreshProfile
  } = useAuth();
  const {
    newLeads,
    pendingClaims
  } = useNotificationCounts();
  const { showDemoIndicators, showDemoTools, filterDemoData, environmentType } = getDemoModeDisplayConfig();
  const [loading, setLoading] = useState(true);
  const [showSiteSettings, setShowSiteSettings] = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditingActions, setIsEditingActions] = useState(false);
  // Dashboard state - Updated to use monthToDateEntries (v2.1)
  const [stats, setStats] = useState<DashboardStats>({
    totalPlayers: 0,
    newPlayersThisMonth: 0,
    totalClubs: 0,
    activeCompetitions: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    monthToDateEntries: 0
  });
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [membershipData, setMembershipData] = useState<Array<{
    month: string;
    members: number;
  }>>([]);
  const [insurancePremiums, setInsurancePremiums] = useState({
    monthToDate: 0,
    currentRate: 1.15
  });

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Development diagnostic logging
        if (process.env.NODE_ENV !== 'production') {
          console.log('🔍 [AdminDashboard.fetchDashboardData] Starting dashboard data fetch', {
            userProfile: {
              role: profile?.role,
              id: profile?.id,
              club_id: profile?.club_id
            },
            operation: 'Fetching comprehensive admin dashboard data',
            queryParams: {
              tables: ['profiles', 'clubs', 'competitions', 'entries'],
              filters: {
                role: 'PLAYER',
                status: 'ACTIVE',
                paid: true
              }
            }
          });
        }

        // Get current dates for revenue calculations
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const yearStartStr = `${yyyy}-01-01`;
        const monthStartStr = `${yyyy}-${mm}-01`;
        // Use date-only strings to avoid timezone drift and ensure inclusive daily windows
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

        // Fetch basic stats with proper error handling and demo filtering
        console.log('Fetching admin dashboard stats...');
        
        // Build queries with demo filtering
        let playersQuery = supabase.from('profiles').select('id', {
          count: 'exact',
          head: true
        }).eq('role', 'PLAYER').neq('status', 'deleted').is('deleted_at', null);
        
        let newPlayersQuery = supabase.from('profiles').select('id', {
          count: 'exact',
          head: true
        }).eq('role', 'PLAYER').neq('status', 'deleted').is('deleted_at', null).gte('created_at', monthStartStr);
        
        let clubsQuery = supabase.from('clubs').select('id', {
          count: 'exact',
          head: true
        });
        
        let competitionsQuery = supabase.from('competitions').select('id, name, status').eq('status', 'ACTIVE');
        
        let entriesQuery = supabase.from('entries').select('id', {
          count: 'exact',
          head: true
        }).gte('entry_date', monthStartStr);
        
        // Apply demo filtering if needed
        if (filterDemoData) {
          playersQuery = playersQuery.neq('is_demo_data', true);
          newPlayersQuery = newPlayersQuery.neq('is_demo_data', true);
          clubsQuery = clubsQuery.neq('is_demo_data', true);
          competitionsQuery = competitionsQuery.neq('is_demo_data', true);
          entriesQuery = entriesQuery.neq('is_demo_data', true);
        }
        
        const [playersRes, newPlayersRes, clubsRes, activeCompsRes, monthToDateEntriesRes] = await Promise.all([
          playersQuery,
          newPlayersQuery, 
          clubsQuery,
          competitionsQuery,
          entriesQuery
        ]);

        // Fetch revenue data for different periods with price_paid/amount_minor only (no competitions join to avoid RLS filtering)
        const [todayEntriesRes, monthlyEntriesRes, yearlyEntriesRes] = await Promise.all([
        // Today's revenue
        supabase.from('entries').select(`
              entry_date,
              paid,
              price_paid,
              amount_minor
            `).eq('paid', true).gte('entry_date', todayStr).lt('entry_date', tomorrowStr),
        // Month-to-date revenue
        supabase.from('entries').select(`
              entry_date,
              paid,
              price_paid,
              amount_minor
            `).eq('paid', true).gte('entry_date', monthStartStr),
        // Year-to-date revenue
        supabase.from('entries').select(`
              entry_date,
              paid,
              price_paid,
              amount_minor
            `).eq('paid', true).gte('entry_date', yearStartStr)]);

        // Enhanced error logging with comprehensive diagnostic details
        if (playersRes.error && process.env.NODE_ENV !== 'production') {
          console.error("ADMIN PAGE ERROR:", {
            location: "AdminDashboard.fetchDashboardData.players",
            userProfile: {
              role: profile?.role,
              id: profile?.id,
              club_id: profile?.club_id
            },
            operation: "Fetching total player count",
            queryParams: {
              table: 'profiles',
              filters: {
                role: 'PLAYER'
              }
            },
            code: playersRes.error.code,
            message: playersRes.error.message,
            details: playersRes.error.details,
            hint: playersRes.error.hint,
            fullError: playersRes.error
          });
        }
        if (newPlayersRes.error && process.env.NODE_ENV !== 'production') {
          console.error("ADMIN PAGE ERROR:", {
            location: "AdminDashboard.fetchDashboardData.newPlayers",
            userProfile: {
              role: profile?.role,
              id: profile?.id,
              club_id: profile?.club_id
            },
            operation: "Fetching new players this month",
            queryParams: {
              table: 'profiles',
              filters: {
                role: 'PLAYER',
                created_at: 'gte monthStart'
              }
            },
            code: newPlayersRes.error.code,
            message: newPlayersRes.error.message,
            details: newPlayersRes.error.details,
            hint: newPlayersRes.error.hint,
            fullError: newPlayersRes.error
          });
        }
        if (clubsRes.error && process.env.NODE_ENV !== 'production') {
          console.error("ADMIN PAGE ERROR:", {
            location: "AdminDashboard.fetchDashboardData.clubs",
            userProfile: {
              role: profile?.role,
              id: profile?.id,
              club_id: profile?.club_id
            },
            operation: "Fetching total club count",
            queryParams: {
              table: 'clubs',
              filters: {}
            },
            code: clubsRes.error.code,
            message: clubsRes.error.message,
            details: clubsRes.error.details,
            hint: clubsRes.error.hint,
            fullError: clubsRes.error
          });
        }

        // Calculate revenue for different periods using price_paid with fallback to amount_minor
        // Sum in pence: prefer amount_minor (already pence); otherwise convert price_paid (pounds) to pence
        const toPence = (e: any) => {
          const minor = typeof e.amount_minor === 'number' ? e.amount_minor : null;
          const pounds = typeof e.price_paid === 'number' ? e.price_paid : null;
          if (minor !== null && !isNaN(minor)) return minor;
          if (pounds !== null && !isNaN(pounds)) return Math.round(pounds * 100);
          return 0;
        };
        const todayRevenue = (todayEntriesRes.data || []).reduce((sum, entry) => sum + toPence(entry), 0);
        const monthlyRevenue = (monthlyEntriesRes.data || []).reduce((sum, entry) => sum + toPence(entry), 0);
        const yearlyRevenue = (yearlyEntriesRes.data || []).reduce((sum, entry) => sum + toPence(entry), 0);
        console.log('Month to date entries count:', monthToDateEntriesRes.count);
        setStats({
          totalPlayers: playersRes.count || 0,
          newPlayersThisMonth: newPlayersRes.count || 0,
          totalClubs: clubsRes.count || 0,
          activeCompetitions: activeCompsRes.data?.length || 0,
          todayRevenue: todayRevenue,
          monthlyRevenue: monthlyRevenue,
          yearlyRevenue: yearlyRevenue,
          monthToDateEntries: monthToDateEntriesRes.count || 0
        });

        // Fetch recent competitions with entry counts and club info
        let recentCompsQuery = supabase.from('competitions').select(`
            id, name, start_date, end_date, status, entry_fee,
            clubs(name),
            entries(id)
          `).order('created_at', {
          ascending: false
        }).limit(5);
        
        // Apply demo filtering if needed
        if (filterDemoData) {
          recentCompsQuery = recentCompsQuery.neq('is_demo_data', true);
        }
        
        const {
          data: recentComps,
          error: compsError
        } = await recentCompsQuery;
        if (compsError && process.env.NODE_ENV !== 'production') {
          console.error("ADMIN PAGE ERROR:", {
            location: "AdminDashboard.fetchDashboardData.recentCompetitions",
            userProfile: {
              role: profile?.role,
              id: profile?.id,
              club_id: profile?.club_id
            },
            operation: "Fetching recent competitions with entry counts",
            queryParams: {
              table: 'competitions',
              joins: ['clubs', 'entries'],
              limit: 5
            },
            code: compsError.code,
            message: compsError.message,
            details: compsError.details,
            hint: compsError.hint,
            fullError: compsError
          });
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
          const monthName = monthDate.toLocaleDateString('en-GB', {
            month: 'short',
            timeZone: 'UTC'
          });
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString();
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

          // Get actual new players for this specific month
          const {
            count: monthlyCount,
            error: monthlyPlayersError
          } = await supabase.from('profiles').select('id', {
            count: 'exact',
            head: true
          }).eq('role', 'PLAYER').neq('status', 'deleted').is('deleted_at', null).gte('created_at', monthStart).lte('created_at', monthEnd);
          if (monthlyPlayersError && process.env.NODE_ENV !== 'production') {
            console.error("ADMIN PAGE ERROR:", {
              location: "AdminDashboard.fetchDashboardData.monthlyPlayers",
              userProfile: {
                role: profile?.role,
                id: profile?.id,
                club_id: profile?.club_id
              },
              operation: `Fetching players for month: ${monthName}`,
              queryParams: {
                table: 'profiles',
                filters: {
                  role: 'PLAYER',
                  created_at: `${monthStart} to ${monthEnd}`
                }
              },
              code: monthlyPlayersError.code,
              message: monthlyPlayersError.message,
              details: monthlyPlayersError.details,
              hint: monthlyPlayersError.hint,
              fullError: monthlyPlayersError
            });
          }
          const newPlayersThisMonth = monthlyCount || 0;
          membershipTrendData.push({
            month: monthName,
            members: newPlayersThisMonth
          });
        }
        setMembershipData(membershipTrendData);
        
        // Fetch insurance premium calculations
        try {
          // Get active insurance company and calculate month-to-date premiums
          const { data: insuranceCompany } = await supabase
            .from('insurance_companies')
            .select('*')
            .eq('active', true)
            .maybeSingle();

          if (insuranceCompany) {
            // Get month-to-date entries count
            const { count: monthlyEntries } = await supabase
              .from('entries')
              .select('id', { count: 'exact', head: true })
              .gte('entry_date', monthStartStr);

            const monthlyPremium = (monthlyEntries || 0) * insuranceCompany.premium_rate_per_entry;
            
            setInsurancePremiums({
              monthToDate: monthlyPremium,
              currentRate: insuranceCompany.premium_rate_per_entry
            });
          }
        } catch (error) {
          console.error('Error fetching insurance data:', error);
          // Don't block the dashboard if insurance data fails
        }
        
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
        // Enhanced error handling with comprehensive logging
        if (process.env.NODE_ENV !== 'production') {
          console.error("ADMIN PAGE ERROR:", {
            location: "AdminDashboard.fetchDashboardData.general",
            userProfile: {
              role: profile?.role,
              id: profile?.id,
              club_id: profile?.club_id
            },
            operation: "General dashboard data fetching operation",
            queryParams: {
              tables: 'multiple',
              operation: 'comprehensive dashboard fetch'
            },
            code: (error as any)?.code,
            message: (error as any)?.message,
            details: (error as any)?.details,
            hint: (error as any)?.hint,
            fullError: error
          });
        }
        const errorMessage = showSupabaseError(error, 'AdminDashboard.fetchDashboardData');
        toast({
          title: 'Failed to load dashboard data',
          description: `${errorMessage}${(error as any)?.code ? ` (Code: ${(error as any).code})` : ''}`,
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
  const clubDistribution = [{
    name: "Active Clubs",
    value: stats.totalClubs,
    color: "hsl(var(--primary))"
  }, {
    name: "Inactive",
    value: Math.max(0, 10 - stats.totalClubs),
    color: "hsl(var(--muted))"
  }];
  return <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="lg">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">The Clubhouse HQ</h1>
                  <EnvironmentBadge />
                </div>
                {/* Personal greeting for admin user */}
                {profile?.first_name && <p className="text-lg text-primary mt-1">
                    Hi {profile.first_name}, welcome back!
                  </p>}
                
              </div>
              <div className="flex flex-wrap gap-2 md:gap-3">
                <Button variant="outline" className="gap-2" onClick={handleSettings}>
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
                {profile?.role === 'SUPER_ADMIN' && (
                  <Button variant="outline" className="gap-2" onClick={() => setShowProfileModal(true)}>
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">My Profile</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Revenue Overview - Top Priority */}
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(ROUTES.ADMIN.REVENUE_BREAKDOWN)} data-testid="admin-revenue-breakdown">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PoundSterling className="w-5 h-5 text-primary" />
                  Show Me the Money
                  <span className="text-sm font-normal text-muted-foreground ml-auto">Click to view breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <div key={i} className="text-center">
                        <Skeleton className="h-8 w-24 mx-auto mb-2" />
                        <Skeleton className="h-4 w-20 mx-auto" />
                      </div>)}
                  </div> : <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  </div>}
              </CardContent>
            </Card>

            {/* Quick Actions Grid - New Enhanced Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Quick Actions</h2>
                  <p className="text-sm text-muted-foreground">Fast access to key management areas</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditingActions(!isEditingActions)}>
                  <Edit3 className="w-4 h-4" />
                  {isEditingActions ? 'Done' : 'Edit Order'}
                </Button>
              </div>
              <AdminQuickActions stats={{
              totalPlayers: stats.totalPlayers,
              pendingEntries: stats.monthToDateEntries,
              // Real count of month-to-date entries
              pendingClaims: pendingClaims,
              // Real count of pending claims
              monthlyRevenue: stats.monthlyRevenue,
              activeCompetitions: stats.activeCompetitions,
              totalClubs: stats.totalClubs
            }} insurancePremiums={insurancePremiums} onAddUser={handleAddUser} isEditing={isEditingActions} />
            
            {/* Demo Data Management - Only show in demo/development mode */}
            {showDemoTools && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Demo Data Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <TopUpClubsButton />
                  <TopUpPlayersButton />
                  <TopUpEntriesButton />
                </div>
                <SimpleResetDemoButton />
              </div>
            )}
            
            {/* Production Data Management - Only show in production environment */}
            {/* Moved to Site Settings Modal */}
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {loading ? <>
                  {[...Array(4)].map((_, i) => <Card key={i} className="p-6">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-8 w-16 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </Card>)}
                </> : <>
                  <StatsCard title="Total Players" value={stats.totalPlayers.toString()} description="Registered players" icon={Users} onClick={handlePlayersClick} />
                  <StatsCard title="New Players This Month" value={stats.newPlayersThisMonth.toString()} description={`Since ${new Date().toLocaleDateString('en-GB', {
                month: 'long',
                timeZone: 'UTC'
              })} 1st`} icon={Users} />
                  <StatsCard title="Active Clubs" value={stats.totalClubs.toString()} description="Golf clubs using platform" icon={Calendar} onClick={handleClubsClick} />
                  <StatsCard title="Active Competitions" value={stats.activeCompetitions.toString()} description="Currently running" icon={Trophy} onClick={handleCompetitionsClick} />
                </>}
            </div>

            <div className="grid lg:grid-cols-1 gap-8">
              {/* Main Content Area */}
              <div className="space-y-8">
                {/* Membership Growth Chart */}
                <ChartWrapper title="New Player Registrations" description="Monthly new player sign-ups over the last 4 months">
                  {loading ? <div className="h-[300px] flex items-center justify-center">
                      <Skeleton className="h-[250px] w-full" />
                    </div> : <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={membershipData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Bar dataKey="members" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>}
                </ChartWrapper>
              </div>
            </div>
          </div>
        </Section>
      </main>

      {/* Site Settings Modal */}
        <SiteSettingsModal isOpen={showSiteSettings} onClose={() => setShowSiteSettings(false)} />

        <NewUserModal isOpen={showNewUser} onClose={() => setShowNewUser(false)} />

        {profile && (
          <SuperAdminProfileModal 
            isOpen={showProfileModal} 
            onClose={() => setShowProfileModal(false)}
            currentUser={{
              id: profile.id,
              email: profile.email,
              first_name: profile.first_name || undefined,
              last_name: profile.last_name || undefined,
              phone: (profile as any).phone || undefined
            }}
            onProfileUpdated={() => {
              refreshProfile();
            }}
          />
        )}
      </div>;
};
export default AdminDashboard;