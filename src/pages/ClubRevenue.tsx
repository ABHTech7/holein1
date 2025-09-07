import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Calendar, TrendingUp, DollarSign, Download, Trophy, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import StatsCard from "@/components/ui/stats-card";
import ChartWrapper from "@/components/ui/chart-wrapper";
import EmptyState from "@/components/ui/empty-state";

interface RevenueEntry {
  id: string;
  entry_date: string;
  commission_amount: number;
  competition_name: string;
  player_email: string;
}

interface DailyRevenue {
  date: string;
  revenue: number;
  entries: number;
}

const ClubRevenue = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [revenueEntries, setRevenueEntries] = useState<RevenueEntry[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [stats, setStats] = useState({
    dailyRevenue: 0,
    monthToDate: 0,
    yearToDate: 0,
    totalEntries: 0
  });

  useEffect(() => {
    if (profile?.club_id) {
      fetchRevenueData();
    }
  }, [profile?.club_id, dateRange]);

  const fetchRevenueData = async () => {
    if (!profile?.club_id) return;

    try {
      setLoading(true);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const rangeStart = new Date(now.getTime() - (parseInt(dateRange) * 24 * 60 * 60 * 1000));

      // Fetch all paid entries for the club
        const { data: entriesData, error } = await supabase
        .from('entries')
        .select(`
          id,
          entry_date,
          paid,
          competitions!inner(
            name,
            entry_fee,
            commission_amount,
            club_id
          ),
          profiles(
            email
          )
        `)
        .eq('competitions.club_id', profile.club_id)
        .eq('paid', true)
        .gte('entry_date', yearStart.toISOString())
        .order('entry_date', { ascending: false });

      if (error) throw error;

      const processedEntries = entriesData?.map((entry) => ({
        id: entry.id,
        entry_date: entry.entry_date,
        commission_amount: entry.competitions.commission_amount || 0,
        competition_name: entry.competitions.name,
        player_email: entry.profiles?.email || 'unknown@email.com'
      })) || [];

      setRevenueEntries(processedEntries);

      // Calculate commission stats (only for paid entries)
      const paidEntries = processedEntries.filter(e => entriesData?.find(entry => entry.id === e.id)?.paid);
      
      const dailyRevenueCalc = paidEntries
        .filter(e => new Date(e.entry_date) >= todayStart)
        .reduce((sum, e) => sum + e.commission_amount, 0);

      const monthToDateCalc = paidEntries
        .filter(e => new Date(e.entry_date) >= monthStart)
        .reduce((sum, e) => sum + e.commission_amount, 0);

      const yearToDateCalc = paidEntries
        .reduce((sum, e) => sum + e.commission_amount, 0);

      setStats({
        dailyRevenue: dailyRevenueCalc,
        monthToDate: monthToDateCalc,
        yearToDate: yearToDateCalc,
        totalEntries: paidEntries.length
      });

      // Generate daily commission chart data (only paid entries)
      const dailyRevenueMap = new Map<string, { revenue: number; entries: number; }>();
      
      // Initialize all days in range with 0
      for (let d = new Date(rangeStart); d <= now; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        dailyRevenueMap.set(dateKey, { revenue: 0, entries: 0 });
      }

      // Populate with actual commission data (paid entries only)
      paidEntries
        .filter(e => new Date(e.entry_date) >= rangeStart)
        .forEach(entry => {
          const dateKey = entry.entry_date.split('T')[0];
          const existing = dailyRevenueMap.get(dateKey) || { revenue: 0, entries: 0 };
          dailyRevenueMap.set(dateKey, {
            revenue: existing.revenue + entry.commission_amount,
            entries: existing.entries + 1
          });
        });

      const chartData = Array.from(dailyRevenueMap.entries())
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          entries: data.entries
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDailyRevenue(chartData);

    } catch (error) {
      console.error('Error fetching revenue data:', error);
      toast({
        title: "Error",
        description: "Failed to load revenue data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    // TODO: Implement CSV export
    toast({
      title: 'Coming Soon',
      description: 'Revenue report download will be available soon',
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="lg">
          <Container>
            <div className="space-y-8">
              {/* Back Button */}
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/club')}
                className="flex items-center gap-2 mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>

              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground">Commission Dashboard</h1>
                  <p className="text-muted-foreground mt-1">
                    Track your commission earnings from competition entries
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" onClick={handleDownloadReport} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download Report
                  </Button>
                </div>
              </div>

              {/* Revenue Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                  title="Today's Revenue"
                  value={formatCurrency(stats.dailyRevenue)}
                  icon={DollarSign}
                />
                <StatsCard
                  title="Month to Date"
                  value={formatCurrency(stats.monthToDate)}
                  icon={Calendar}
                />
                <StatsCard
                  title="Year to Date"
                  value={formatCurrency(stats.yearToDate)}
                  icon={TrendingUp}
                />
                <StatsCard
                  title="Total Paid Entries"
                  value={stats.totalEntries}
                  icon={Trophy}
                />
              </div>

              {/* Charts */}
              <div className="grid lg:grid-cols-2 gap-8">
                <ChartWrapper
                  title="Daily Revenue Trend"
                  description={`Revenue over the last ${dateRange} days`}
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(value) => formatDate(value, 'short')}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrapper>

                <ChartWrapper
                  title="Daily Entry Volume"
                  description={`Paid entries over the last ${dateRange} days`}
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(value) => formatDate(value, 'short')}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Bar 
                        dataKey="entries" 
                        fill="hsl(var(--secondary))"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              </div>

              {/* Recent Revenue Entries */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Paid Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  {revenueEntries.length === 0 ? (
                    <EmptyState
                      title="No revenue entries yet"
                      description="Paid entries will appear here when players complete payments"
                      size="sm"
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Competition</TableHead>
                          <TableHead>Player</TableHead>
                          <TableHead>Commission</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {revenueEntries.slice(0, 10).map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                {formatDateTime(entry.entry_date)}
                              </div>
                            </TableCell>
                            <TableCell>{entry.competition_name}</TableCell>
                            <TableCell>{entry.player_email}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(entry.commission_amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default ClubRevenue;