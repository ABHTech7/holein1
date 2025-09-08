import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Mail, Calendar, Trophy, Download, Filter, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDate, formatDateTime, obfuscateEmail } from "@/lib/formatters";
import { useAuth } from "@/hooks/useAuth";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import EmptyState from "@/components/ui/empty-state";

interface Entry {
  id: string;
  entry_date: string;
  paid: boolean;
  status: string;
  outcome_self: string | null;
  completed_at: string | null;
  player_email: string;
  player_name: string;
  competition_id: string;
  competition_name: string;
  competition_hole_number: number;
  competition_status: string;
  entry_fee: number;
}

const ClubEntries = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [competitionFilter, setCompetitionFilter] = useState("all");
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([]);
  const [competitions, setCompetitions] = useState<{id: string, name: string}[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>("");
  const [selectedCompetitionName, setSelectedCompetitionName] = useState<string>("");

  // Handle URL query parameters for competition filtering
  useEffect(() => {
    const competitionId = searchParams.get('competition');
    if (competitionId) {
      setSelectedCompetitionId(competitionId);
      setCompetitionFilter(competitionId); // Filter by ID instead of name
    }
  }, [searchParams]);

  useEffect(() => {
    if (profile && (profile?.club_id || profile?.role === 'ADMIN')) {
      fetchEntries();
    }
  }, [profile?.club_id, profile?.role]);

  useEffect(() => {
    let filtered = entries.filter(entry => {
      const fullName = entry.player_name.toLowerCase();
      const email = entry.player_email.toLowerCase();
      const competitionName = entry.competition_name.toLowerCase();
      const search = searchTerm.toLowerCase();
      
      const matchesSearch = fullName.includes(search) || 
                           email.includes(search) || 
                           competitionName.includes(search);
      
      const matchesStatus = statusFilter === "all" || 
                           (statusFilter === "paid" && entry.paid) ||
                           (statusFilter === "unpaid" && !entry.paid && entry.entry_fee > 0) ||
                           (statusFilter === "free" && entry.entry_fee === 0) ||
                           (statusFilter === "completed" && (entry.outcome_self || entry.status === 'expired')) ||
                           (statusFilter === "active" && entry.paid && !entry.outcome_self && entry.status !== 'expired');

      const matchesCompetition = competitionFilter === "all" || 
                                entry.competition_id === competitionFilter ||
                                entry.competition_name === competitionFilter;
      
      return matchesSearch && matchesStatus && matchesCompetition;
    });
    
    setFilteredEntries(filtered);
  }, [entries, searchTerm, statusFilter, competitionFilter]);

  const fetchEntries = async () => {
    if (!profile?.club_id && profile?.role !== 'ADMIN') return;

    try {
      setLoading(true);

      let query = supabase
        .from('entries')
        .select(`
          id,
          entry_date,
          paid,
          status,
          outcome_self,
          completed_at,
          competition_id,
          player_id,
          competitions!inner(
            id,
            name,
            hole_number,
            status,
            entry_fee,
            club_id
          ),
          profiles!inner(
            id,
            email,
            first_name,
            last_name
          )
        `);

      // Filter by club_id only for club members, admins see all
      if (profile?.role !== 'ADMIN' && profile?.club_id) {
        query = query.eq('competitions.club_id', profile.club_id);
      }

      const { data: entriesData, error } = await query
        .order('entry_date', { ascending: false });

      console.log('ClubEntries query:', {
        error,
        dataLength: entriesData?.length || 0,
        clubId: profile.club_id,
        competitionIdParam: searchParams.get('competition'),
        rawData: entriesData?.slice(0, 3), // Show first 3 entries for debugging
        userRole: profile?.role,
        isAdmin: profile?.role === 'ADMIN'
      });

      if (error) throw error;

      const processedEntries = entriesData?.map((entry) => ({
        id: entry.id,
        entry_date: entry.entry_date,
        paid: entry.paid,
        status: entry.status || 'pending',
        outcome_self: entry.outcome_self,
        completed_at: entry.completed_at,
        player_email: entry.profiles?.email || 'unknown@email.com',
        player_name: entry.profiles?.first_name && entry.profiles?.last_name 
          ? `${entry.profiles?.first_name} ${entry.profiles?.last_name}`.trim()
          : entry.profiles?.first_name || entry.profiles?.email || 'Unknown User',
        competition_id: entry.competitions.id,
        competition_name: entry.competitions.name,
        competition_hole_number: entry.competitions.hole_number,
        competition_status: entry.competitions.status,
        entry_fee: entry.competitions.entry_fee
      })) || [];

      setEntries(processedEntries);

      // Extract unique competitions with IDs and names
      const uniqueCompetitions = entriesData?.reduce((acc, entry) => {
        const existing = acc.find(c => c.id === entry.competitions.id);
        if (!existing) {
          acc.push({
            id: entry.competitions.id,
            name: entry.competitions.name
          });
        }
        return acc;
      }, [] as {id: string, name: string}[]) || [];
      
      setCompetitions(uniqueCompetitions);

      // Set selected competition name if filtering by ID
      if (selectedCompetitionId) {
        const selectedComp = uniqueCompetitions.find(c => c.id === selectedCompetitionId);
        if (selectedComp) {
          setSelectedCompetitionName(selectedComp.name);
        }
      }

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

  const handleDownloadReport = () => {
    // TODO: Implement CSV export
    toast({
      title: 'Coming Soon',
      description: 'CSV report download will be available soon',
    });
  };

  const getPaymentStatus = (entry: Entry) => {
    if (entry.entry_fee === 0) return { label: "FREE", variant: "outline" as const };
    if (entry.paid) return { label: "PAID", variant: "default" as const };
    return { label: "PENDING", variant: "secondary" as const };
  };

  const getEntryStatus = (entry: Entry) => {
    // Check outcome first (most specific)
    if (entry.outcome_self === 'win') {
      return { label: "WIN CLAIMED", variant: "default" as const, color: "text-green-600" };
    }
    if (entry.outcome_self === 'miss') {
      return { label: "MISSED", variant: "secondary" as const, color: "text-gray-600" };
    }
    if (entry.outcome_self === 'auto_miss') {
      return { label: "AUTO-MISSED", variant: "secondary" as const, color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800" };
    }
    
    // Check database status
    if (entry.status === 'expired') {
      return { label: "EXPIRED", variant: "destructive" as const, color: "text-red-600" };
    }
    if (entry.status === 'paid') {
      return { label: "ACTIVE", variant: "default" as const, color: "text-blue-600" };
    }
    if (entry.status === 'pending' && entry.paid) {
      return { label: "ACTIVE", variant: "default" as const, color: "text-blue-600" };
    }
    
    // Fallback to payment status
    if (!entry.paid && entry.entry_fee > 0) {
      return { label: "PAYMENT PENDING", variant: "outline" as const, color: "text-orange-600" };
    }
    
    return { label: "PENDING", variant: "outline" as const, color: "text-gray-600" };
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="lg">
          <Container>
            <div className="space-y-8">
              {/* Back Button */}
              <div className="flex items-center gap-4 mb-6">
                <Button
                  variant="outline"
                  onClick={() => navigate(selectedCompetitionName ? '/dashboard/club/competitions' : '/dashboard/club')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {selectedCompetitionName ? 'Back to Competitions' : 'Back to Dashboard'}
                </Button>
                
                {selectedCompetitionName && (
                  <Badge variant="secondary" className="text-sm">
                    Filtered by: {selectedCompetitionName}
                  </Badge>
                )}
              </div>

              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground">Competition Entries</h1>
                  <p className="text-muted-foreground mt-1">
                    View and manage all entries for your competitions ({entries.length} total)
                  </p>
                </div>
                
                <Button variant="outline" onClick={handleDownloadReport} className="gap-2">
                  <Download className="w-4 h-4" />
                  Download Report (CSV)
                </Button>
              </div>

              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search by player name, email, or competition..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="all">All Entries</SelectItem>
                         <SelectItem value="paid">Paid Only</SelectItem>
                         <SelectItem value="unpaid">Pending Payment</SelectItem>
                         <SelectItem value="free">Free Entries</SelectItem>
                         <SelectItem value="active">Active Attempts</SelectItem>
                         <SelectItem value="completed">Completed/Finished</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={competitionFilter} onValueChange={setCompetitionFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by competition" />
                      </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">All Competitions</SelectItem>
                        {competitions.map((comp) => (
                          <SelectItem key={comp.id} value={comp.id}>{comp.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>

                    <div className="text-sm text-muted-foreground flex items-center">
                      Showing {filteredEntries.length} of {entries.length} entries
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Entries Table */}
              <Card>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-6 space-y-3">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-3 border rounded">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : filteredEntries.length === 0 ? (
                    <div className="p-6">
                      <EmptyState
                        title={searchTerm || statusFilter !== "all" || competitionFilter !== "all" 
                          ? "No entries found" 
                          : "No entries yet"}
                        description={searchTerm || statusFilter !== "all" || competitionFilter !== "all"
                          ? "No entries match your current filters. Try adjusting your search criteria."
                          : "Entries will appear here when players join your competitions"}
                      />
                    </div>
                  ) : (
                    <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead>Player</TableHead>
                           <TableHead>Competition</TableHead>
                           <TableHead>Hole #</TableHead>
                           <TableHead>Entry Date</TableHead>
                           <TableHead>Payment Status</TableHead>
                           <TableHead>Entry Status</TableHead>
                           <TableHead>Email</TableHead>
                         </TableRow>
                       </TableHeader>
                      <TableBody>
                         {filteredEntries.map((entry) => {
                           const paymentStatus = getPaymentStatus(entry);
                           const entryStatus = getEntryStatus(entry);
                           
                           return (
                             <TableRow key={entry.id}>
                               <TableCell className="font-medium">
                                 {entry.player_name}
                               </TableCell>
                               <TableCell>{entry.competition_name}</TableCell>
                               <TableCell className="text-center font-mono">
                                 {entry.competition_hole_number}
                               </TableCell>
                               <TableCell>
                                 <div className="flex items-center gap-2">
                                   <Calendar className="w-4 h-4 text-muted-foreground" />
                                   {formatDateTime(entry.entry_date)}
                                 </div>
                               </TableCell>
                               <TableCell>
                                 <Badge variant={paymentStatus.variant}>
                                   {paymentStatus.label}
                                 </Badge>
                               </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={entryStatus.variant} 
                                    className={`${entryStatus.color} font-medium`}
                                  >
                                    {entryStatus.label}
                                  </Badge>
                                </TableCell>
                               <TableCell>
                                 <div className="flex items-center gap-2">
                                   <Mail className="w-4 h-4 text-muted-foreground" />
                                   {obfuscateEmail(entry.player_email)}
                                 </div>
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

export default ClubEntries;