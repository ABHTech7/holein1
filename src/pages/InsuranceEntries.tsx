import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar,
  Download,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import useAuth from '@/hooks/useAuth';
import SiteHeader from '@/components/layout/SiteHeader';
import Section from '@/components/layout/Section';
import { useNavigate } from 'react-router-dom';

interface InsuranceEntry {
  competition_name: string;
  entry_date: string;
  player_first_name: string;
  player_last_name: string;
}

const InsuranceEntries = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<InsuranceEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<InsuranceEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 50;

  const monthStart = new Date(selectedMonth + '-01');
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

  useEffect(() => {
    if (!user) return;
    fetchEntries();
  }, [user, selectedMonth]);

  useEffect(() => {
    // Filter entries based on search term
    if (searchTerm) {
      const filtered = entries.filter(entry =>
        entry.player_first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.player_last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.competition_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEntries(filtered);
    } else {
      setFilteredEntries(entries);
    }
    setCurrentPage(1); // Reset to first page when search changes
  }, [entries, searchTerm]);

  const fetchEntries = async () => {
    try {
      setLoading(true);

      // Get user's insurance company first
      const { data: insuranceUser, error: userError } = await supabase
        .from('insurance_users')
        .select('insurance_company_id')
        .eq('user_id', user.id)
        .eq('active', true)
        .single();

      if (userError) throw userError;

      if (!insuranceUser) {
        toast({
          title: "Access Denied",
          description: "You don't have access to insurance data.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      // Get entries data for the selected month
      const { data: entriesData, error: entriesError } = await supabase
        .rpc('get_insurance_entries_data', {
          company_id: insuranceUser.insurance_company_id,
          month_start: monthStart.toISOString().split('T')[0],
          month_end: monthEnd.toISOString().split('T')[0]
        });

      if (entriesError) throw entriesError;
      setEntries(entriesData || []);

    } catch (error) {
      console.error('Error fetching entries:', error);
      toast({
        title: "Error",
        description: "Failed to load entries data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (filteredEntries.length === 0) {
      toast({
        title: "No Data",
        description: "No entries to export for the selected period.",
        variant: "destructive"
      });
      return;
    }

    // Create CSV content
    const headers = ['Entry Date (GMT)', 'Player First Name', 'Player Last Name', 'Competition'];
    const csvContent = [
      headers.join(','),
      ...filteredEntries.map(entry =>
        [
          new Date(entry.entry_date).toISOString(),
          entry.player_first_name,
          entry.player_last_name,
          entry.competition_name
        ].join(',')
      )
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `insurance_entries_${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "Entries exported successfully"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Section spacing="lg">
            <div className="max-w-7xl mx-auto space-y-6">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-64" />
            </div>
          </Section>
        </main>
      </div>
    );
  }

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentEntries = filteredEntries.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1 bg-muted/30">
        <Section spacing="lg">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Insurance Entries</h1>
                <p className="text-muted-foreground">View all entries covered by your insurance policy</p>
              </div>
              <Button variant="outline" onClick={() => navigate('/dashboard/insurance')}>
                ← Back to Dashboard
              </Button>
            </div>

            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Filter Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Search by player name or competition ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="month">Month</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(12)].map((_, i) => {
                          const date = new Date();
                          date.setMonth(date.getMonth() - i);
                          const value = date.toISOString().slice(0, 7);
                          const label = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                          return (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleExport} disabled={filteredEntries.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Entries Table */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    Entries ({filteredEntries.length.toLocaleString()})
                  </CardTitle>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entry Date (GMT)</TableHead>
                      <TableHead>Player Name</TableHead>
                      <TableHead>Competition</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentEntries.map((entry, index) => (
                      <TableRow key={`${entry.competition_name}-${entry.entry_date}-${index}`}>
                        <TableCell>
                          {new Date(entry.entry_date).toLocaleString('en-GB', { 
                            timeZone: 'UTC',
                            year: 'numeric',
                            month: '2-digit', 
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          {entry.player_first_name} {entry.player_last_name}
                        </TableCell>
                        <TableCell>
                          {entry.competition_name}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredEntries.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No entries match your search criteria.' : 'No entries found for the selected period.'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </Section>
      </main>
    </div>
  );
};

export default InsuranceEntries;