import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Download,
  FileText,
  Calendar,
  PoundSterling,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import useAuth from '@/hooks/useAuth';
import SiteHeader from '@/components/layout/SiteHeader';
import Section from '@/components/layout/Section';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface InsurancePremium {
  id: string;
  period_start: string;
  period_end: string;
  total_entries: number;
  premium_rate: number;
  total_premium_amount: number;
  status: string;
  generated_at: string;
  payment_required_at?: string | null;
}

interface MonthlyStats {
  month: string;
  entries: number;
  premium: number;
}

const InsuranceReports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [premiums, setPremiums] = useState<InsurancePremium[]>([]);
  const [yearlyStats, setYearlyStats] = useState<MonthlyStats[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchReportsData();
  }, [user, selectedYear]);

  const fetchReportsData = async () => {
    try {
      setLoading(true);

      // Get user's insurance company
      const { data: insuranceUser, error: userError } = await supabase
        .from('insurance_users')
        .select(`
          insurance_companies (
            id,
            name,
            premium_rate_per_entry
          )
        `)
        .eq('user_id', user.id)
        .eq('active', true)
        .single();

      if (userError) throw userError;

      if (!insuranceUser?.insurance_companies) {
        toast({
          title: "Access Denied",
          description: "You don't have access to insurance data.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      const company = insuranceUser.insurance_companies as any;
      setCompanyName(company.name);

      // Get premiums for the selected year
      const { data: premiumsData, error: premiumsError } = await supabase
        .from('insurance_premiums')
        .select('*')
        .eq('insurance_company_id', company.id)
        .gte('period_start', `${selectedYear}-01-01`)
        .lte('period_end', `${selectedYear}-12-31`)
        .order('period_start', { ascending: false });

      if (premiumsError) throw premiumsError;
      setPremiums(premiumsData || []);

      // Get entries for the selected year to calculate current-month premiums
      const yearStart = `${selectedYear}-01-01`;
      const yearEnd = `${selectedYear}-12-31`;
      
      const { data: yearEntries, error: entriesError } = await supabase
        .from('entries')
        .select('entry_date, paid')
        .gte('entry_date', yearStart)
        .lte('entry_date', yearEnd)
        .eq('paid', true);

      if (entriesError) throw entriesError;

      // Generate monthly stats directly from entries for current data
      const monthlyStats: MonthlyStats[] = [];
      for (let month = 0; month < 12; month++) {
        const monthDate = new Date(parseInt(selectedYear), month, 1);
        
        // Use string-based date comparisons to avoid timezone issues
        const monthStartStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}-01`;
        const nextMonth = month === 11 ? 1 : month + 2;
        const nextYear = month === 11 ? parseInt(selectedYear) + 1 : parseInt(selectedYear);
        const monthEndStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
        
        // Count entries in this month using string comparison
        const monthEntries = (yearEntries || []).filter(e => {
          const entryDateStr = e.entry_date.split('T')[0]; // Get YYYY-MM-DD part
          return entryDateStr >= monthStartStr && entryDateStr < monthEndStr;
        });

        const entriesCount = monthEntries.length;
        const premiumAmount = entriesCount * company.premium_rate_per_entry;

        monthlyStats.push({
          month: monthDate.toLocaleDateString('en-GB', { month: 'short' }),
          entries: entriesCount,
          premium: premiumAmount
        });
      }

      setYearlyStats(monthlyStats);

    } catch (error) {
      console.error('Error fetching reports data:', error);
      toast({
        title: "Error",
        description: "Failed to load reports data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPremiums = () => {
    if (premiums.length === 0) {
      toast({
        title: "No Data",
        description: "No premium data to export.",
        variant: "destructive"
      });
      return;
    }

    // Create CSV content
    const headers = ['Period Start', 'Period End', 'Total Entries', 'Premium Rate (£)', 'Total Premium (£)', 'Status', 'Generated Date'];
    const csvContent = [
      headers.join(','),
      ...premiums.map(premium =>
        [
          premium.period_start,
          premium.period_end,
          premium.total_entries,
          premium.premium_rate.toFixed(2),
          premium.total_premium_amount.toFixed(2),
          premium.status,
          formatDate(premium.generated_at)
        ].join(',')
      )
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `insurance_premiums_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "Premium report exported successfully"
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

  const totalEntries = yearlyStats.reduce((sum, stat) => sum + stat.entries, 0);
  const totalPremiums = yearlyStats.reduce((sum, stat) => sum + stat.premium, 0);
  const averageMonthlyEntries = totalEntries / 12;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1 bg-muted/30">
        <Section spacing="lg">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Insurance Reports</h1>
                <p className="text-muted-foreground">{companyName} - Annual premium and entry analysis</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate('/dashboard/insurance')}>
                  ← Dashboard
                </Button>
                <Button onClick={handleExportPremiums}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>

            {/* Year Selector */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Label htmlFor="year">Report Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(5)].map((_, i) => {
                        const year = (new Date().getFullYear() - i).toString();
                        return (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Annual Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Entries ({selectedYear})</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalEntries.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Avg {Math.round(averageMonthlyEntries)}/month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Premiums ({selectedYear})</CardTitle>
                  <PoundSterling className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalPremiums)}</div>
                  <p className="text-xs text-muted-foreground">
                    Calculated premiums
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    £{totalEntries > 0 ? (totalPremiums / totalEntries).toFixed(2) : '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per entry
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Breakdown ({selectedYear})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Entries</TableHead>
                      <TableHead>Premium Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yearlyStats.map((stat, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{stat.month} {selectedYear}</TableCell>
                        <TableCell>{stat.entries.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(stat.premium)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Premium History */}
            <Card>
              <CardHeader>
                <CardTitle>Premium Payment History</CardTitle>
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
                      <TableHead>Generated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {premiums.map((premium) => (
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
                        <TableCell>{formatDate(premium.generated_at)}</TableCell>
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

export default InsuranceReports;