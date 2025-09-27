import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Building, Mail, Phone, PoundSterling, ArrowLeft, Archive, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";
import { showSupabaseError } from "@/lib/showSupabaseError";
import { useAuth } from "@/hooks/useAuth";
import SiteHeader from "@/components/layout/SiteHeader";
import Section from "@/components/layout/Section";
import NewClubModal from "@/components/admin/NewClubModal";
import { ROUTES } from "@/routes";

interface Club {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  active: boolean;
  created_at: string;
  total_competitions: number;
  total_revenue: number;
  total_commission: number;
  manager_name: string | null;
  manager_email: string | null;
  contract_signed: boolean;
  contract_url: string | null;
}

const ClubsPage = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [showNewClubModal, setShowNewClubModal] = useState(false);

  // Calculate activation status based on contract state
  const getActivationStatus = (club: Club) => {
    // Club is active if:
    // 1. Contract is signed, OR
    // 2. Contract file is uploaded, OR  
    // 3. Admin has manually set active=true AND contract is signed
    const hasContract = club.contract_url || club.contract_signed;
    const isManuallyActive = club.active && club.contract_signed;
    
    if (hasContract || isManuallyActive) {
      return "Active";
    }
    
    return "Pending";
  };

  useEffect(() => {
    fetchClubs();
  }, [showArchived]);

  useEffect(() => {
    const filtered = clubs.filter(club => {
      const search = searchTerm.toLowerCase();
      return club.name.toLowerCase().includes(search) || 
             club.email?.toLowerCase().includes(search);
    });
    setFilteredClubs(filtered);
  }, [clubs, searchTerm]);

  const fetchClubs = async () => {
    try {
      setLoading(true);

      // Development diagnostic logging
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 [ClubsPage.fetchClubs] Using admin Edge Function', {
          userProfile: { 
            role: profile?.role, 
            id: profile?.id, 
            club_id: profile?.club_id 
          },
          operation: 'Fetching clubs via admin-get-clubs Edge Function',
          params: { archived: showArchived }
        });
      }

      // Use the admin Edge Function to fetch clubs with archived parameter
      const { data: response, error } = await supabase.functions.invoke('admin-get-clubs', {
        body: { archived: showArchived }
      });

      if (error) throw error;

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch clubs');
      }

      setClubs(response.clubs || []);
    } catch (error: any) {
      // Enhanced error handling
      if (process.env.NODE_ENV !== 'production') {
        console.error("ADMIN PAGE ERROR:", {
          location: "ClubsPage.fetchClubs.edgeFunction",
          userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
          operation: "Fetching clubs via Edge Function",
          error: error.message,
          fullError: error
        });
      }

      toast({ 
        title: "Failed to load clubs data", 
        description: error.message || "Unable to fetch clubs. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClubClick = (clubId: string) => {
    navigate(`/dashboard/admin/clubs/${clubId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <Section className="py-8">
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate(ROUTES.ADMIN.DASHBOARD)}
                className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border-primary/20"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setShowNewClubModal(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add New Club
                </Button>
                
                <Button 
                  variant={showArchived ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  {showArchived ? "Hide Archived" : "Show Archived"}
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  {showArchived ? 'Archived' : 'Active'} Clubs ({clubs.length})
                </CardTitle>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search clubs by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

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
                        <TableHead>Club Name</TableHead>
                        <TableHead>Manager</TableHead>
                        <TableHead>Competitions</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClubs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {searchTerm ? 'No clubs found matching your search.' : 'No clubs found.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredClubs.map((club) => (
                          <TableRow key={club.id}>
                            <TableCell className="font-medium">
                              <button
                                onClick={() => handleClubClick(club.id)}
                                className="text-left hover:text-primary hover:underline focus:outline-none focus:text-primary"
                              >
                                {club.name}
                              </button>
                            </TableCell>
                            <TableCell>
                              {club.manager_name || 'No manager assigned'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {club.total_competitions}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <PoundSterling className="w-4 h-4 text-green-600" />
                                <span className="font-medium">
                                  {formatCurrency(club.total_revenue)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <PoundSterling className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-blue-600">
                                  {formatCurrency(club.total_commission)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant={getActivationStatus(club) === "Active" ? "default" : "outline"}>
                                  {getActivationStatus(club)}
                                </Badge>
                                {!club.contract_signed && !club.contract_url && (
                                  <Badge variant="secondary" className="text-xs">
                                    Contract Required
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>

      <NewClubModal 
        isOpen={showNewClubModal}
        onClose={() => setShowNewClubModal(false)}
        onSuccess={() => fetchClubs()}
      />
    </div>
  );
};

export default ClubsPage;