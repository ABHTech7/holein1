import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building2, 
  Users, 
  PoundSterling, 
  Plus, 
  Edit, 
  UserPlus,
  FileText,
  Check,
  X,
  Calculator,
  ArrowLeft,
  CreditCard,
  Upload
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
  contact_email: string;
  premium_rate_per_entry: number;
  active: boolean;
  created_at: string;
}

interface InsurancePremium {
  id: string;
  insurance_company_id: string;
  period_start: string;
  period_end: string;
  total_entries: number;
  premium_rate: number;
  total_premium_amount: number;
  status: string;
  generated_at: string;
  payment_required_at?: string;
  insurance_companies: { name: string };
}

const AdminInsuranceManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentCompany, setCurrentCompany] = useState<InsuranceCompany | null>(null);
  const [premiums, setPremiums] = useState<InsurancePremium[]>([]);
  const [isChangeCompanyOpen, setIsChangeCompanyOpen] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    contact_email: '',
    premium_rate_per_entry: 1.00,
    logo_url: ''
  });
  const [currentMonthEntries, setCurrentMonthEntries] = useState(0);
  const [currentMonthPremiums, setCurrentMonthPremiums] = useState(0);
  const [yearToDateEntries, setYearToDateEntries] = useState(0);
  const [yearToDatePremiums, setYearToDatePremiums] = useState(0);

  const fetchRealTimeStats = async () => {
    if (!currentCompany) return;

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      // Get current month entries
      const { count: monthEntries, error: monthError } = await supabase
        .from('entries')
        .select('id', { count: 'exact', head: true })
        .gte('entry_date', monthStart.toISOString());

      if (monthError) throw monthError;

      // Get year to date entries
      const { count: ytdEntries, error: ytdError } = await supabase
        .from('entries')
        .select('id', { count: 'exact', head: true })
        .gte('entry_date', yearStart.toISOString());

      if (ytdError) throw ytdError;

      const monthTotal = (monthEntries || 0) * currentCompany.premium_rate_per_entry;
      const ytdTotal = (ytdEntries || 0) * currentCompany.premium_rate_per_entry;

      setCurrentMonthEntries(monthEntries || 0);
      setCurrentMonthPremiums(monthTotal);
      setYearToDateEntries(ytdEntries || 0);
      setYearToDatePremiums(ytdTotal);

    } catch (error) {
      console.error('Error fetching real-time stats:', error);
    }
  };

  useEffect(() => {
    if (currentCompany) {
      fetchRealTimeStats();
    }
  }, [currentCompany]);

  useEffect(() => {
    fetchInsuranceData();
  }, []);

  const fetchInsuranceData = async () => {
    try {
      // Fetch current active insurance company
      const { data: companyData, error: companyError } = await supabase
        .from('insurance_companies')
        .select('*')
        .eq('active', true)
        .single();

      if (companyError && companyError.code !== 'PGRST116') throw companyError;
      setCurrentCompany(companyData || null);

      // Fetch recent premiums
      const { data: premiumsData, error: premiumsError } = await supabase
        .from('insurance_premiums')
        .select(`
          *,
          insurance_companies (name)
        `)
        .order('generated_at', { ascending: false })
        .limit(20);

      if (premiumsError) throw premiumsError;
      setPremiums(premiumsData || []);

      // Refresh real-time stats if company exists
      if (companyData) {
        fetchRealTimeStats();
      }

    } catch (error) {
      console.error('Error fetching insurance data:', error);
      toast({
        title: "Error",
        description: "Failed to load insurance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeCompany = async () => {
    if (!newCompany.name || !newCompany.contact_email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Deactivate current company if exists
      if (currentCompany) {
        await supabase
          .from('insurance_companies')
          .update({ active: false })
          .eq('id', currentCompany.id);
      }

      // Create and activate new company
      const { error } = await supabase
        .from('insurance_companies')
        .insert([{
          name: newCompany.name,
          contact_email: newCompany.contact_email,
          premium_rate_per_entry: newCompany.premium_rate_per_entry,
          logo_url: newCompany.logo_url || null,
          active: true
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Insurance partner updated successfully"
      });

      setNewCompany({ name: '', contact_email: '', premium_rate_per_entry: 1.00, logo_url: '' });
      setIsChangeCompanyOpen(false);
      fetchInsuranceData();

    } catch (error) {
      console.error('Error updating insurance partner:', error);
      toast({
        title: "Error",
        description: "Failed to update insurance partner",
        variant: "destructive"
      });
    }
  };

  const handleGeneratePremiums = async () => {
    if (!currentCompany) {
      toast({
        title: "Error",
        description: "No insurance partner configured",
        variant: "destructive"
      });
      return;
    }

    try {
      // Call the edge function to calculate premiums
      const { data, error } = await supabase.functions.invoke('calculate-monthly-premiums', {
        body: { company_id: currentCompany.id }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Monthly premiums calculated successfully"
      });

      fetchInsuranceData();

    } catch (error) {
      console.error('Error generating premiums:', error);
      toast({
        title: "Error", 
        description: "Failed to generate premium calculations",
        variant: "destructive"
      });
    }
  };

  const handleMarkPaymentRequired = async (premiumId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('insurance_premiums')
        .update({ 
          status: 'payment_required',
          payment_required_at: new Date().toISOString()
        })
        .eq('id', premiumId);

      if (updateError) throw updateError;

      // Send email notification
      try {
        const { error: emailError } = await supabase.functions.invoke('send-premium-notification', {
          body: { premiumId }
        });
        
        if (emailError) {
          console.error('Email notification error:', emailError);
          toast({
            title: "Partial Success",
            description: "Premium marked as payment required, but email notification failed",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Success", 
            description: "Premium marked as payment required and notification email sent"
          });
        }
      } catch (emailError) {
        console.error('Email error:', emailError);
        toast({
          title: "Partial Success",
          description: "Premium marked as payment required, but email notification failed",
          variant: "destructive"
        });
      }

      fetchInsuranceData();

    } catch (error) {
      console.error('Error marking premium as payment required:', error);
      toast({
        title: "Error",
        description: "Failed to mark premium as payment required",
        variant: "destructive"
      });
    }
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

  const getCurrentMonthPremiums = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return premiums
      .filter(p => {
        const periodStart = new Date(p.period_start);
        const periodEnd = new Date(p.period_end);
        return periodStart >= monthStart && periodEnd <= monthEnd;
      })
      .reduce((sum, p) => sum + parseFloat(p.total_premium_amount.toString()), 0);
  };

  const getCurrentMonthEntries = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return premiums
      .filter(p => {
        const periodStart = new Date(p.period_start);
        const periodEnd = new Date(p.period_end);
        return periodStart >= monthStart && periodEnd <= monthEnd;
      })
      .reduce((sum, p) => sum + p.total_entries, 0);
  };

  const getYearToDatePremiums = () => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    
    return premiums
      .filter(p => {
        const periodStart = new Date(p.period_start);
        return periodStart >= yearStart;
      })
      .reduce((sum, p) => sum + parseFloat(p.total_premium_amount.toString()), 0);
  };

  const pendingPayments = premiums.filter(p => p.status === 'invoiced').length;
  const hasInsurancePartner = currentCompany !== null;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1 bg-muted/30">
        <Section spacing="lg">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Back Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/dashboard/admin'}
              className="flex items-center gap-2 w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Admin Dashboard
            </Button>

            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Insurance Partner Management</h1>
                <p className="text-muted-foreground">
                  {hasInsurancePartner 
                    ? `Current partner: ${currentCompany.name}` 
                    : 'No insurance partner configured'
                  }
                </p>
              </div>

              <Dialog open={isChangeCompanyOpen} onOpenChange={setIsChangeCompanyOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {hasInsurancePartner ? 'Change Partner' : 'Add Insurance Partner'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {hasInsurancePartner ? 'Change Insurance Partner' : 'Add Insurance Partner'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Company Name *</Label>
                      <Input
                        id="name"
                        value={newCompany.name}
                        onChange={(e) => setNewCompany(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Acme Insurance Ltd"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Contact Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newCompany.contact_email}
                        onChange={(e) => setNewCompany(prev => ({ ...prev, contact_email: e.target.value }))}
                        placeholder="contact@acmeinsurance.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rate">Premium Rate per Entry (£)</Label>
                      <Input
                        id="rate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newCompany.premium_rate_per_entry}
                        onChange={(e) => setNewCompany(prev => ({ ...prev, premium_rate_per_entry: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="logoUrl">Logo URL (Optional)</Label>
                      <Input
                        id="logoUrl"
                        type="url"
                        value={newCompany.logo_url}
                        onChange={(e) => setNewCompany(prev => ({ ...prev, logo_url: e.target.value }))}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setIsChangeCompanyOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleChangeCompany}>
                        {hasInsurancePartner ? 'Update Partner' : 'Add Partner'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Insurance Partner Status</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {hasInsurancePartner ? 'Active' : 'None'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {hasInsurancePartner ? currentCompany.name : 'No partner configured'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Awaiting Payment</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingPayments}</div>
                  <p className="text-xs text-muted-foreground">
                    Invoiced premiums
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Month Entries</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentMonthEntries.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Month to date entries
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Month Premiums</CardTitle>
                  <PoundSterling className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(currentMonthPremiums)}</div>
                  <p className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString('en-GB', { month: 'long' })} total
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Year to Date Premiums</CardTitle>
                  <PoundSterling className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                 <CardContent>
                   <div className="text-2xl font-bold">{formatCurrency(yearToDatePremiums)}</div>
                   <p className="text-xs text-muted-foreground">
                     {yearToDateEntries.toLocaleString()} entries × £{hasInsurancePartner ? currentCompany.premium_rate_per_entry.toFixed(2) : '0.00'}
                   </p>
                 </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Premium Rate</CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    £{hasInsurancePartner ? currentCompany.premium_rate_per_entry.toFixed(2) : '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per entry
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Current Insurance Partner */}
            {hasInsurancePartner && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Insurance Partner</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                    <div className="flex items-start gap-6">
                      {currentCompany.logo_url && (
                        <div className="flex-shrink-0">
                          <img 
                            src={currentCompany.logo_url} 
                            alt={`${currentCompany.name} logo`}
                            className="h-16 w-16 object-contain rounded border"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                        <div>
                          <Label className="text-sm font-medium">Company Name</Label>
                          <p className="text-lg">{currentCompany.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Contact Email</Label>
                          <p className="text-lg">{currentCompany.contact_email}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Premium Rate</Label>
                          <p className="text-lg">£{currentCompany.premium_rate_per_entry.toFixed(2)} per entry</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Partner Since</Label>
                          <p className="text-lg">{formatDate(currentCompany.created_at)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleGeneratePremiums}
                      >
                        <Calculator className="w-4 h-4 mr-2" />
                        Calculate Premiums
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Premium Calculations */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Premium Calculations</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Entries</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {premiums.map((premium) => (
                      <TableRow key={premium.id}>
                        <TableCell className="font-medium">
                          {premium.insurance_companies?.name}
                        </TableCell>
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
                               premium.status === 'payment_required' ? 'secondary' : 'outline'
                             }
                           >
                             {premium.status === 'payment_required' ? 'Payment Required' : premium.status}
                           </Badge>
                         </TableCell>
                        <TableCell>{formatDate(premium.generated_at)}</TableCell>
                         <TableCell>
                           {premium.status === 'invoiced' && (
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => handleMarkPaymentRequired(premium.id)}
                               className="flex items-center gap-1"
                             >
                               <CreditCard className="w-4 h-4" />
                               Mark Payment Required
                             </Button>
                          )}
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

export default AdminInsuranceManagement;