import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Mail, Calendar, Trophy, Download, Filter } from "lucide-react";
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
  completed_at: string | null;
  player_email: string;
  player_name: string;
  competition_name: string;
  competition_hole_number: number;
  competition_status: string;
  entry_fee: number;
}

const ClubEntries = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [competitionFilter, setCompetitionFilter] = useState("all");
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([]);
  const [competitions, setCompetitions] = useState<string[]>([]);

  useEffect(() => {
    if (profile?.club_id) {
      fetchEntries();
    }
  }, [profile?.club_id]);

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
                           (statusFilter === "completed" && entry.completed_at);

      const matchesCompetition = competitionFilter === "all" || 
                                entry.competition_name === competitionFilter;
      
      return matchesSearch && matchesStatus && matchesCompetition;
    });
    
    setFilteredEntries(filtered);
  }, [entries, searchTerm, statusFilter, competitionFilter]);

  const fetchEntries = async () => {
    if (!profile?.club_id) return;

    try {
      setLoading(true);

      const { data: entriesData, error } = await supabase
        .from('entries')
        .select(`
          id,
          entry_date,
          paid,
          completed_at,
          competitions!inner(
            name,
            hole_number,
            status,
            entry_fee,
            club_id
          ),
          profiles!inner(
            email,
            first_name,
            last_name
          )
        `)
        .eq('competitions.club_id', profile.club_id)
        .order('entry_date', { ascending: false });

      if (error) throw error;

      const processedEntries = entriesData?.map((entry) => ({
        id: entry.id,
        entry_date: entry.entry_date,
        paid: entry.paid,
        completed_at: entry.completed_at,
        player_email: entry.profiles.email,
        player_name: `${entry.profiles.first_name || ''} ${entry.profiles.last_name || ''}`.trim() || entry.profiles.email,
        competition_name: entry.competitions.name,
        competition_hole_number: entry.competitions.hole_number,
        competition_status: entry.competitions.status,
        entry_fee: entry.competitions.entry_fee
      })) || [];

      setEntries(processedEntries);

      // Extract unique competition names
      const uniqueCompetitions = [...new Set(processedEntries.map(entry => entry.competition_name))];
      setCompetitions(uniqueCompetitions);

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

  const getCompletionStatus = (entry: Entry) => {
    if (entry.completed_at) return { label: "COMPLETED", variant: "default" as const };
    return { label: "IN PROGRESS", variant: "outline" as const };
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="lg">
          <Container>
            <div className="space-y-8">
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
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={competitionFilter} onValueChange={setCompetitionFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by competition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Competitions</SelectItem>
                        {competitions.map((comp) => (
                          <SelectItem key={comp} value={comp}>{comp}</SelectItem>
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
                          <TableHead>Progress</TableHead>
                          <TableHead>Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEntries.map((entry) => {
                          const paymentStatus = getPaymentStatus(entry);
                          const completionStatus = getCompletionStatus(entry);
                          
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
                                <Badge variant={completionStatus.variant}>
                                  {completionStatus.label}
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