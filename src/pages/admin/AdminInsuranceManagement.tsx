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
  Calculator
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
  insurance_companies: { name: string };
}

const AdminInsuranceManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [premiums, setPremiums] = useState<InsurancePremium[]>([]);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<InsuranceCompany | null>(null);
  const [newCompany, setNewCompany] = useState({
    name: '',
    contact_email: '',
    premium_rate_per_entry: 1.00
  });

  useEffect(() => {
    fetchInsuranceData();
  }, []);

  const fetchInsuranceData = async () => {
    try {
      // Fetch insurance companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('insurance_companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

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

  const handleCreateCompany = async () => {
    if (!newCompany.name || !newCompany.contact_email) {
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
        .insert([{
          name: newCompany.name,
          contact_email: newCompany.contact_email,
          premium_rate_per_entry: newCompany.premium_rate_per_entry
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Insurance company created successfully"
      });

      setNewCompany({ name: '', contact_email: '', premium_rate_per_entry: 1.00 });
      setIsAddCompanyOpen(false);
      fetchInsuranceData();

    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: "Error",
        description: "Failed to create insurance company",
        variant: "destructive"
      });
    }
  };

  const handleGeneratePremiums = async (companyId: string) => {
    try {
      // Call the edge function to calculate premiums
      const { data, error } = await supabase.functions.invoke('calculate-monthly-premiums');

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

  const handleApprovePremium = async (premiumId: string) => {
    try {
      const { error } = await supabase
        .from('insurance_premiums')
        .update({ 
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', premiumId);

      if (error) throw error;

      toast({
        title: "Success", 
        description: "Premium approved successfully"
      });

      fetchInsuranceData();

    } catch (error) {
      console.error('Error approving premium:', error);
      toast({
        title: "Error",
        description: "Failed to approve premium",
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

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.active).length;
  const pendingPremiums = premiums.filter(p => p.status === 'pending').length;
  const totalPremiumsThisMonth = premiums
    .filter(p => new Date(p.period_start).getMonth() === new Date().getMonth() - 1)
    .reduce((sum, p) => sum + parseFloat(p.total_premium_amount.toString()), 0);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1 bg-muted/30">
        <Section spacing="lg">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Insurance Management</h1>
                <p className="text-muted-foreground">Manage insurance partners and premium calculations</p>
              </div>

              <Dialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Insurance Company
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Insurance Company</DialogTitle>
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
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setIsAddCompanyOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateCompany}>
                        Create Company
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Insurance Companies</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCompanies}</div>
                  <p className="text-xs text-muted-foreground">
                    {activeCompanies} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingPremiums}</div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting approval
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month Premiums</CardTitle>
                  <PoundSterling className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalPremiumsThisMonth)}</div>
                  <p className="text-xs text-muted-foreground">
                    Generated premiums
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rate</CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    £{activeCompanies > 0 
                      ? (companies.filter(c => c.active).reduce((sum, c) => sum + c.premium_rate_per_entry, 0) / activeCompanies).toFixed(2)
                      : '0.00'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per entry
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Insurance Companies Table */}
            <Card>
              <CardHeader>
                <CardTitle>Insurance Companies</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Contact Email</TableHead>
                      <TableHead>Premium Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.contact_email}</TableCell>
                        <TableCell>£{company.premium_rate_per_entry.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={company.active ? 'default' : 'secondary'}>
                            {company.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(company.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGeneratePremiums(company.id)}
                            >
                              <Calculator className="w-4 h-4 mr-1" />
                              Calculate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              Users
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

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
                              premium.status === 'approved' ? 'secondary' : 'outline'
                            }
                          >
                            {premium.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(premium.generated_at)}</TableCell>
                        <TableCell>
                          {premium.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprovePremium(premium.id)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </div>
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