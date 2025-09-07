import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, ArrowLeft, Eye, CheckCircle, XCircle, Clock, AlertTriangle, Camera, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDate, formatDateTime } from "@/lib/formatters";
import SiteHeader from "@/components/layout/SiteHeader";
import Section from "@/components/layout/Section";
import { useAuth } from "@/hooks/useAuth";

interface Claim {
  id: string;
  claim_date: string;
  hole_number: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  photo_urls: string[] | null;
  witness_name: string | null;
  witness_contact: string | null;
  notes: string | null;
  verified_at: string | null;
  verified_by: string | null;
  entry: {
    id: string;
    entry_date: string;
    player: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
    };
    competition: {
      id: string;
      name: string;
      club_name: string;
    };
  };
}

const ClaimsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<Claim[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchClaims();
  }, []);

  useEffect(() => {
    filterClaims();
  }, [claims, searchTerm, statusFilter]);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      
      const { data: claimsData, error } = await supabase
        .from('claims')
        .select(`
          *,
          entries!inner(
            id,
            entry_date,
            profiles!entries_player_id_fkey(
              id,
              first_name,
              last_name,
              email
            ),
            competitions!inner(
              id,
              name,
              clubs!inner(name)
            )
          )
        `)
        .order('claim_date', { ascending: false });

      if (error) throw error;

      const formattedClaims = (claimsData || []).map(claim => ({
        ...claim,
        entry: {
          id: claim.entries.id,
          entry_date: claim.entries.entry_date,
          player: {
            id: claim.entries.profiles.id,
            first_name: claim.entries.profiles.first_name,
            last_name: claim.entries.profiles.last_name,
            email: claim.entries.profiles.email
          },
          competition: {
            id: claim.entries.competitions.id,
            name: claim.entries.competitions.name,
            club_name: (claim.entries.competitions.clubs as any).name
          }
        }
      }));

      setClaims(formattedClaims);
    } catch (error) {
      console.error('Error fetching claims:', error);
      toast({
        title: "Error",
        description: "Failed to load claims data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterClaims = () => {
    let filtered = claims;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(claim => {
        const playerName = `${claim.entry.player.first_name || ''} ${claim.entry.player.last_name || ''}`.toLowerCase();
        return (
          playerName.includes(search) ||
          claim.entry.player.email.toLowerCase().includes(search) ||
          claim.entry.competition.name.toLowerCase().includes(search) ||
          claim.entry.competition.club_name.toLowerCase().includes(search)
        );
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(claim => claim.status === statusFilter.toUpperCase());
    }

    setFilteredClaims(filtered);
  };

  const handleClaimAction = async (claimId: string, action: 'VERIFIED' | 'REJECTED') => {
    try {
      setProcessing(true);
      
      const { error } = await supabase
        .from('claims')
        .update({
          status: action,
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
          notes: verificationNotes || null
        })
        .eq('id', claimId);

      if (error) throw error;

      // Update local state
      setClaims(prev => prev.map(claim => 
        claim.id === claimId 
          ? { ...claim, status: action, verified_at: new Date().toISOString(), notes: verificationNotes }
          : claim
      ));

      setShowDetailModal(false);
      setVerificationNotes("");
      
      toast({
        title: "Success",
        description: `Claim ${action.toLowerCase()} successfully.`,
      });
    } catch (error) {
      console.error('Error updating claim:', error);
      toast({
        title: "Error",
        description: "Failed to update claim status.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getPlayerName = (player: Claim['entry']['player']) => {
    if (player.first_name || player.last_name) {
      return `${player.first_name || ''} ${player.last_name || ''}`.trim();
    }
    return 'No name provided';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'default';
      case 'PENDING': return 'secondary';
      case 'REJECTED': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED': return CheckCircle;
      case 'PENDING': return Clock;
      case 'REJECTED': return XCircle;
      default: return AlertTriangle;
    }
  };

  // Stats calculations
  const totalClaims = claims.length;
  const pendingClaims = claims.filter(c => c.status === 'PENDING').length;
  const verifiedClaims = claims.filter(c => c.status === 'VERIFIED').length;
  const rejectedClaims = claims.filter(c => c.status === 'REJECTED').length;

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
                onClick={() => navigate('/dashboard/admin')}
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
                <div className="text-lg md:text-2xl font-bold">{totalClaims}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Total Claims</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-lg md:text-2xl font-bold text-yellow-600">{pendingClaims}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Pending Review</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-lg md:text-2xl font-bold text-green-600">{verifiedClaims}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Verified</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-lg md:text-2xl font-bold text-red-600">{rejectedClaims}</div>
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
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
                Hole-in-One Claims ({filteredClaims.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-3 border rounded">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead className="hidden md:table-cell">Competition</TableHead>
                        <TableHead className="hidden lg:table-cell">Club</TableHead>
                        <TableHead>Hole</TableHead>
                        <TableHead>Claim Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Photos</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClaims.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            {searchTerm || statusFilter !== "all" 
                              ? 'No claims found matching your filters.' 
                              : 'No claims found.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredClaims.map((claim) => {
                          const StatusIcon = getStatusIcon(claim.status);
                          return (
                            <TableRow key={claim.id}>
                              <TableCell className="font-medium">
                                <div>
                                  <div className="font-medium">{getPlayerName(claim.entry.player)}</div>
                                  <div className="text-xs text-muted-foreground md:hidden">
                                    {claim.entry.competition.name}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">{claim.entry.competition.name}</TableCell>
                              <TableCell className="hidden lg:table-cell">{claim.entry.competition.club_name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  Hole {claim.hole_number}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {formatDate(claim.claim_date, 'short')}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusColor(claim.status)} className="flex items-center gap-1 w-fit">
                                  <StatusIcon className="w-3 h-3" />
                                  {claim.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <div className="flex items-center gap-1">
                                  <Camera className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {claim.photo_urls?.length || 0}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedClaim(claim);
                                    setShowDetailModal(true);
                                  }}
                                  className="flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span className="hidden sm:inline">Review</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Claim Detail Modal */}
      {selectedClaim && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Hole-in-One Claim Review</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Player & Competition Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">Player Information</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Name:</strong> {getPlayerName(selectedClaim.entry.player)}</p>
                      <p><strong>Email:</strong> {selectedClaim.entry.player.email}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">Competition Details</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Competition:</strong> {selectedClaim.entry.competition.name}</p>
                      <p><strong>Club:</strong> {selectedClaim.entry.competition.club_name}</p>
                      <p><strong>Hole:</strong> {selectedClaim.hole_number}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Claim Details */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">Claim Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Claim Date:</strong> {formatDateTime(selectedClaim.claim_date)}</p>
                    <p><strong>Current Status:</strong> 
                      <Badge variant={getStatusColor(selectedClaim.status)} className="ml-2">
                        {selectedClaim.status}
                      </Badge>
                    </p>
                    {selectedClaim.witness_name && (
                      <p><strong>Witness:</strong> {selectedClaim.witness_name}</p>
                    )}
                    {selectedClaim.witness_contact && (
                      <p><strong>Witness Contact:</strong> {selectedClaim.witness_contact}</p>
                    )}
                    {selectedClaim.notes && (
                      <div>
                        <strong>Notes:</strong>
                        <p className="mt-1 p-2 bg-muted rounded text-sm">{selectedClaim.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Photos */}
              {selectedClaim.photo_urls && selectedClaim.photo_urls.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">Evidence Photos</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {selectedClaim.photo_urls.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80"
                          onClick={() => window.open(url, '_blank')}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Verification Actions */}
              {selectedClaim.status === 'PENDING' && (
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h3 className="font-semibold">Verification Decision</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="verificationNotes">Verification Notes (Optional)</Label>
                      <Textarea
                        id="verificationNotes"
                        value={verificationNotes}
                        onChange={(e) => setVerificationNotes(e.target.value)}
                        placeholder="Add any notes about your verification decision..."
                        className="min-h-[80px]"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleClaimAction(selectedClaim.id, 'VERIFIED')}
                        disabled={processing}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verify Claim
                      </Button>
                      <Button
                        onClick={() => handleClaimAction(selectedClaim.id, 'REJECTED')}
                        disabled={processing}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Claim
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ClaimsPage;