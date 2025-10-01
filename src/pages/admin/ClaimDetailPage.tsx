import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Camera, ExternalLink, User, Trophy, MapPin, Calendar, CheckCircle, XCircle, Mail, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { showSupabaseError } from "@/lib/showSupabaseError";
import SiteHeader from "@/components/layout/SiteHeader";
import Section from "@/components/layout/Section";
import { StatusBadge } from "@/components/claims/StatusBadge";
import { ClaimRow, VerificationStatus } from "@/types/claims";
import { useAuth } from "@/hooks/useAuth";

const ClaimDetailPage = () => {
  const { verificationId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [claim, setClaim] = useState<ClaimRow | null>(null);
  const [entryData, setEntryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<VerificationStatus>('pending');
  const [witnessConfirmation, setWitnessConfirmation] = useState<any>(null);
  const [isResendingWitness, setIsResendingWitness] = useState(false);
  const [signedUrls, setSignedUrls] = useState<{ selfie?: string; id?: string; handicap?: string }>({});

  useEffect(() => {
    if (verificationId) {
      fetchClaimDetails();
    }
  }, [verificationId]);

  const fetchClaimDetails = async () => {
    try {
      setIsLoading(true);

      // Development diagnostic logging
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 [ClaimDetailPage.fetchClaimDetails] Starting claim details fetch', {
          userProfile: { 
            role: profile?.role, 
            id: profile?.id, 
            club_id: profile?.club_id 
          },
          operation: `Fetching claim details for verification ID: ${verificationId}`,
          queryParams: { 
            tables: ['verifications', 'entries', 'profiles', 'competitions', 'clubs'],
            joins: ['entries -> profiles', 'entries -> competitions -> clubs']
          }
        });
      }
      
      const { data, error } = await supabase
        .from('verifications')
        .select(`
          id, created_at, status, evidence_captured_at, entry_id,
          selfie_url, id_document_url, handicap_proof_url, verified_at, verified_by,
          witness_name, witness_email, witness_phone,
          entries!inner(
            id, player_id, entry_date,
            profiles!inner(id, first_name, last_name, email, age_years, handicap, phone, phone_e164, gender),
            competitions!inner(
              id, name, hole_number, description, prize_pool,
              clubs!inner(id, name)
            )
          )
        `)
        .eq('id', verificationId)
        .single();

      // Fetch witness confirmation status
      const { data: witnessData } = await supabase
        .from('witness_confirmations')
        .select('*')
        .eq('verification_id', verificationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (witnessData) {
        setWitnessConfirmation(witnessData);
      }

      if (error) throw error;

      if (data) {
        const entry = data.entries;
        const player = entry.profiles;
        const competition = entry.competitions;
        const club = competition.clubs;
        
        // Store entry data (including witness data from verification) for access in render
        setEntryData({
          ...entry,
          witness_name: data.witness_name,
          witness_email: data.witness_email,
          witness_phone: data.witness_phone
        });

        const claimRow: ClaimRow = {
          id: data.id,
          status: data.status as VerificationStatus,
          created_at: data.created_at,
          evidence_captured_at: data.evidence_captured_at,
          entry_id: data.entry_id,
          player_id: player.id,
          player_first_name: player.first_name,
          player_last_name: player.last_name,
          player_email: player.email,
          competition_id: competition.id,
          competition_name: competition.name,
          hole_number: competition.hole_number,
          club_id: club.id,
          club_name: club.name,
          selfie_url: data.selfie_url,
          id_document_url: data.id_document_url,
          photos_count: [data.selfie_url, data.id_document_url, data.handicap_proof_url].filter(Boolean).length
        };

        setClaim(claimRow);
        setNewStatus(claimRow.status);

        // Generate signed URLs for evidence files
        const urls: { selfie?: string; id?: string; handicap?: string } = {};
        
        if (data.selfie_url) {
          const { data: signedData } = await supabase.storage
            .from('verifications')
            .createSignedUrl(data.selfie_url.replace('verifications/', ''), 3600);
          if (signedData) urls.selfie = signedData.signedUrl;
        }
        
        if (data.id_document_url) {
          const { data: signedData } = await supabase.storage
            .from('verifications')
            .createSignedUrl(data.id_document_url.replace('verifications/', ''), 3600);
          if (signedData) urls.id = signedData.signedUrl;
        }

        if (data.handicap_proof_url) {
          const { data: signedData } = await supabase.storage
            .from('verifications')
            .createSignedUrl(data.handicap_proof_url.replace('verifications/', ''), 3600);
          if (signedData) urls.handicap = signedData.signedUrl;
        }
        
        setSignedUrls(urls);
      }
    } catch (error) {
      // Enhanced error handling with comprehensive logging
      if (process.env.NODE_ENV !== 'production') {
        console.error("ADMIN PAGE ERROR:", {
          location: "ClaimDetailPage.fetchClaimDetails",
          userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
          operation: `Fetching claim details for verification ID: ${verificationId}`,
          queryParams: { tables: 'verifications with complex joins', operation: 'claim details fetch' },
          code: (error as any)?.code,
          message: (error as any)?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          fullError: error
        });
      }

      const errorMessage = showSupabaseError(error, 'ClaimDetailPage.fetchClaimDetails');
      toast({
        title: "Failed to load claim details",
        description: `${errorMessage}${(error as any)?.code ? ` (Code: ${(error as any).code})` : ''}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!claim || newStatus === claim.status) return;

    try {
      setIsUpdating(true);

      // Development diagnostic logging
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 [ClaimDetailPage.handleStatusUpdate] Starting status update', {
          userProfile: { 
            role: profile?.role, 
            id: profile?.id, 
            club_id: profile?.club_id 
          },
          operation: `Updating claim status from ${claim.status} to ${newStatus}`,
          queryParams: { table: 'verifications', action: 'update status and verification metadata' }
        });
      }
      
      const updateData: any = { status: newStatus };
      
      // Add verification metadata for final statuses
      if (newStatus === 'verified' || newStatus === 'rejected') {
        updateData.verified_at = new Date().toISOString();
        updateData.verified_by = (await supabase.auth.getUser()).data.user?.id;
      }

      const { error } = await supabase
        .from('verifications')
        .update(updateData)
        .eq('id', claim.id);

      if (error) throw error;

      setClaim(prev => prev ? { ...prev, status: newStatus } : null);
      
      toast({
        title: "Success",
        description: "Claim status updated successfully.",
      });
    } catch (error) {
      // Enhanced error handling with comprehensive logging
      if (process.env.NODE_ENV !== 'production') {
        console.error("ADMIN PAGE ERROR:", {
          location: "ClaimDetailPage.handleStatusUpdate",
          userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
          operation: `Updating claim status from ${claim.status} to ${newStatus}`,
          queryParams: { table: 'verifications', action: 'update status and verification metadata' },
          code: (error as any)?.code,
          message: (error as any)?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          fullError: error
        });
      }

      const errorMessage = showSupabaseError(error, 'ClaimDetailPage.handleStatusUpdate');
      toast({
        title: "Failed to update claim status",
        description: `${errorMessage}${(error as any)?.code ? ` (Code: ${(error as any).code})` : ''}`,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getPlayerName = () => {
    if (!claim) return '';
    if (claim.player_first_name || claim.player_last_name) {
      return `${claim.player_first_name || ''} ${claim.player_last_name || ''}`.trim();
    }
    return claim.player_email;
  };

  const getAvailableStatuses = (): VerificationStatus[] => {
    if (!profile) return [];
    
    if (profile.role === 'SUPER_ADMIN' || profile.role === 'ADMIN') {
      return ['initiated', 'pending', 'under_review', 'verified', 'rejected'];
    } else if (profile.role === 'CLUB') {
      return ['under_review'];
    }
    
    return [];
  };

  const getBackPath = () => {
    if (profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN') {
      return '/dashboard/admin/claims';
    } else if (profile?.role === 'CLUB') {
      return '/dashboard/club/claims';
    }
    return '/';
  };

  const handleResendWitnessEmail = async () => {
    if (!claim || !entryData) return;

    setIsResendingWitness(true);
    try {
      const { error } = await supabase.functions.invoke('resend-witness-request', {
        body: {
          verificationId: claim.id,
          witnessEmail: entryData.witness_email || claim.player_email,
          witnessName: entryData.witness_name || 'Witness'
        }
      });

      if (error) throw error;

      toast({
        title: "Witness email resent",
        description: "The witness confirmation email has been sent again."
      });

      // Refresh witness confirmation data
      fetchClaimDetails();
    } catch (error) {
      console.error('Resend witness email error:', error);
      toast({
        title: "Failed to resend email",
        description: "Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsResendingWitness(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <Section className="py-4 md:py-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </Section>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <Section className="py-4 md:py-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Claim Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested claim could not be found.</p>
            <Button onClick={() => navigate(getBackPath())}>
              Back to Claims
            </Button>
          </div>
        </Section>
      </div>
    );
  }

  const availableStatuses = getAvailableStatuses();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <Section className="py-4 md:py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate(getBackPath())}
              className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border-primary/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Claims
            </Button>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold">Claim Details</h1>
              <p className="text-sm text-muted-foreground">Review verification evidence and status</p>
            </div>
            <StatusBadge status={claim.status} />
          </div>

          {/* Status Update - Only for authorized roles */}
          {availableStatuses.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium">Update Status:</label>
                    <Select value={newStatus} onValueChange={(value) => setNewStatus(value as VerificationStatus)}>
                      <SelectTrigger className="w-full md:w-[200px] mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStatuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {status === 'initiated' ? 'Initiated' : 
                             status === 'pending' ? 'Pending' :
                             status === 'under_review' ? 'Under Review' :
                             status === 'verified' ? 'Verified' :
                             status === 'rejected' ? 'Rejected' : status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleStatusUpdate}
                    disabled={isUpdating || newStatus === claim.status}
                    className="gap-2"
                  >
                    {newStatus === 'verified' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : newStatus === 'rejected' ? (
                      <XCircle className="w-4 h-4" />
                    ) : null}
                    Update Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Player & Competition Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Player Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="font-medium">{getPlayerName()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p>{claim.player_email}</p>
                  </div>
                  {entryData?.profiles.age_years && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Age</p>
                      <p>{entryData.profiles.age_years} years</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Handicap</p>
                    <p>{entryData?.profiles.handicap ?? 'Not provided'}</p>
                  </div>
                  {(entryData?.profiles.phone || entryData?.profiles.phone_e164) && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Mobile</p>
                      <p>{entryData.profiles.phone || entryData.profiles.phone_e164}</p>
                    </div>
                  )}
                  {entryData?.profiles.gender && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Gender</p>
                      <p className="capitalize">{entryData.profiles.gender}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Competition Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Competition</p>
                    <p className="font-medium">{claim.competition_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Club</p>
                    <p>{claim.club_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Hole</p>
                    <Badge variant="outline">Hole {claim.hole_number || 'N/A'}</Badge>
                  </div>
                  {entryData?.competitions.prize_pool && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Prize Pool</p>
                      <p className="font-medium text-green-600">£{(Number(entryData.competitions.prize_pool) / 100).toLocaleString()}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Claim Created</p>
                    <p>{formatDateTime(claim.created_at)}</p>
                  </div>
                  {claim.evidence_captured_at && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Evidence Captured</p>
                      <p>{formatDateTime(claim.evidence_captured_at)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Evidence */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Verification Evidence ({claim.photos_count || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {signedUrls.selfie && (
                  <div>
                    <p className="text-sm font-medium mb-2">Player Selfie</p>
                    <img 
                      src={signedUrls.selfie} 
                      alt="Player selfie"
                      className="w-full max-w-sm rounded-lg border"
                      onError={(e) => {
                        console.error('Failed to load selfie image');
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                {signedUrls.id && (
                  <div>
                    <p className="text-sm font-medium mb-2">ID Document</p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => window.open(signedUrls.id, '_blank')}
                        className="gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View ID
                      </Button>
                    </div>
                  </div>
                )}

                {signedUrls.handicap && (
                  <div>
                    <p className="text-sm font-medium mb-2">Handicap Proof</p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => window.open(signedUrls.handicap, '_blank')}
                        className="gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Handicap Proof
                      </Button>
                    </div>
                  </div>
                )}

                {!signedUrls.selfie && !signedUrls.id && !signedUrls.handicap && (
                  <p className="text-muted-foreground text-center py-8">
                    No evidence files uploaded yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Witness Confirmation Status */}
            {entryData && (entryData.witness_email || entryData.witness_name) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Witness Confirmation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Witness Name</p>
                    <p>{entryData.witness_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Witness Email</p>
                    <p>{entryData.witness_email || 'Not provided'}</p>
                  </div>
                  {entryData.witness_phone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Witness Phone</p>
                      <p>{entryData.witness_phone}</p>
                    </div>
                  )}
                  
                  {witnessConfirmation && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email Status</p>
                        <Badge variant={witnessConfirmation.confirmed_at ? "default" : "secondary"}>
                          {witnessConfirmation.confirmed_at ? "Confirmed" : "Pending"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email Sent</p>
                        <p>{formatDateTime(witnessConfirmation.created_at)}</p>
                      </div>
                      {witnessConfirmation.confirmed_at && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Confirmed At</p>
                          <p>{formatDateTime(witnessConfirmation.confirmed_at)}</p>
                        </div>
                      )}
                      {!witnessConfirmation.confirmed_at && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Expires At</p>
                          <p>{formatDateTime(witnessConfirmation.expires_at)}</p>
                        </div>
                      )}
                    </>
                  )}

                  {entryData.witness_email && !witnessConfirmation?.confirmed_at && (
                    <Button
                      variant="outline"
                      onClick={handleResendWitnessEmail}
                      disabled={isResendingWitness}
                      className="w-full gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${isResendingWitness ? 'animate-spin' : ''}`} />
                      {isResendingWitness ? 'Sending...' : 'Resend Witness Email'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
};

export default ClaimDetailPage;