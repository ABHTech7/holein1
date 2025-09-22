import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/fileUploadService";
import { getConfig } from "@/lib/featureFlags";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import VerificationStepIndicator from "@/components/entry/VerificationStepIndicator";
import SelfieCapture from "@/components/entry/SelfieCapture";
import IDDocumentCapture from "@/components/entry/IDDocumentCapture";
import WitnessForm from "@/components/entry/WitnessForm";
import VerificationSuccess from "@/components/entry/VerificationSuccess";
import type { Gender } from '@/lib/copyEngine';

interface EntryData {
  id: string;
  player_id: string;
  competition: {
    id: string;
    name: string;
    prize_pool: number;
    hole_number: number;
    club_name: string;
  };
  player: {
    first_name: string;
    gender?: Gender;
  };
  outcome_self: string | null;
  status: string;
}

interface WitnessData {
  name: string;
  email: string;
  phone: string;
  notes?: string;
}

type VerificationStep = 'selfie' | 'id' | 'witness' | 'success';

const WinClaimPageNew: React.FC = () => {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [entryData, setEntryData] = useState<EntryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Verification flow state
  const [currentStep, setCurrentStep] = useState<VerificationStep>('selfie');
  const [verificationData, setVerificationData] = useState<{
    selfieFile?: File;
    idFile?: File;
    witnessData?: WitnessData;
  }>({});

  const stepLabels = ['Take Selfie', 'Upload ID', 'Add Witness', 'Complete'];
  const stepIndex = ['selfie', 'id', 'witness', 'success'].indexOf(currentStep) + 1;

  useEffect(() => {
    const loadEntryData = async () => {
      if (!entryId) {
        setError('Entry ID is required');
        return;
      }

      try {
        // 1) Load entry
        const { data: entryRecord, error: entryError } = await supabase
          .from('entries')
          .select('id, player_id, outcome_self, status, competition_id')
          .eq('id', entryId)
          .maybeSingle();

        if (entryError || !entryRecord) {
          console.error('Failed to fetch entry:', entryError);
          setError('Entry not found');
          return;
        }

        // 2) Authorization: allow owner, ADMIN, or CLUB
        if (user && entryRecord.player_id !== user.id) {
          const role = (user.user_metadata as any)?.role;
          const isPrivileged = role === 'ADMIN' || role === 'CLUB';
          if (!isPrivileged) {
            setError('You are not authorized to access this entry');
            return;
          }
        }

        // 3) Validate eligibility
        if (entryRecord.outcome_self !== 'win' && entryRecord.status !== 'pending_verification') {
          setError('This entry is not eligible for win verification');
          return;
        }

        // 4) Load competition
        const { data: competitionRecord } = await supabase
          .from('competitions')
          .select('id, name, prize_pool, hole_number, club_id')
          .eq('id', entryRecord.competition_id)
          .maybeSingle();

        // 5) Load club (security definer function)
        let clubName = 'Unknown Club';
        if (competitionRecord?.club_id) {
          const { data: clubData } = await supabase.rpc('get_safe_club_info', { club_uuid: competitionRecord.club_id });
          if (clubData && Array.isArray(clubData) && clubData.length > 0) {
            clubName = clubData[0].name;
          }
        }

        // 6) Load player profile (own profile or safe function)
        let playerFirstName = 'Player';
        if (user && entryRecord.player_id === user.id) {
          const { data: playerRecord } = await supabase
            .from('profiles')
            .select('first_name, gender')
            .eq('id', entryRecord.player_id)
            .maybeSingle();
          if (playerRecord?.first_name) playerFirstName = playerRecord.first_name;
        } else {
          const { data: profileSafe } = await supabase.rpc('get_current_user_profile_safe');
          if (profileSafe && Array.isArray(profileSafe) && profileSafe.length > 0) {
            playerFirstName = profileSafe[0].first_name || 'Player';
          }
        }

        setEntryData({
          id: entryRecord.id,
          player_id: entryRecord.player_id,
          competition: {
            id: competitionRecord?.id || '',
            name: competitionRecord?.name || 'Competition',
            prize_pool: competitionRecord?.prize_pool || 0,
            hole_number: competitionRecord?.hole_number || 1,
            club_name: clubName,
          },
          player: {
            first_name: playerFirstName,
            gender: undefined,
          },
          outcome_self: entryRecord.outcome_self,
          status: entryRecord.status,
        });

      } catch (error) {
        console.error('Error loading entry:', error);
        setError('Failed to load entry data');
      } finally {
        setIsLoading(false);
      }
    };

    loadEntryData();
  }, [entryId, user]);

  const handleSelfieCapture = (file: File) => {
    setVerificationData(prev => ({ ...prev, selfieFile: file }));
  };

  const handleIdCapture = (file: File) => {
    setVerificationData(prev => ({ ...prev, idFile: file }));
  };

  const handleWitnessSubmit = (witnessData: WitnessData) => {
    setVerificationData(prev => ({ ...prev, witnessData }));
  };

  const handleSubmitVerification = async () => {
    if (!entryData || !user || !verificationData.selfieFile || !verificationData.idFile || !verificationData.witnessData) {
      toast({
        title: "Missing information",
        description: "Please complete all verification steps.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload files
      const [selfieUpload, idUpload] = await Promise.all([
        uploadFile(verificationData.selfieFile, user.id, {
          purpose: 'selfie',
          expiresInHours: 24,
        }),
        uploadFile(verificationData.idFile, user.id, {
          purpose: 'id_document',
          expiresInHours: 24,
        })
      ]);

      const config = getConfig();
      const autoMissAt = new Date(Date.now() + config.verificationTimeoutHours * 60 * 60 * 1000);

      // Create verification record
      const { error: verificationError } = await supabase
        .from('verifications')
        .insert({
          entry_id: entryId,
          witnesses: {
            name: verificationData.witnessData.name.trim(),
            contact: verificationData.witnessData.email.trim(),
            phone: verificationData.witnessData.phone.trim(),
            notes: verificationData.witnessData.notes?.trim() || null
          },
          selfie_url: `${selfieUpload.storage_bucket}/${selfieUpload.storage_path}`,
          id_document_url: `${idUpload.storage_bucket}/${idUpload.storage_path}`,
          status: 'pending',
          evidence_captured_at: new Date().toISOString(),
          auto_miss_at: autoMissAt.toISOString(),
          auto_miss_applied: false,
        });

      if (verificationError) {
        console.error('Verification creation failed:', verificationError);
        throw new Error('Failed to create verification record');
      }

      // Update entry status
      const { error: entryError } = await supabase
        .from('entries')
        .update({
          outcome_self: 'win',
          outcome_reported_at: new Date().toISOString(),
          status: 'pending_verification'
        })
        .eq('id', entryId);

      if (entryError) {
        console.error('Entry update failed:', entryError);
        throw new Error('Failed to update entry status');
      }

      // Move to success step
      setCurrentStep('success');
      
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = () => {
    toast({
      title: "Verification submitted!",
      description: "Your hole-in-one claim has been submitted for review",
    });
    navigate(`/entry-success/${entryData?.id}`);
  };

  const handleStepNavigation = (direction: 'next' | 'back') => {
    if (direction === 'next') {
      switch (currentStep) {
        case 'selfie':
          setCurrentStep('id');
          break;
        case 'id':
          setCurrentStep('witness');
          break;
        case 'witness':
          handleSubmitVerification();
          break;
      }
    } else {
      switch (currentStep) {
        case 'id':
          setCurrentStep('selfie');
          break;
        case 'witness':
          setCurrentStep('id');
          break;
        case 'selfie':
          navigate(`/entry-success/${entryData?.id}`);
          break;
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin mr-3 text-primary" />
              <span className="text-muted-foreground">Loading entry details...</span>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (error || !entryData) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="text-center p-8">
              <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Unable to Load Entry</h2>
              <p className="text-muted-foreground mb-6">{error || 'Entry not found'}</p>
              <Button onClick={() => navigate('/')}>
                Go Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      
      <main className="flex-1 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/entry-success/${entryData.id}`)}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Hole-in-One Verification
              </h1>
              <p className="text-sm text-muted-foreground">
                {entryData.competition.name} • {entryData.competition.club_name}
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          {currentStep !== 'success' && (
            <VerificationStepIndicator
              currentStep={stepIndex}
              totalSteps={3}
              stepLabels={stepLabels.slice(0, 3)}
            />
          )}

          {/* Step Content */}
          <Card className="shadow-medium animate-fade-in">
            <CardContent className="p-6">
              {isSubmitting && (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Processing Your Verification</h3>
                  <p className="text-muted-foreground">
                    Please wait while we securely process your hole-in-one claim...
                  </p>
                </div>
              )}
              
              {!isSubmitting && currentStep === 'selfie' && (
                <SelfieCapture
                  onPhotoCapture={handleSelfieCapture}
                  onNext={() => handleStepNavigation('next')}
                  onBack={() => handleStepNavigation('back')}
                />
              )}
              
              {!isSubmitting && currentStep === 'id' && (
                <IDDocumentCapture
                  onDocumentCapture={handleIdCapture}
                  onNext={() => handleStepNavigation('next')}
                  onBack={() => handleStepNavigation('back')}
                />
              )}
              
              {!isSubmitting && currentStep === 'witness' && (
                <WitnessForm
                  onWitnessSubmit={handleWitnessSubmit}
                  onNext={() => handleStepNavigation('next')}
                  onBack={() => handleStepNavigation('back')}
                />
              )}
              
              {currentStep === 'success' && (
                <VerificationSuccess
                  competitionName={entryData.competition.name}
                  prizeAmount={entryData.competition.prize_pool}
                  onComplete={handleComplete}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default WinClaimPageNew;