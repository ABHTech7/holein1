import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SiteHeader from "@/components/layout/SiteHeader";
import Section from "@/components/layout/Section";
import { ArrowLeft, Calendar, TrendingUp, Filter, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { showSupabaseError } from "@/lib/showSupabaseError";
import { useAuth } from "@/hooks/useAuth";

interface EntryDetail {
  id: string;
  entry_date: string;
  paid: boolean;
  player_name: string;
  player_email: string;
  club_name: string;
  competition_name: string;
  entry_fee: number;
  payment_date: string | null;
}

interface RevenueStats {
  totalRevenue: number;
  totalEntries: number;
  monthToDateRevenue: number;
  yearToDateRevenue: number;
}

const RevenueBreakdown = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<EntryDetail[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<EntryDetail[]>([]);
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    totalEntries: 0,
    monthToDateRevenue: 0,
    yearToDateRevenue: 0
  });

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timeFrame, setTimeFrame] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [clubFilter, setClubFilter] = useState("all");
  const [clubs, setClubs] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, timeFrame, dateFrom, dateTo, clubFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Diagnostic logging for development
      if (process.env.NODE_ENV !== 'production') {
        console.log("ADMIN REVENUE BREAKDOWN - Starting data fetch:", {
          userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
          timestamp: new Date().toISOString(),
          operation: "fetchData"
        });
      }

      // Fetch all entries with related data
      const { data: entriesData, error } = await supabase
        .from('entries')
        .select(`
          id,
          entry_date,
          paid,
          payment_date,
          competition_id,
          player_id
        `)
        .order('entry_date', { ascending: false });

      if (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error("ADMIN REVENUE BREAKDOWN ERROR:", {
            location: "RevenueBreakdown.fetchData - entries",
            userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
            operation: "Fetching all entries",
            queryParams: { table: "entries", order: "entry_date desc" },
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            fullError: error
          });
        }
        
        const errorMessage = showSupabaseError(error, "Revenue Breakdown - Entries");
        toast({
          title: "Error",
          description: "Failed to load revenue data",
          variant: "destructive"
        });
        toast({
          title: "Technical Details",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log("ADMIN REVENUE BREAKDOWN SUCCESS - Entries fetched:", {
          count: entriesData?.length || 0,
          operation: "Fetching all entries"
        });
      }

      // Fetch competitions data separately
      const { data: competitionsData, error: competitionsError } = await supabase
        .from('competitions')
        .select(`
          id,
          name,
          entry_fee,
          clubs!inner(name)
        `);

      if (competitionsError) {
        if (process.env.NODE_ENV !== 'production') {
          console.error("ADMIN REVENUE BREAKDOWN ERROR:", {
            location: "RevenueBreakdown.fetchData - competitions",
            userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
            operation: "Fetching competitions with clubs",
            queryParams: { table: "competitions", joins: "clubs" },
            code: competitionsError.code,
            message: competitionsError.message,
            details: competitionsError.details,
            hint: competitionsError.hint,
            fullError: competitionsError
          });
        }
        
        const errorMessage = showSupabaseError(competitionsError, "Revenue Breakdown - Competitions");
        toast({
          title: "Error",
          description: "Failed to load competition data",
          variant: "destructive"
        });
        toast({
          title: "Technical Details",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      // Fetch profiles data separately  
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email
        `);

      if (profilesError) {
        if (process.env.NODE_ENV !== 'production') {
          console.error("ADMIN REVENUE BREAKDOWN ERROR:", {
            location: "RevenueBreakdown.fetchData - profiles",
            userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
            operation: "Fetching player profiles",
            queryParams: { table: "profiles" },
            code: profilesError.code,
            message: profilesError.message,
            details: profilesError.details,
            hint: profilesError.hint,
            fullError: profilesError
          });
        }
        
        const errorMessage = showSupabaseError(profilesError, "Revenue Breakdown - Profiles");
        toast({
          title: "Error",
          description: "Failed to load player data",
          variant: "destructive"
        });
        toast({
          title: "Technical Details",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log("ADMIN REVENUE BREAKDOWN SUCCESS - All data fetched:", {
          competitions: competitionsData?.length || 0,
          profiles: profilesData?.length || 0,
          operation: "Data transformation starting"
        });
      }

      // Transform the data by joining with competitions and profiles
      const transformedEntries: EntryDetail[] = (entriesData || []).map(entry => {
        const competition = competitionsData?.find(c => c.id === entry.competition_id);
        const profile = profilesData?.find(p => p.id === entry.player_id);
        
        return {
          id: entry.id,
          entry_date: entry.entry_date,
          paid: entry.paid,
          payment_date: entry.payment_date,
          player_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown Player',
          player_email: profile?.email || 'Unknown Email',
          club_name: (competition?.clubs as any)?.name || 'Unknown Club',
          competition_name: competition?.name || 'Unknown Competition',
          entry_fee: parseFloat(competition?.entry_fee?.toString() || '0')
        };
      });

      setEntries(transformedEntries);

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      
      const totalEntries = transformedEntries.length;
      const totalRevenue = transformedEntries
        .filter(e => e.paid)
        .reduce((sum, e) => sum + e.entry_fee, 0);
      
      const monthToDateRevenue = transformedEntries
        .filter(e => {
          const entryDate = new Date(e.entry_date);
          return e.paid && entryDate >= startOfMonth && entryDate <= now;
        })
        .reduce((sum, e) => sum + e.entry_fee, 0);
        
      const yearToDateRevenue = transformedEntries
        .filter(e => {
          const entryDate = new Date(e.entry_date);
          return e.paid && entryDate >= startOfYear && entryDate <= now;
        })
        .reduce((sum, e) => sum + e.entry_fee, 0);

      setStats({
        totalRevenue,
        totalEntries,
        monthToDateRevenue,
        yearToDateRevenue
      });

      // Get unique clubs for filter
      const uniqueClubs = Array.from(
        new Set(transformedEntries.map(e => e.club_name))
      )
      .filter(name => name && name.trim() !== '') // Filter out empty names
      .map(name => ({ id: name, name }));
      setClubs(uniqueClubs);

    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("ADMIN REVENUE BREAKDOWN ERROR:", {
          location: "RevenueBreakdown.fetchData - main catch",
          userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
          operation: "Complete data fetch and processing",
          timestamp: new Date().toISOString(),
          fullError: error
        });
      }
      
      const errorMessage = showSupabaseError(error, "Revenue Breakdown");
      toast({
        title: "Error",
        description: "Failed to load revenue breakdown data",
        variant: "destructive"
      });
      toast({
        title: "Technical Details",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log("ADMIN REVENUE BREAKDOWN - Applying filters:", {
        userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
        filters: { timeFrame, dateFrom, dateTo, clubFilter },
        totalEntries: entries.length,
        operation: "applyFilters"
      });
    }
    
    let filtered = [...entries];

    // Time frame filter
    const now = new Date();
    let startDate = new Date(0); // Beginning of time
    let endDate = new Date(); // Now

    switch (timeFrame) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'custom':
        if (dateFrom) startDate = new Date(dateFrom);
        if (dateTo) endDate = new Date(dateTo + 'T23:59:59');
        break;
    }

    filtered = filtered.filter(entry => {
      const entryDate = new Date(entry.entry_date);
      return entryDate >= startDate && entryDate <= endDate;
    });

    // Club filter
    if (clubFilter && clubFilter !== 'all') {
      filtered = filtered.filter(entry => entry.club_name === clubFilter);
    }

    setFilteredEntries(filtered);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log("ADMIN REVENUE BREAKDOWN - Filters applied:", {
        filteredCount: filtered.length,
        originalCount: entries.length,
        appliedFilters: { timeFrame, dateFrom, dateTo, clubFilter }
      });
    }
  };

  const handleTimeFrameChange = (value: string) => {
    setTimeFrame(value as any);
    if (value !== 'custom') {
      setDateFrom("");
      setDateTo("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="lg">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/admin')}
                className="gap-2 bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border-primary/20"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">Revenue Breakdown</h1>
                <p className="text-muted-foreground mt-1">Detailed revenue analysis and player entries</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-8 w-20 mb-2" />
                      <Skeleton className="h-6 w-16" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-800">Total Revenue</p>
                          <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.totalRevenue)}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Entries</p>
                        <p className="text-2xl font-bold">{stats.totalEntries}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Month to Date</p>
                        <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.monthToDateRevenue)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Year to Date</p>
                        <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.yearToDateRevenue)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="timeframe">Time Frame</Label>
                    <Select value={timeFrame} onValueChange={handleTimeFrameChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {timeFrame === 'custom' && (
                    <>
                      <div>
                        <Label htmlFor="dateFrom">From Date</Label>
                        <Input
                          id="dateFrom"
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="dateTo">To Date</Label>
                        <Input
                          id="dateTo"
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <Label htmlFor="club">Club</Label>
                    <Select value={clubFilter} onValueChange={setClubFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Clubs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Clubs</SelectItem>
                        {clubs.map((club) => (
                          <SelectItem key={club.id} value={club.name}>
                            {club.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Entries Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Player Entries ({filteredEntries.length})</CardTitle>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Entry Date</TableHead>
                          <TableHead>Player</TableHead>
                          <TableHead>Club</TableHead>
                          <TableHead>Competition</TableHead>
                          <TableHead>Entry Fee</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEntries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No entries found matching your filters
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredEntries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  {formatDate(entry.entry_date)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{entry.player_name}</div>
                                  <div className="text-sm text-muted-foreground">{entry.player_email}</div>
                                </div>
                              </TableCell>
                              <TableCell>{entry.club_name}</TableCell>
                              <TableCell>{entry.competition_name}</TableCell>
                              <TableCell className="font-medium">{formatCurrency(entry.entry_fee)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </Section>
      </main>
    </div>
  );
};

export default RevenueBreakdown;