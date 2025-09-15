import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { showSupabaseError } from "@/lib/showSupabaseError";
import SiteHeader from "@/components/layout/SiteHeader";
import Section from "@/components/layout/Section";
import { useAdminClaims } from "@/hooks/useClaims";
import { ClaimsTable } from "@/components/claims/ClaimsTable";
import { approveClaim, rejectClaim } from "@/lib/claimsActions";
import { VerificationStatus } from "@/types/claims";
import { ROUTES } from "@/routes";

const ClaimsPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | VerificationStatus>("all");
  
  const { rows, counts, isLoading, error, refetch } = useAdminClaims({
    search: searchTerm,
    status: statusFilter
  });

  const handleApprove = async (id: string) => {
    try {
      const { error } = await approveClaim(id);
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Claim approved successfully.",
      });
      refetch();
    } catch (error) {
      const msg = showSupabaseError(error, 'Failed to approve claim');
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await rejectClaim(id);
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Claim rejected successfully.", 
      });
      refetch();
    } catch (error) {
      const msg = showSupabaseError(error, 'Failed to reject claim');
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleView = (id: string) => {
    navigate(`/claims/${id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <Section className="py-4 md:py-8">
        <div className="space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate(ROUTES.ADMIN.DASHBOARD)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Claims Management</h1>
                <p className="text-sm text-muted-foreground">Review and verify hole-in-one claims</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-lg md:text-2xl font-bold">{counts.total}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Total Claims</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-lg md:text-2xl font-bold text-amber-600">{counts.pending}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Pending Review</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-lg md:text-2xl font-bold text-success">{counts.verified}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Verified</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-lg md:text-2xl font-bold text-destructive">{counts.rejected}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Rejected</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by player, competition, or club..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | VerificationStatus)}>
                  <SelectTrigger className="w-full md:w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="initiated">Pending</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Claims Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Hole-in-One Claims ({rows.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-8 text-destructive">
                  Error loading claims: {error}
                </div>
              ) : (
                <ClaimsTable
                  rows={rows}
                  isLoading={isLoading}
                  onView={handleView}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  showClubColumn={true}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </Section>

    </div>
  );
};

export default ClaimsPage;