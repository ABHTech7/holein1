import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import ChartWrapper from '@/components/ui/chart-wrapper';
import { 
  Building2, 
  Users, 
  PoundSterling, 
  Plus,
  ArrowLeft,
  Trophy
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import useAuth from '@/hooks/useAuth';
import SiteHeader from '@/components/layout/SiteHeader';
import Section from '@/components/layout/Section';
import { formatCurrency } from '@/lib/formatters';

interface InsuranceCompany {
  id: string;
  name: string;
  logo_url: string | null;
  contact_email: string;
  premium_rate_per_entry: number;
  active: boolean;
  created_at: string;
}

interface MonthlyData {
  month: string;
  entries: number;
  premiums: number;
}

const AdminInsuranceManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentCompany, setCurrentCompany] = useState<InsuranceCompany | null>(null);
  const [isChangeCompanyOpen, setIsChangeCompanyOpen] = useState(false);
  const [isUpdateCompanyOpen, setIsUpdateCompanyOpen] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    contact_email: '',
    premium_rate_per_entry: 1.15,
    logo_url: ''
  });
  const [updateCompany, setUpdateCompany] = useState({
    name: '',
    contact_email: '',
    premium_rate_per_entry: 1.15,
    logo_url: ''
  });
  const [monthToDateEntries, setMonthToDateEntries] = useState(0);
  const [monthToDatePremiums, setMonthToDatePremiums] = useState(0);
  const [yearToDateEntries, setYearToDateEntries] = useState(0);
  const [yearToDatePremiums, setYearToDatePremiums] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  const fetchStats = async () => {
    if (!currentCompany) return;

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      // Get month-to-date entries
      const { count: monthEntries, error: monthError } = await supabase
        .from('entries')
        .select('id', { count: 'exact', head: true })
        .gte('entry_date', monthStart.toISOString());

      if (monthError) throw monthError;

      // Get year-to-date entries
      const { count: ytdEntries, error: ytdError } = await supabase
        .from('entries')
        .select('id', { count: 'exact', head: true })
        .gte('entry_date', yearStart.toISOString());

      if (ytdError) throw ytdError;

      // Calculate premiums: entries × rate
      const monthPremiums = (monthEntries || 0) * currentCompany.premium_rate_per_entry;
      const ytdPremiums = (ytdEntries || 0) * currentCompany.premium_rate_per_entry;

      setMonthToDateEntries(monthEntries || 0);
      setMonthToDatePremiums(monthPremiums);
      setYearToDateEntries(ytdEntries || 0);
      setYearToDatePremiums(ytdPremiums);

    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchMonthlyData = async () => {
    if (!currentCompany) return;

    try {
      const currentYear = new Date().getFullYear();
      const months = [];
      
      // Get data for each month of the current year
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(currentYear, month, 1);
        const monthEnd = new Date(currentYear, month + 1, 0, 23, 59, 59, 999);
        
        const { count: entries, error } = await supabase
          .from('entries')
          .select('id', { count: 'exact', head: true })
          .gte('entry_date', monthStart.toISOString())
          .lte('entry_date', monthEnd.toISOString());

        if (error) throw error;

        const monthName = monthStart.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
        const premiums = (entries || 0) * currentCompany.premium_rate_per_entry;

        months.push({
          month: monthName,
          entries: entries || 0,
          premiums: premiums
        });
      }

      setMonthlyData(months);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
    }
  };

  useEffect(() => {
    if (currentCompany) {
      fetchStats();
      fetchMonthlyData();
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
        .maybeSingle();

      if (companyError) throw companyError;
      setCurrentCompany(companyData);

      // Set update form with current company data when company is loaded
      if (companyData) {
        setUpdateCompany({
          name: companyData.name,
          contact_email: companyData.contact_email,
          premium_rate_per_entry: companyData.premium_rate_per_entry,
          logo_url: companyData.logo_url || ''
        });
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

  const handleUpdateCompany = async () => {
    if (!currentCompany || !updateCompany.name || !updateCompany.contact_email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('insurance_companies')
        .update({
          name: updateCompany.name,
          contact_email: updateCompany.contact_email,
          premium_rate_per_entry: updateCompany.premium_rate_per_entry,
          logo_url: updateCompany.logo_url || null,
        })
        .eq('id', currentCompany.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Insurance partner details updated successfully"
      });

      setIsUpdateCompanyOpen(false);
      fetchInsuranceData();

    } catch (error) {
      console.error('Error updating insurance partner:', error);
      toast({
        title: "Error",
        description: "Failed to update insurance partner details",
        variant: "destructive"
      });
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

      setNewCompany({ name: '', contact_email: '', premium_rate_per_entry: 1.15, logo_url: '' });
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Section spacing="lg">
            <div className="max-w-7xl mx-auto space-y-6">
              <Skeleton className="h-8 w-64" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(2)].map((_, i) => (
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
              className="flex items-center gap-2 w-fit bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border-primary/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Admin Dashboard
            </Button>

            {/* Insurance Partner Logo */}
            {hasInsurancePartner && currentCompany.logo_url && (
              <div className="flex items-center space-x-4 mb-4">
                <img 
                  src={currentCompany.logo_url} 
                  alt={`${currentCompany.name} logo`}
                  className="w-20 h-20 rounded-lg object-contain bg-white p-3 border shadow-sm"
                />
                <span className="font-display text-2xl font-semibold text-foreground">
                  {currentCompany.name}
                </span>
              </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Insurance Partner Management</h1>
                <p className="text-muted-foreground">
                  {hasInsurancePartner 
                    ? `Current partner: ${currentCompany.name} • Rate: ${formatCurrency(Math.round(currentCompany.premium_rate_per_entry * 100))} per entry` 
                    : 'No insurance partner configured'
                  }
                </p>
              </div>

              <div className="flex gap-2">
                {hasInsurancePartner && (
                  <Dialog open={isUpdateCompanyOpen} onOpenChange={setIsUpdateCompanyOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        Update Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Insurance Partner Details</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="update-name">Company Name *</Label>
                          <Input
                            id="update-name"
                            value={updateCompany.name}
                            onChange={(e) => setUpdateCompany(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Acme Insurance Ltd"
                          />
                        </div>
                        <div>
                          <Label htmlFor="update-email">Contact Email *</Label>
                          <Input
                            id="update-email"
                            type="email"
                            value={updateCompany.contact_email}
                            onChange={(e) => setUpdateCompany(prev => ({ ...prev, contact_email: e.target.value }))}
                            placeholder="contact@acmeinsurance.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="update-rate">Premium Rate per Entry (£)</Label>
                          <Input
                            id="update-rate"
                            type="number"
                            step="0.01"
                            min="0"
                            value={updateCompany.premium_rate_per_entry}
                            onChange={(e) => setUpdateCompany(prev => ({ ...prev, premium_rate_per_entry: parseFloat(e.target.value) || 0 }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="update-logoUrl">Logo URL (Optional)</Label>
                          <Input
                            id="update-logoUrl"
                            type="url"
                            value={updateCompany.logo_url}
                            onChange={(e) => setUpdateCompany(prev => ({ ...prev, logo_url: e.target.value }))}
                            placeholder="https://example.com/logo.png"
                          />
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button variant="outline" onClick={() => setIsUpdateCompanyOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleUpdateCompany}>
                            Update Details
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

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
            </div>

            {!hasInsurancePartner ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Insurance Partner</h3>
                  <p className="text-muted-foreground text-center mb-6">
                    Add an insurance partner to start tracking premiums and entries.
                  </p>
                  <Button onClick={() => setIsChangeCompanyOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Insurance Partner
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Main Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Month to Date</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(Math.round(monthToDatePremiums * 100))}</div>
                      <p className="text-xs text-muted-foreground">
                        {monthToDateEntries.toLocaleString()} entries × {formatCurrency(Math.round(currentCompany.premium_rate_per_entry * 100))}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Year to Date</CardTitle>
                      <PoundSterling className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(Math.round(yearToDatePremiums * 100))}</div>
                      <p className="text-xs text-muted-foreground">
                        {yearToDateEntries.toLocaleString()} entries × {formatCurrency(Math.round(currentCompany.premium_rate_per_entry * 100))}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly Growth Chart */}
                <ChartWrapper
                  title="Monthly Premium Growth"
                  description="Premium totals by month for the current year"
                >
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis 
                          tickFormatter={(value) => formatCurrency(Math.round((value as number) * 100))}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            name === 'premiums' ? formatCurrency(Math.round((value as number) * 100)) : (value as number).toLocaleString(),
                            name === 'premiums' ? 'Premiums' : 'Entries'
                          ]}
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
                </ChartWrapper>

                {/* Insurance Partner Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Insurance Partner Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                      {currentCompany.logo_url && (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                          <img 
                            src={currentCompany.logo_url} 
                            alt={`${currentCompany.name} logo`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-lg">{currentCompany.name}</h3>
                        <p className="text-sm text-muted-foreground">{currentCompany.contact_email}</p>
                        <p className="text-sm">
                          <strong>Premium Rate:</strong> {formatCurrency(Math.round(currentCompany.premium_rate_per_entry * 100))} per entry
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Partner since {new Date(currentCompany.created_at).toLocaleDateString('en-GB', { timeZone: 'UTC' })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </Section>
      </main>
    </div>
  );
};

export default AdminInsuranceManagement;