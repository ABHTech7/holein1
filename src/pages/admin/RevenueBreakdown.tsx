import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SiteHeader from "@/components/layout/SiteHeader";
import Section from "@/components/layout/Section";
import { ArrowLeft, Calendar, TrendingUp, Filter, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/formatters";

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
  paidEntries: number;
  pendingRevenue: number;
}

const RevenueBreakdown = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<EntryDetail[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<EntryDetail[]>([]);
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    totalEntries: 0,
    paidEntries: 0,
    pendingRevenue: 0
  });

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timeFrame, setTimeFrame] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [clubFilter, setClubFilter] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"all" | "paid" | "unpaid">("all");
  const [clubs, setClubs] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, timeFrame, dateFrom, dateTo, clubFilter, paymentStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all entries with related data
      const { data: entriesData, error } = await supabase
        .from('entries')
        .select(`
          id,
          entry_date,
          paid,
          payment_date,
          competitions!inner(
            name,
            entry_fee,
            clubs!inner(
              name
            )
          ),
          profiles!inner(
            first_name,
            last_name,
            email
          )
        `)
        .order('entry_date', { ascending: false });

      if (error) {
        console.error('Error fetching entries:', error);
        toast({
          title: "Error",
          description: "Failed to load revenue data",
          variant: "destructive"
        });
        return;
      }

      // Transform the data
      const transformedEntries: EntryDetail[] = (entriesData || []).map(entry => ({
        id: entry.id,
        entry_date: entry.entry_date,
        paid: entry.paid,
        payment_date: entry.payment_date,
        player_name: `${(entry.profiles as any).first_name || ''} ${(entry.profiles as any).last_name || ''}`.trim() || 'Unknown Player',
        player_email: (entry.profiles as any).email,
        club_name: (entry.competitions as any).clubs.name,
        competition_name: (entry.competitions as any).name,
        entry_fee: parseFloat((entry.competitions as any).entry_fee || '0')
      }));

      setEntries(transformedEntries);

      // Calculate stats
      const totalEntries = transformedEntries.length;
      const paidEntries = transformedEntries.filter(e => e.paid).length;
      const totalRevenue = transformedEntries
        .filter(e => e.paid)
        .reduce((sum, e) => sum + e.entry_fee, 0);
      const pendingRevenue = transformedEntries
        .filter(e => !e.paid)
        .reduce((sum, e) => sum + e.entry_fee, 0);

      setStats({
        totalRevenue,
        totalEntries,
        paidEntries,
        pendingRevenue
      });

      // Get unique clubs for filter
      const uniqueClubs = Array.from(
        new Set(transformedEntries.map(e => e.club_name))
      ).map(name => ({ id: name, name }));
      setClubs(uniqueClubs);

    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
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

    // Payment status filter
    if (paymentStatus !== 'all') {
      filtered = filtered.filter(entry => 
        paymentStatus === 'paid' ? entry.paid : !entry.paid
      );
    }

    setFilteredEntries(filtered);
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
                className="gap-2"
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
                        <p className="text-sm font-medium text-muted-foreground">Paid Entries</p>
                        <p className="text-2xl font-bold text-green-600">{stats.paidEntries}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="p-6">
                      <div>
                        <p className="text-sm font-medium text-orange-800">Pending Revenue</p>
                        <p className="text-2xl font-bold text-orange-900">{formatCurrency(stats.pendingRevenue)}</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                        <SelectItem value="">All Clubs</SelectItem>
                        {clubs.map((club) => (
                          <SelectItem key={club.id} value={club.name}>
                            {club.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="payment">Payment Status</Label>
                    <Select value={paymentStatus} onValueChange={(v: any) => setPaymentStatus(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
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
                        <TableHead>Status</TableHead>
                        <TableHead>Payment Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                            <TableCell>
                              <Badge className={entry.paid 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : 'bg-orange-100 text-orange-800 border-orange-200'
                              }>
                                {entry.paid ? 'Paid' : 'Unpaid'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {entry.payment_date ? formatDate(entry.payment_date) : '-'}
                            </TableCell>
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