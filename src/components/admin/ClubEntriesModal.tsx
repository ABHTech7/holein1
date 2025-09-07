import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Mail, Calendar, Trophy, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDate, formatDateTime, obfuscateEmail } from "@/lib/formatters";

interface ClubEntriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
}

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

const ClubEntriesModal = ({ isOpen, onClose, clubId }: ClubEntriesModalProps) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([]);

  useEffect(() => {
    if (isOpen && clubId) {
      fetchEntries();
    }
  }, [isOpen, clubId]);

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
      
      return matchesSearch && matchesStatus;
    });
    
    setFilteredEntries(filtered);
  }, [entries, searchTerm, statusFilter]);

  const fetchEntries = async () => {
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
        .eq('competitions.club_id', clubId)
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            All Competition Entries ({entries.length})
          </DialogTitle>
        </DialogHeader>

        <div className="flex-shrink-0 mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by player name, email, or competition..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
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
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-3 border rounded">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
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
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm || statusFilter !== "all" 
                        ? 'No entries found matching your filters.' 
                        : 'No entries found for your competitions.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => {
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
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex justify-between items-center gap-3 pt-4 border-t flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            Showing {filteredEntries.length} of {entries.length} entries
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClubEntriesModal;