import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [witnessConfirmation, setWitnessConfirmation] = useState<any>(null);
  const [isResendingWitness, setIsResendingWitness] = useState(false);
  const [signedUrls, setSignedUrls] = useState<{ selfie?: string; id?: string; handicap?: string }>({});
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

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

  const handleAcceptClaim = async () => {
    if (!claim) return;

    try {
      setIsUpdating(true);

      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 [ClaimDetailPage.handleAcceptClaim] Accepting claim', {
          userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
          operation: `Accepting claim ${claim.id}`,
        });
      }

      const updateData = {
        status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by: (await supabase.auth.getUser()).data.user?.id,
      };

      const { error } = await supabase
        .from('verifications')
        .update(updateData)
        .eq('id', claim.id);

      if (error) throw error;

      setClaim(prev => prev ? { ...prev, status: 'verified' } : null);
      setShowAcceptDialog(false);
      
      toast({
        title: "Claim Accepted",
        description: "The claim has been successfully verified and accepted.",
      });

      fetchClaimDetails();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("ADMIN PAGE ERROR:", {
          location: "ClaimDetailPage.handleAcceptClaim",
          userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
          fullError: error
        });
      }

      const errorMessage = showSupabaseError(error, 'ClaimDetailPage.handleAcceptClaim');
      toast({
        title: "Failed to accept claim",
        description: `${errorMessage}${(error as any)?.code ? ` (Code: ${(error as any).code})` : ''}`,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectClaim = async () => {
    if (!claim) return;

    try {
      setIsUpdating(true);

      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 [ClaimDetailPage.handleRejectClaim] Rejecting claim', {
          userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
          operation: `Rejecting claim ${claim.id}`,
          reason: rejectionReason,
        });
      }

      const updateData = {
        status: 'rejected',
        verified_at: new Date().toISOString(),
        verified_by: (await supabase.auth.getUser()).data.user?.id,
      };

      const { error } = await supabase
        .from('verifications')
        .update(updateData)
        .eq('id', claim.id);

      if (error) throw error;

      setClaim(prev => prev ? { ...prev, status: 'rejected' } : null);
      setShowRejectDialog(false);
      
      toast({
        title: "Claim Rejected",
        description: rejectionReason 
          ? `The claim has been rejected. Reason: ${rejectionReason}`
          : "The claim has been rejected.",
      });

      setRejectionReason('');
      fetchClaimDetails();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("ADMIN PAGE ERROR:", {
          location: "ClaimDetailPage.handleRejectClaim",
          userProfile: { role: profile?.role, id: profile?.id, club_id: profile?.club_id },
          fullError: error
        });
      }

      const errorMessage = showSupabaseError(error, 'ClaimDetailPage.handleRejectClaim');
      toast({
        title: "Failed to reject claim",
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

  const canReviewClaim = () => {
    if (!profile) return false;
    return profile.role === 'SUPER_ADMIN' || profile.role === 'ADMIN' || profile.role === 'CLUB';
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

          {/* Action Buttons - Only show for pending claims that authorized users can review */}
          {canReviewClaim() && claim.status === 'pending' && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-2">Review Claim</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Please review all evidence and verify the claim is legitimate before making a decision.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={() => setShowAcceptDialog(true)}
                    disabled={isUpdating}
                    size="lg"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white h-14 text-base font-semibold"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Accept Claim
                  </Button>
                  <Button
                    onClick={() => setShowRejectDialog(true)}
                    disabled={isUpdating}
                    variant="destructive"
                    size="lg"
                    className="flex-1 h-14 text-base font-semibold"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Reject Claim
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Display - Show for already processed claims */}
          {claim.status !== 'pending' && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Claim Status</h2>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    <StatusBadge status={claim.status} />
                  </div>
                  {claim.evidence_captured_at && (
                    <p className="text-sm text-muted-foreground">
                      Evidence captured: {formatDateTime(claim.evidence_captured_at)}
                    </p>
                  )}
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
                    <img 
                      src={signedUrls.id} 
                      alt="ID document"
                      className="w-full max-w-sm rounded-lg border"
                      onError={(e) => {
                        console.error('Failed to load ID document');
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {signedUrls.handicap && (
                  <div>
                    <p className="text-sm font-medium mb-2">Handicap Proof</p>
                    <img 
                      src={signedUrls.handicap} 
                      alt="Handicap proof"
                      className="w-full max-w-sm rounded-lg border"
                      onError={(e) => {
                        console.error('Failed to load handicap proof');
                        e.currentTarget.style.display = 'none';
                      }}
                    />
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

      {/* Accept Confirmation Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept this claim?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the claim as verified and accepted. The player will be notified of the successful verification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAcceptClaim}
              disabled={isUpdating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUpdating ? 'Processing...' : 'Accept Claim'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this claim?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the claim as rejected. The player will be notified that their claim was not accepted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Rejection Reason (Optional)
            </label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide a reason for rejecting this claim..."
              className="min-h-[100px]"
              disabled={isUpdating}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectClaim}
              disabled={isUpdating}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isUpdating ? 'Processing...' : 'Reject Claim'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClaimDetailPage;