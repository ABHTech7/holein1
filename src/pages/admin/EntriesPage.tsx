import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ArrowLeft, Clock, CheckCircle, XCircle, DollarSign, FileText, Trophy, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDate, formatCurrency, formatDateTime } from "@/lib/formatters";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";

interface Entry {
  id: string;
  entry_date: string;
  paid: boolean;
  status: string;
  outcome_self: string | null;
  outcome_official: string | null;
  amount_minor: number | null;
  attempt_window_start: string | null;
  attempt_window_end: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  player: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    age_years: number | null;
    handicap: number | null;
  };
  competition: {
    id: string;
    name: string;
    entry_fee: number;
    club_name: string;
  };
}

const EntriesPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  useEffect(() => {
    fetchEntries();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [entries, searchTerm, statusFilter, paymentFilter]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      
      const { data: entriesData, error } = await supabase
        .from('entries')
        .select(`
          *,
          profiles!entries_player_id_fkey(
            id,
            first_name,
            last_name,
            email,
            age_years,
            handicap
          ),
          competitions!inner(
            id,
            name,
            entry_fee,
            clubs!inner(name)
          )
        `)
        .order('entry_date', { ascending: false });

      if (error) throw error;

      const formattedEntries = (entriesData || []).map(entry => ({
        ...entry,
        player: {
          id: entry.profiles?.id || '',
          first_name: entry.profiles?.first_name || null,
          last_name: entry.profiles?.last_name || null,
          email: entry.profiles?.email || 'unknown@email.com',
          age_years: entry.profiles?.age_years || null,
          handicap: entry.profiles?.handicap || null
        },
        competition: {
          id: entry.competitions?.id || '',
          name: entry.competitions?.name || 'Unknown Competition',
          entry_fee: entry.competitions?.entry_fee || 0,
          club_name: (entry.competitions?.clubs as any)?.name || 'Unknown Club'
        }
      }));

      setEntries(formattedEntries);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast({
        title: "Error",
        description: "Failed to load entries data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = entries;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => {
        const playerName = `${entry.player.first_name || ''} ${entry.player.last_name || ''}`.toLowerCase();
        return (
          playerName.includes(search) ||
          entry.player.email.toLowerCase().includes(search) ||
          entry.competition.name.toLowerCase().includes(search) ||
          entry.competition.club_name.toLowerCase().includes(search)
        );
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(entry => entry.status === statusFilter);
    }

    // Payment filter
    if (paymentFilter !== "all") {
      filtered = filtered.filter(entry => {
        if (paymentFilter === "paid") return entry.paid;
        if (paymentFilter === "unpaid") return !entry.paid;
        return true;
      });
    }

    setFilteredEntries(filtered);
  };

  const getPlayerName = (player: Entry['player']) => {
    if (player.first_name || player.last_name) {
      return `${player.first_name || ''} ${player.last_name || ''}`.trim();
    }
    return 'No name provided';
  };

  const getStatusColor = (status: string, outcome_self: string | null) => {
    // Check outcome_self first for auto_miss
    if (outcome_self === 'auto_miss') return 'destructive';
    
    switch (status.toLowerCase()) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'expired': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusDisplay = (status: string, outcome_self: string | null) => {
    if (outcome_self === 'auto_miss') return 'Auto Missed';
    return status || 'pending';
  };

  const getAttemptWindow = (entry: Entry) => {
    if (entry.attempt_window_start && entry.attempt_window_end) {
      const now = new Date();
      const start = new Date(entry.attempt_window_start);
      const end = new Date(entry.attempt_window_end);
      
      if (now < start) return { status: 'scheduled', text: `Starts ${formatDateTime(entry.attempt_window_start)}` };
      if (now > end) return { status: 'expired', text: `Expired ${formatDateTime(entry.attempt_window_end)}` };
      return { status: 'active', text: `Active until ${formatDateTime(entry.attempt_window_end)}` };
    }
    return { status: 'unknown', text: 'No window set' };
  };

  // Stats calculations
  const totalEntries = entries.length;
  const paidEntries = entries.filter(e => e.paid).length;
  const pendingEntries = entries.filter(e => e.status === 'pending').length;
  const completedEntries = entries.filter(e => e.status === 'completed').length;
  const totalRevenue = entries.filter(e => e.paid).reduce((sum, e) => sum + e.competition.entry_fee, 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <Section className="py-4 md:py-8">
        <div className="space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard/admin')}
                className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground border-none"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">Entry Management</h1>
                <p className="text-sm text-muted-foreground">Monitor and manage all competition entries</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-lg md:text-2xl font-bold">{totalEntries}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Total Entries</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-lg md:text-2xl font-bold text-green-600">{paidEntries}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Paid</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-lg md:text-2xl font-bold text-yellow-600">{pendingEntries}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Pending</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-lg md:text-2xl font-bold text-blue-600">{completedEntries}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Completed</div>
              </CardContent>
            </Card>
            <Card className="col-span-2 md:col-span-1">
              <CardContent className="p-4">
                <div className="text-lg md:text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Revenue</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by player, competition, or club..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                       <SelectItem value="expired">Expired</SelectItem>
                       <SelectItem value="auto_miss">Auto Missed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="w-full md:w-[140px]">
                      <SelectValue placeholder="Payment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payments</SelectItem>
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
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Competition Entries ({filteredEntries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-3 border rounded">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>Player</TableHead>
                         <TableHead className="hidden md:table-cell">Competition</TableHead>
                         <TableHead className="hidden lg:table-cell">Club</TableHead>
                         <TableHead className="hidden xl:table-cell">Age</TableHead>
                         <TableHead className="hidden xl:table-cell">Handicap</TableHead>
                         <TableHead>Entry Date</TableHead>
                         <TableHead>Status</TableHead>
                         <TableHead>Payment</TableHead>
                         <TableHead className="hidden lg:table-cell">Window</TableHead>
                         <TableHead>Fee</TableHead>
                       </TableRow>
                     </TableHeader>
                    <TableBody>
                      {filteredEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                       {searchTerm || statusFilter !== "all" || paymentFilter !== "all" 
                               ? 'No entries found matching your filters.' 
                               : 'No entries found.'}
                           </TableCell>
                         </TableRow>
                       ) : (
                         filteredEntries.map((entry) => {
                           const window = getAttemptWindow(entry);
                           return (
                             <TableRow key={entry.id} className="cursor-pointer hover:bg-muted/50">
                               <TableCell className="font-medium">
                                 <div>
                                   <button
                                     onClick={() => navigate(`/dashboard/admin/players/${entry.player.id}`)}
                                     className="font-medium hover:text-primary hover:underline focus:outline-none focus:text-primary text-left"
                                   >
                                     {getPlayerName(entry.player)}
                                   </button>
                                   <div className="text-xs text-muted-foreground">
                                     {entry.player.email}
                                   </div>
                                   <div className="text-xs text-muted-foreground md:hidden">
                                     {entry.competition.name}
                                   </div>
                                 </div>
                               </TableCell>
                               <TableCell className="hidden md:table-cell">{entry.competition.name}</TableCell>
                               <TableCell className="hidden lg:table-cell">{entry.competition.club_name}</TableCell>
                               <TableCell className="hidden xl:table-cell">
                                 <div className="text-sm">
                                   {entry.player.age_years ? `${entry.player.age_years} years` : 'Not provided'}
                                 </div>
                               </TableCell>
                               <TableCell className="hidden xl:table-cell">
                                 <div className="text-sm">
                                   {entry.player.handicap !== null ? entry.player.handicap : 'Not provided'}
                                 </div>
                               </TableCell>
                               <TableCell>
                                 <div className="text-sm">
                                   {formatDate(entry.entry_date, 'short')}
                                 </div>
                               </TableCell>
                                <TableCell>
                                 <Badge variant={getStatusColor(entry.status, entry.outcome_self)}>
                                   {getStatusDisplay(entry.status, entry.outcome_self)}
                                 </Badge>
                               </TableCell>
                               <TableCell>
                                 <Badge variant={entry.paid ? "default" : "destructive"}>
                                   {entry.paid ? "Paid" : "Unpaid"}
                                 </Badge>
                               </TableCell>
                               <TableCell className="hidden lg:table-cell">
                                 <div className="text-xs">
                                   <Badge variant={window.status === 'active' ? 'default' : 'secondary'}>
                                     {window.text}
                                   </Badge>
                                 </div>
                               </TableCell>
                               <TableCell className="font-medium">
                                 {formatCurrency(entry.competition.entry_fee)}
                               </TableCell>
                             </TableRow>
                           );
                         })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>
      
      <SiteFooter />
    </div>
  );
};

export default EntriesPage;