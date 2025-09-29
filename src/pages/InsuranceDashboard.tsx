import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChartWrapper from '@/components/ui/chart-wrapper';
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
  competition_name: string;
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

interface MonthlyData {
  month: string;
  entries: number;
  premiums: number;
}

const InsuranceDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<InsuranceCompany | null>(null);
  const [entries, setEntries] = useState<InsuranceEntry[]>([]);
  const [premiums, setPremiums] = useState<InsurancePremium[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [ytdPremiumPence, setYtdPremiumPence] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [actualCurrentMonthCount, setActualCurrentMonthCount] = useState(0);
  const entriesPerPage = 15;

  // Get current month date range in UTC to avoid timezone issues
  const [yearStr, monthStr] = selectedMonth.split('-');
  const ymYear = Number(yearStr);
  const ymMonthIndex = Number(monthStr) - 1;
  const monthStartDate = new Date(Date.UTC(ymYear, ymMonthIndex, 1));
  const monthEndDate = new Date(Date.UTC(ymYear, ymMonthIndex + 1, 0));
  const monthStartStr = monthStartDate.toISOString().slice(0, 10);
  const monthEndStr = monthEndDate.toISOString().slice(0, 10);

  const fetchMonthlyData = async (company: InsuranceCompany) => {
    try {
      const currentYear = new Date().getFullYear();
      const months = [];
      
      // Get data for each month of the current year
        for (let month = 0; month < 12; month++) {
          const startDate = new Date(Date.UTC(currentYear, month, 1));
          const endDate = new Date(Date.UTC(currentYear, month + 1, 0));
          
          const { data: monthEntries, error } = await supabase
            .rpc('get_insurance_entries_data', {
              company_id: company.id,
              month_start: startDate.toISOString().slice(0, 10),
              month_end: endDate.toISOString().slice(0, 10),
              include_demo: true
            });

          if (error) throw error;

          const monthName = startDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
          const entriesCount = monthEntries?.length || 0;
          const premiums = entriesCount * company.premium_rate_per_entry;

          months.push({
            month: monthName,
            entries: entriesCount,
            premiums: premiums
          });
        }

      setMonthlyData(months);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
    }
  };

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

        // Fetch monthly chart data
        await fetchMonthlyData(companyData);

        // Get entries data for the selected month using RPC (for display data with names)
        const { data: entriesData, error: entriesError } = await supabase
          .rpc('get_insurance_entries_data', {
            company_id: companyData.id,
            month_start: monthStartStr,
            month_end: monthEndStr,
            include_demo: true
          });

        if (entriesError) throw entriesError;
        setEntries(entriesData || []);

        // Compute YTD premium using RPC (respects RLS)
        const now = new Date();
        const yearStartDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
        const yearStartStr = yearStartDate.toISOString().slice(0, 10);
        const todayStr = now.toISOString().slice(0, 10);
        const { data: ytdEntries, error: ytdError } = await supabase
          .rpc('get_insurance_entries_data', {
            company_id: companyData.id,
            month_start: yearStartStr,
            month_end: todayStr,
            include_demo: true
          });
        if (ytdError) {
          console.warn('YTD entries fetch error:', ytdError);
          setYtdPremiumPence(0);
        } else {
          const actualYtdCount = (ytdEntries?.length || 0);
          setYtdPremiumPence(Math.round(actualYtdCount * Number(companyData.premium_rate_per_entry) * 100));
        }

        // Get premiums data (optional, for historical list if needed elsewhere)
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

  // Reset to page 1 when month changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth]);

  // Fetch actual current month count directly from DB for accurate calculations
  useEffect(() => {
    if (!company) return;
    
    const fetchCurrentMonthCount = async () => {
      // Use RPC to get accurate count that respects access control
      const { data: currentMonthEntries, error } = await supabase
        .rpc('get_insurance_entries_data', {
          company_id: company.id,
          month_start: monthStartStr,
          month_end: monthEndStr,
          include_demo: true
        });
      
      if (!error) {
        setActualCurrentMonthCount(currentMonthEntries?.length || 0);
      } else {
        console.warn('Current month count error:', error);
        setActualCurrentMonthCount(entries.length);
      }
    };
    
    fetchCurrentMonthCount();
  }, [company, selectedMonth, monthStartStr, monthEndStr]);

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

  

  const currentMonthEntries = actualCurrentMonthCount;
  const currentMonthPremium = currentMonthEntries * (company?.premium_rate_per_entry || 0);
  
  // YTD premium computed from YTD entries fetched server-side

  // Pagination calculations
  const totalPages = Math.ceil(currentMonthEntries / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentEntries = entries.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };


  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1 bg-muted/30">
        <Section spacing="lg">
          <div className="max-w-7xl mx-auto space-y-8">
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
                    {monthStartDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Premium Due</CardTitle>
                  <PoundSterling className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(currentMonthPremium * 100)}</div>
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
                  <div className="text-2xl font-bold">{formatCurrency(ytdPremiumPence)}</div>
                  <p className="text-xs text-muted-foreground">
                    Year to date total
                  </p>
                </CardContent>
              </Card>
            </div>

             {/* Monthly Growth Chart */}
             <Card>
               <CardHeader>
                 <CardTitle>Monthly Premium Growth</CardTitle>
                 <p className="text-sm text-muted-foreground">Premium totals by month for the current year</p>
               </CardHeader>
               <CardContent>
                 <div className="h-64 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                     <XAxis 
                       dataKey="month" 
                       fontSize={12}
                       tickLine={false}
                       axisLine={false}
                     />
                     <YAxis 
                       tickFormatter={(value) => `£${(value as number).toFixed(0)}`}
                       fontSize={12}
                       tickLine={false}
                       axisLine={false}
                       width={60}
                     />
                     <Tooltip 
                       formatter={(value: number, name: string) => [
                         name === 'premiums' ? `£${(value as number).toFixed(2)}` : (value as number).toLocaleString(),
                         name === 'premiums' ? 'Premiums' : 'Entries'
                       ]}
                       labelStyle={{ color: 'hsl(var(--foreground))' }}
                       contentStyle={{ 
                         backgroundColor: 'hsl(var(--background))', 
                         border: '1px solid hsl(var(--border))',
                         borderRadius: '6px'
                       }}
                     />
                    <Line 
                      type="monotone" 
                      dataKey="premiums" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                    />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
             </CardContent>
           </Card>

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
                          const now = new Date();
                          const utcFirstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
                          const value = utcFirstOfMonth.toISOString().slice(0, 7);
                          const label = utcFirstOfMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
                          return (
                            <SelectItem key={`${value}-${i}`} value={value}>
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
               <CardContent className="p-0">
                 <div className="overflow-x-auto">
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead className="min-w-[140px]">Entry Date (GMT)</TableHead>
                         <TableHead className="min-w-[120px]">Player Name</TableHead>
                         <TableHead className="min-w-[150px]">Competition</TableHead>
                       </TableRow>
                     </TableHeader>
                   <TableBody>
                     {currentEntries.map((entry, index) => (
                       <TableRow key={startIndex + index}>
                         <TableCell className="font-mono text-sm">
                           {new Date(entry.entry_date).toLocaleString('en-GB', { 
                             timeZone: 'UTC',
                             year: 'numeric',
                             month: '2-digit', 
                             day: '2-digit',
                             hour: '2-digit',
                             minute: '2-digit'
                           })}
                         </TableCell>
                         <TableCell className="font-medium">
                           {entry.player_first_name} {entry.player_last_name}
                         </TableCell>
                         <TableCell>
                           {entry.competition_name}
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
                 </div>
                 
                 {/* Pagination */}
                 {totalPages > 1 && (
                   <div className="mt-4 px-6 pb-4 flex items-center justify-between">
                     <div className="text-sm text-muted-foreground">
                       Showing {startIndex + 1} to {Math.min(endIndex, currentMonthEntries)} of {currentMonthEntries.toLocaleString()} entries
                     </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink 
                                onClick={() => handlePageChange(pageNum)}
                                isActive={pageNum === currentPage}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem>
                              <PaginationLink 
                                onClick={() => handlePageChange(totalPages)}
                                className="cursor-pointer"
                              >
                                {totalPages}
                              </PaginationLink>
                            </PaginationItem>
                          </>
                        )}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Premiums */}
            {/* Recent Premium Calculations removed per request */}
          </div>
        </Section>
      </main>
    </div>
  );
};

export default InsuranceDashboard;