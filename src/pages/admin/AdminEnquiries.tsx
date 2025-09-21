import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import SiteHeader from "@/components/layout/SiteHeader";
import Section from "@/components/layout/Section";
import { toast } from "@/hooks/use-toast";
import { formatDate, formatRelativeTime } from "@/lib/formatters";
import { showSupabaseError } from "@/lib/showSupabaseError";
import { Eye, UserPlus, Clock, CheckCircle, XCircle, Search, Calendar, Filter, ExternalLink, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/routes";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string;
  status: 'NEW' | 'IN_REVIEW' | 'CONVERTED' | 'REJECTED' | 'CONTACTED' | 'LOST';
  source: string;
  club_id: string | null;
  created_at: string;
  updated_at: string;
  email_sent: boolean;
}

interface ConversionResult {
  lead_id: string;
  club_id: string;
  club_name: string;
  admin_email: string;
}

interface ConversionData {
  clubName: string;
  adminEmail: string;
  website?: string;
  address?: string;
}

const AdminEnquiries = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('NEW');
  const [dateFilter, setDateFilter] = useState<string>('90');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // Conversion form data
  const [conversionData, setConversionData] = useState<ConversionData>({
    clubName: '',
    adminEmail: '',
    website: '',
    address: ''
  });

  // Fetch enquiries with filters
  const fetchEnquiries = async (page = 1) => {
    try {
      setLoading(true);

      // Calculate date filter
      const dateFilterDate = new Date();
      dateFilterDate.setDate(dateFilterDate.getDate() - parseInt(dateFilter));

      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('source', 'Partnership Application')
        .gte('created_at', dateFilterDate.toISOString())
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      // Apply status filter
      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter as Lead['status']);
      }

      // Apply search filter using textSearch if available, otherwise fallback to ilike
      if (searchQuery.trim()) {
        const searchTerm = searchQuery.trim();
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching enquiries:', error);
        showSupabaseError(error, 'AdminEnquiries.fetchEnquiries');
        toast({
          title: "Failed to load enquiries",
          description: "Please try again later.",
          variant: "destructive"
        });
        return;
      }

      setLeads(data || []);
      setTotalCount(count || 0);
      setCurrentPage(page);

    } catch (error) {
      console.error('Error in fetchEnquiries:', error);
      toast({
        title: "Error loading enquiries",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial load and filter changes
  useEffect(() => {
    fetchEnquiries(1);
  }, [statusFilter, dateFilter, searchQuery]);

  // Parse club name from notes
  const parseClubNameFromNotes = (notes: string): string => {
    const match = notes.match(/Club:\s*([^,]+)/);
    return match ? match[1].trim() : 'Unknown Club';
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    const variants = {
      'NEW': { variant: 'default' as const, icon: Clock, color: 'text-blue-600' },
      'IN_REVIEW': { variant: 'secondary' as const, icon: Search, color: 'text-orange-600' },
      'CONVERTED': { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      'REJECTED': { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.NEW;
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1" data-testid="enquiry-status-badge">
        <IconComponent className={`w-3 h-3 ${config.color}`} />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  // Handle status update
  const updateLeadStatus = async (leadId: string, newStatus: Lead['status']) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) {
        showSupabaseError(error, 'AdminEnquiries.updateLeadStatus');
        toast({
          title: "Failed to update status",
          description: "Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));

      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
      }

      toast({
        title: "Status updated",
        description: `Lead marked as ${newStatus.replace('_', ' ').toLowerCase()}.`,
      });

    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error updating status",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle conversion to club
  const convertToClub = async () => {
    if (!selectedLead) return;

    // Validate required fields
    if (!conversionData.clubName || !conversionData.adminEmail) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Club Name and Admin Email)",
        variant: "destructive"
      });
      return;
    }

    // Get current session for authentication
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) {
      toast({
        title: "Authentication Error",
        description: "Please log in again to perform this action.",
        variant: "destructive",
      });
      return;
    }

    // Safety check - prevent admin from converting using their own email
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email && conversionData.adminEmail.toLowerCase() === user.email.toLowerCase()) {
      toast({
        title: "Invalid Operation",
        description: "You cannot convert a lead using your own admin email address.",
        variant: "destructive",
      });
      return;
    }

    setConverting(true);
    try {
      console.log('Starting conversion with data:', {
        leadId: selectedLead.id,
        clubName: conversionData.clubName,
        adminEmail: conversionData.adminEmail,
        metadata: {
          website: conversionData.website || '',
          address: conversionData.address || ''
        }
      });

      const { data, error } = await supabase.functions.invoke('convert-lead-to-club', {
        body: {
          leadId: selectedLead.id,
          clubName: conversionData.clubName,
          adminEmail: conversionData.adminEmail,
          metadata: {
            website: conversionData.website || '',
            address: conversionData.address || ''
          }
        },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: "Conversion failed!",
          description: error.message || "Please try again later",
          variant: "destructive"
        });
        return;
      }

      if (!data?.success) {
        console.error('Conversion failed with response:', data);
        toast({
          title: "Conversion failed!",
          description: data?.error || "Unknown error occurred",
          variant: "destructive"
        });
        return;
      }

      console.log('Conversion successful:', data);
      
      // Success!
      toast({
        title: "Conversion successful! 🎉",
        description: `${data.data.clubName} has been created successfully.`,
      });

      // Update local state
      setLeads(prev => prev.map(lead => 
        lead.id === selectedLead.id 
          ? { ...lead, status: 'CONVERTED', club_id: data.data.clubId }
          : lead
      ));

      // Update selected lead
      setSelectedLead(prev => prev ? { ...prev, status: 'CONVERTED', club_id: data.data.clubId } : null);

      // Close modals
      setConvertModalOpen(false);
      setDrawerOpen(false);

      // Show success with club link
      setTimeout(() => {
        toast({
          title: "Ready to explore the new club?",
          description: (
            <div className="flex items-center gap-2">
              <span>View club details</span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate(ROUTES.DETAIL.CLUB(data.data.clubId))}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open Club
              </Button>
            </div>
          ),
        });
      }, 1000);

    } catch (error: any) {
      console.error('Unexpected error during conversion:', error);
      toast({
        title: "Conversion failed!",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setConverting(false);
    }
  };

  // Open detail drawer
  const openDetailDrawer = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  // Open conversion modal
  const openConversionModal = (lead: Lead) => {
    console.log('Opening conversion modal for lead:', lead.id, lead.name);
    setSelectedLead(lead);
    setConversionData({
      clubName: parseClubNameFromNotes(lead.notes),
      adminEmail: lead.email,
      website: '',
      address: ''
    });
    setConvertModalOpen(true);
    console.log('Convert modal should now be open:', true);
    toast({ title: "Convert to Club", description: `Preparing conversion for ${lead.name}` });
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen flex flex-col" data-testid="admin-enquiries-page">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="lg">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Back Button */}
            <Button
              variant="outline"
              onClick={() => navigate(ROUTES.ADMIN.DASHBOARD)}
              className="flex items-center gap-2 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Partnership Enquiries</h1>
                <p className="text-muted-foreground mt-1">Review and convert partnership applications into clubs</p>
              </div>
              <div className="text-sm text-muted-foreground">
                {totalCount} enquiries found
              </div>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Status Filter */}
                  <div>
                    <Label htmlFor="status-filter">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger id="status-filter">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="IN_REVIEW">In Review</SelectItem>
                        <SelectItem value="CONVERTED">Converted</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Filter */}
                  <div>
                    <Label htmlFor="date-filter">Date Range</Label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger id="date-filter">
                        <SelectValue placeholder="Last 90 days" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Search */}
                  <div className="md:col-span-2">
                    <Label htmlFor="search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="search"
                        placeholder="Search by name, email, or message..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enquiries Table */}
            <Card>
              <CardHeader>
                <CardTitle>Enquiries</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ))}
                  </div>
                ) : leads.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No enquiries found matching your criteria.</p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Contact Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Club</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads.map((lead) => (
                          <TableRow key={lead.id} data-testid={`enquiry-row-${lead.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                {formatDate(lead.created_at)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{lead.name}</TableCell>
                            <TableCell>{lead.email}</TableCell>
                            <TableCell>{lead.phone || 'Not provided'}</TableCell>
                            <TableCell>{parseClubNameFromNotes(lead.notes)}</TableCell>
                            <TableCell>{getStatusBadge(lead.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDetailDrawer(lead)}
                                  data-testid={`enquiry-view-btn-${lead.id}`}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                {(lead.status === 'NEW' || lead.status === 'IN_REVIEW') && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => openConversionModal(lead)}
                                    data-testid={`enquiry-convert-btn-${lead.id}`}
                                  >
                                    <UserPlus className="w-3 h-3 mr-1" />
                                    Convert
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} enquiries
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => fetchEnquiries(currentPage - 1)}
                          >
                            Previous
                          </Button>
                          <span className="text-sm">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => fetchEnquiries(currentPage + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </Section>
      </main>

      {/* Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Enquiry Details</SheetTitle>
            <SheetDescription>
              Review the full partnership application details
            </SheetDescription>
          </SheetHeader>
          
          {selectedLead && (
            <div className="mt-6 space-y-4">
              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Contact Name</Label>
                  <p className="font-medium">{selectedLead.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedLead.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedLead.phone || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Club Name</Label>
                  <p className="font-medium">{parseClubNameFromNotes(selectedLead.notes)}</p>
                </div>
              </div>

              {/* Status and Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedLead.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Submitted</Label>
                  <p className="text-sm">{formatRelativeTime(selectedLead.created_at)}</p>
                </div>
              </div>

              {/* Full Message */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Full Details</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{selectedLead.notes}</p>
                </div>
              </div>

              {/* Email Status */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email Notification</Label>
                <p className="text-sm">{selectedLead.email_sent ? '✅ Sent' : '❌ Not sent'}</p>
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-2">
                {selectedLead.status === 'NEW' && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => updateLeadStatus(selectedLead.id, 'IN_REVIEW')}
                    disabled={updatingStatus}
                  >
                    Mark In Review
                  </Button>
                )}
                
                {(selectedLead.status === 'NEW' || selectedLead.status === 'IN_REVIEW') && (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setDrawerOpen(false);
                        openConversionModal(selectedLead);
                      }}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Convert to Club
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject Application
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Application</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to reject this partnership application? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => updateLeadStatus(selectedLead.id, 'REJECTED')}
                            disabled={updatingStatus}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Reject Application
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}

                {selectedLead.status === 'CONVERTED' && selectedLead.club_id && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(ROUTES.DETAIL.CLUB(selectedLead.club_id!))}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Club Details
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Conversion Modal */}
      <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
        <DialogContent className="sm:max-w-[425px]" data-testid="convert-modal">
          <DialogHeader>
            <DialogTitle>Convert to Club</DialogTitle>
            <DialogDescription>
              Create a new club from this partnership application
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="club-name">Club Name *</Label>
              <Input
                id="club-name"
                value={conversionData.clubName}
                onChange={(e) => setConversionData(prev => ({ ...prev, clubName: e.target.value }))}
                placeholder="Enter club name"
              />
            </div>
            
            <div>
              <Label htmlFor="admin-email">Admin Email *</Label>
              <Input
                id="admin-email"
                type="email"
                value={conversionData.adminEmail}
                onChange={(e) => setConversionData(prev => ({ ...prev, adminEmail: e.target.value }))}
                placeholder="Club admin email address"
              />
            </div>
            
            <div>
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="url"
                value={conversionData.website}
                onChange={(e) => setConversionData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://clubwebsite.com"
              />
            </div>
            
            <div>
              <Label htmlFor="address">Address (Optional)</Label>
              <Input
                id="address"
                value={conversionData.address}
                onChange={(e) => setConversionData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Club address"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertModalOpen(false)} disabled={converting}>
              Cancel
            </Button>
            <Button 
              onClick={convertToClub} 
              disabled={converting || !conversionData.clubName || !conversionData.adminEmail}
              data-testid="convert-submit"
            >
              {converting ? "Converting..." : "Convert to Club"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEnquiries;