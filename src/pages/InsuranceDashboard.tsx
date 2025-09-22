import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Calendar, 
  PoundSterling, 
  Users, 
  TrendingUp,
  Download,
  Eye,
  Trophy
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import useAuth from '@/hooks/useAuth';
import SiteHeader from '@/components/layout/SiteHeader';
import Section from '@/components/layout/Section';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface InsuranceCompany {
  id: string;
  name: string;
  logo_url: string | null;
  premium_rate_per_entry: number;
}

interface InsuranceEntry {
  competition_id: string;
  entry_date: string;
  player_first_name: string;
  player_last_name: string;
}

interface InsurancePremium {
  id: string;
  period_start: string;
  period_end: string;
  total_entries: number;
  premium_rate: number;
  total_premium_amount: number;
  status: string;
  generated_at: string;
}

const InsuranceDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<InsuranceCompany | null>(null);
  const [entries, setEntries] = useState<InsuranceEntry[]>([]);
  const [premiums, setPremiums] = useState<InsurancePremium[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Get current month date range
  const monthStart = new Date(selectedMonth + '-01');
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

  useEffect(() => {
    if (!user) return;

    const fetchInsuranceData = async () => {
      try {
        // Get the single active insurance company (simplified approach)
        const { data: companyData, error: companyError } = await supabase
          .from('insurance_companies')
          .select('*')
          .eq('active', true)
          .single();

        if (companyError) {
          if (companyError.code === 'PGRST116') {
            // No active insurance company found
            toast({
              title: "No Insurance Partner",
              description: "No active insurance partner is currently configured.",
              variant: "destructive"
            });
          } else {
            throw companyError;
          }
          navigate('/');
          return;
        }

        setCompany(companyData);

        // Get entries data for the selected month
        const { data: entriesData, error: entriesError } = await supabase
          .rpc('get_insurance_entries_data', {
            company_id: companyData.id,
            month_start: monthStart.toISOString().split('T')[0],
            month_end: monthEnd.toISOString().split('T')[0]
          });

        if (entriesError) throw entriesError;
        setEntries(entriesData || []);

        // Get premiums data
        const { data: premiumsData, error: premiumsError } = await supabase
          .from('insurance_premiums')
          .select('*')
          .eq('insurance_company_id', companyData.id)
          .order('period_start', { ascending: false })
          .limit(12);

        if (premiumsError) throw premiumsError;
        setPremiums(premiumsData || []);

      } catch (error) {
        console.error('Error fetching insurance data:', error);
        toast({
          title: "Error",
          description: "Failed to load insurance dashboard data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInsuranceData();
  }, [user, selectedMonth, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Section spacing="lg">
            <div className="max-w-7xl mx-auto space-y-6">
              <Skeleton className="h-8 w-64" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
              <Skeleton className="h-64" />
            </div>
          </Section>
        </main>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Insurance Partner</h1>
          <p className="text-muted-foreground">No active insurance partner is configured.</p>
        </div>
      </div>
    );
  }

  const currentMonthEntries = entries.length;
  const currentMonthPremium = currentMonthEntries * company.premium_rate_per_entry;
  const totalPremiumsYTD = premiums.reduce((sum, p) => sum + parseFloat(p.total_premium_amount.toString()), 0);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1 bg-muted/30">
        <Section spacing="lg">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Logo */}
            <div className="flex items-center space-x-2 mb-2">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-primary rounded-lg">
                <Trophy className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-semibold text-foreground">
                Official Hole in 1
              </span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {company.logo_url && (
                  <img 
                    src={company.logo_url} 
                    alt={company.name}
                    className="w-12 h-12 rounded-lg object-contain bg-white p-2"
                  />
                )}
                <div>
                  <h1 className="text-3xl font-bold">{company.name}</h1>
                  <p className="text-muted-foreground">Insurance Premium Dashboard</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate('/dashboard/insurance/reports')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Reports
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard/insurance/premiums')}>
                  <PoundSterling className="w-4 h-4 mr-2" />
                  All Premiums
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Month Entries</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentMonthEntries.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Premium Due</CardTitle>
                  <PoundSterling className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(currentMonthPremium)}</div>
                  <p className="text-xs text-muted-foreground">
                    @ £{company.premium_rate_per_entry.toFixed(2)} per entry
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">YTD Premiums</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalPremiumsYTD)}</div>
                  <p className="text-xs text-muted-foreground">
                    Year to date total
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Entries Table */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Monthly Entries</CardTitle>
                  <div className="flex gap-3">
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
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entry Date (GMT)</TableHead>
                      <TableHead>Player Name</TableHead>
                      <TableHead>Competition ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.slice(0, 50).map((entry, index) => (
                      <TableRow key={index}>
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
                        <TableCell className="font-mono text-sm">
                          {entry.competition_id}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {entries.length > 50 && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" onClick={() => navigate('/dashboard/insurance/entries')}>
                      <Eye className="w-4 h-4 mr-2" />
                      View All {entries.length.toLocaleString()} Entries
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Premiums */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Premium Calculations</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Entries</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {premiums.slice(0, 6).map((premium) => (
                      <TableRow key={premium.id}>
                        <TableCell>
                          {formatDate(premium.period_start)} - {formatDate(premium.period_end)}
                        </TableCell>
                        <TableCell>{premium.total_entries.toLocaleString()}</TableCell>
                        <TableCell>£{premium.premium_rate.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(premium.total_premium_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              premium.status === 'paid' ? 'default' :
                              premium.status === 'approved' ? 'secondary' : 'outline'
                            }
                          >
                            {premium.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </Section>
      </main>
    </div>
  );
};

export default InsuranceDashboard;