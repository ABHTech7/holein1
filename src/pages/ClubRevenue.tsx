import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, TrendingUp, DollarSign, Download, Trophy, ArrowLeft } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import StatsCard from "@/components/ui/stats-card";
import EmptyState from "@/components/ui/empty-state";

interface RevenueEntry {
  id: string;
  entry_date: string;
  commission_amount: number;
  competition_name: string;
  player_email: string;
}


const ClubRevenue = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [revenueEntries, setRevenueEntries] = useState<RevenueEntry[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartPeriod, setChartPeriod] = useState("7");
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
  }, [profile?.club_id]);

  const fetchRevenueData = async () => {
    if (!profile?.club_id) return;

    try {
      setLoading(true);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      // Fetch all paid entries for the club (matching dashboard query structure)
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

      console.log('Revenue Page - Raw entries data:', entriesData?.length, 'entries');
      console.log('Revenue Page - Today start:', todayStart.toISOString());
      
      // Debug each entry in detail
      entriesData?.forEach((entry, index) => {
        console.log(`Entry ${index}:`, {
          id: entry.id,
          entry_date: entry.entry_date,
          paid: entry.paid,
          commission: entry.competitions.commission_amount,
          competition: entry.competitions.name,
          player: entry.profiles?.email,
          isToday: new Date(entry.entry_date) >= todayStart
        });
      });

      const processedEntries = entriesData?.map((entry) => ({
        id: entry.id,
        entry_date: entry.entry_date,
        commission_amount: entry.competitions.commission_amount || 0,
        competition_name: entry.competitions.name,
        player_email: entry.profiles?.email || 'unknown@email.com'
      })) || [];

      console.log('Revenue Page - Processed entries for table:', processedEntries.length);
      
      // Show first few entries that will be displayed in table
      console.log('Revenue Page - Table entries (first 5):', 
        processedEntries.slice(0, 5).map(e => ({
          date: e.entry_date,
          commission: e.commission_amount,
          competition: e.competition_name
        }))
      );

      setRevenueEntries(processedEntries);

      // Generate chart data based on selected period
      const generateChartData = (days: number) => {
        const chartEntries = [];
        const now = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);
          
          // Filter entries for this specific day
          const dayEntries = processedEntries.filter(entry => {
            const entryDate = new Date(entry.entry_date);
            // Normalize entry date to start of day for comparison
            const entryDayStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
            const targetDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            return entryDayStart.getTime() === targetDayStart.getTime();
          });
          
          const dayRevenue = dayEntries.reduce((sum, entry) => sum + entry.commission_amount, 0);
          
          console.log(`Chart Data - ${date.toDateString()}: ${dayEntries.length} entries, £${dayRevenue.toFixed(2)} revenue`);
          
          chartEntries.push({
            date: date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
            revenue: dayRevenue,
            entries: dayEntries.length,
            fullDate: date.toDateString() // for debugging
          });
        }
        
        return chartEntries;
      };

      const initialChartData = generateChartData(parseInt(chartPeriod));
      console.log('Initial chart data:', initialChartData);
      setChartData(initialChartData);

      // Calculate commission stats - using same logic as dashboard
      const todayEntries = processedEntries.filter(e => new Date(e.entry_date) >= todayStart);
      const dailyRevenueCalc = todayEntries.reduce((sum, e) => sum + e.commission_amount, 0);

      console.log('Revenue Page - Today entries:', todayEntries.length, 'entries with total:', dailyRevenueCalc);

      const monthToDateCalc = processedEntries
        .filter(e => new Date(e.entry_date) >= monthStart)
        .reduce((sum, e) => sum + e.commission_amount, 0);

      const yearToDateCalc = processedEntries
        .reduce((sum, e) => sum + e.commission_amount, 0);
      
      console.log('Revenue Page - Commission calculations:', {
        dailyRevenueCalc,
        monthToDateCalc,
        yearToDateCalc,
        totalEntries: processedEntries.length,
        todayEntriesCount: todayEntries.length
      });

      setStats({
        dailyRevenue: dailyRevenueCalc,
        monthToDate: monthToDateCalc,
        yearToDate: yearToDateCalc,
        totalEntries: processedEntries.length
      });

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

  const handlePeriodChange = (newPeriod: string) => {
    setChartPeriod(newPeriod);
    
    const generateChartData = (days: number) => {
      const chartEntries = [];
      const now = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        // Filter entries for this specific day
        const dayEntries = revenueEntries.filter(entry => {
          const entryDate = new Date(entry.entry_date);
          // Normalize entry date to start of day for comparison
          const entryDayStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
          const targetDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return entryDayStart.getTime() === targetDayStart.getTime();
        });
        
        const dayRevenue = dayEntries.reduce((sum, entry) => sum + entry.commission_amount, 0);
        
        console.log(`Period Change Chart Data - ${date.toDateString()}: ${dayEntries.length} entries, £${dayRevenue.toFixed(2)} revenue`);
        
        chartEntries.push({
          date: date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
          revenue: dayRevenue,
          entries: dayEntries.length,
          fullDate: date.toDateString() // for debugging
        });
      }
      
      return chartEntries;
    };

    const newChartData = generateChartData(parseInt(newPeriod));
    console.log('New chart data for period', newPeriod, ':', newChartData);
    setChartData(newChartData);
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
                
                <Button variant="outline" onClick={handleDownloadReport} className="gap-2">
                  <Download className="w-4 h-4" />
                  Download Report
                </Button>
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

              {/* Revenue Trend Chart */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Revenue Trend</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Daily commission earnings over time
                      </p>
                    </div>
                    <Select value={chartPeriod} onValueChange={handlePeriodChange}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 Days</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          className="text-xs text-muted-foreground"
                        />
                        <YAxis 
                          className="text-xs text-muted-foreground"
                          tickFormatter={(value) => `£${value}`}
                        />
                        <Tooltip 
                          formatter={(value, name) => [
                            `£${Number(value).toFixed(2)}`, 
                            name === 'revenue' ? 'Revenue' : 'Entries'
                          ]}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>


              {/* Recent Revenue Entries */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Recent Paid Entries</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Showing latest 10 of {revenueEntries.length} total paid entries
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Total Revenue: {formatCurrency(stats.yearToDate)}</p>
                      <p>Today's Revenue: {formatCurrency(stats.dailyRevenue)}</p>
                    </div>
                  </div>
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
                        {revenueEntries.slice(0, 10).map((entry) => {
                          const entryDate = new Date(entry.entry_date);
                          const isToday = entryDate >= new Date(new Date().setHours(0, 0, 0, 0));
                          
                          return (
                            <TableRow key={entry.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <div className="flex flex-col">
                                    <span>
                                      {formatDateTime(entry.entry_date)}
                                    </span>
                                    {isToday && (
                                      <span className="text-xs text-muted-foreground">Today's Entry</span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{entry.competition_name}</TableCell>
                              <TableCell>{entry.player_email}</TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(entry.commission_amount)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
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