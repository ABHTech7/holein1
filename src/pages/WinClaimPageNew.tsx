import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/fileUploadService";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import VerificationStepIndicator from "@/components/entry/VerificationStepIndicator";
import SelfieCapture from "@/components/entry/SelfieCapture";
import IDDocumentCapture from "@/components/entry/IDDocumentCapture";
import WitnessForm from "@/components/entry/WitnessForm";
import VerificationSuccess from "@/components/entry/VerificationSuccess";
import { VideoEvidenceCapture } from '@/components/entry/VideoEvidenceCapture';
import { SocialConsent } from '@/components/entry/SocialConsent';
import { updateVerificationEvidence } from '@/lib/verificationService';
import { getFileUrl } from '@/lib/fileUploadService';
import type { Gender } from '@/lib/copyEngine';

interface EntryData {
  id: string;
  player_id: string;
  competition: {
    id: string;
    name: string;
    hole_number: number;
    club?: {
      id: string;
      name: string;
    };
  };
  player: {
    id: string;
    first_name?: string;
    last_name?: string;
    gender?: Gender;
  };
}

interface WitnessData {
  name: string;
  email: string;
  phone: string;
  notes?: string;
}

interface VerificationData {
  selfie?: File;
  idDocument?: File;
  witness?: WitnessData;
  videoEvidence?: File;
  socialConsent: boolean;
}

type VerificationStep = 'selfie' | 'id' | 'witness' | 'video' | 'social' | 'success';

const WinClaimPageNew: React.FC = () => {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [entryData, setEntryData] = useState<EntryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Verification flow state
  const [currentStep, setCurrentStep] = useState<VerificationStep>('selfie');
  const [verificationData, setVerificationData] = useState<VerificationData>({
    socialConsent: false
  });

  const stepLabels = ['Take Selfie', 'Upload ID', 'Add Witness', 'Video Evidence', 'Social Consent', 'Complete'];
  const stepIndex = ['selfie', 'id', 'witness', 'video', 'social', 'success'].indexOf(currentStep) + 1;

  useEffect(() => {
    const loadEntryData = async () => {
      if (!entryId) {
        setError('Entry ID is required');
        setIsLoading(false);
        return;
      }

      // CRITICAL: Wait for auth to finish loading before checking user
      if (authLoading) {
        return; // Stay in loading state
      }

      if (!user) {
        setError('Please log in to continue');
        setIsLoading(false);
        return;
      }

      // Check if verification already exists - redirect to success if so
      const { data: existingVerification } = await supabase
        .from('verifications')
        .select('id')
        .eq('entry_id', entryId)
        .maybeSingle();

      if (existingVerification) {
        navigate(`/win-claim-success/${entryId}`);
        return;
      }

      try {
        // Fetch entry with related data using maybeSingle to avoid 406 errors
        const { data: entry, error: entryError } = await supabase
          .from('entries')
          .select(`
            id,
            player_id,
            competition:competitions(
              id,
              name,
              hole_number,
              club:clubs(
                id,
                name
              )
            ),
            player:profiles(
              id,
              first_name,
              last_name,
              gender
            )
          `)
          .eq('id', entryId)
          .maybeSingle();

        if (entryError) {
          console.error('Entry fetch error:', entryError);
          setError('Unable to load entry data');
          setIsLoading(false);
          return;
        }

        if (!entry) {
          setError('Entry not found');
          setIsLoading(false);
          return;
        }

        // Authorization check
        const isPlayerOwner = entry.player_id === user.id;
        const isAdmin = user.user_metadata?.role === 'admin';

        if (!isPlayerOwner && !isAdmin) {
          setError('You are not authorized to access this entry');
          setIsLoading(false);
          return;
        }

        // Validate entry is eligible for win verification
        const { data: entryCheck, error: checkError } = await supabase.rpc('get_safe_competition_data', {
          p_club_id: entry.competition?.club?.id,
          p_competition_slug: ''
        });

        if (checkError) {
          console.warn('Competition validation warning:', checkError);
        }

        setEntryData(entry as EntryData);
        setIsLoading(false);

      } catch (error) {
        console.error('Error loading entry data:', error);
        setError('Failed to load entry information');
        setIsLoading(false);
      }
    };

    loadEntryData();
  }, [entryId, user, authLoading]);

  const handleSelfieCapture = (file: File) => {
    setVerificationData(prev => ({ ...prev, selfie: file }));
  };

  const handleIdCapture = (file: File) => {
    setVerificationData(prev => ({ ...prev, idDocument: file }));
  };

  const handleWitnessSubmit = (witness: WitnessData) => {
    setVerificationData(prev => ({ ...prev, witness }));
  };

  const handleVideoCapture = (file: File) => {
    setVerificationData(prev => ({ ...prev, videoEvidence: file }));
  };

  const handleSocialConsentChange = (consent: boolean) => {
    setVerificationData(prev => ({ ...prev, socialConsent: consent }));
  };

  const handleSubmitVerification = async () => {
    if (!verificationData.selfie || !verificationData.idDocument || !verificationData.witness) {
      toast({
        title: "Missing information",
        description: "Please complete all required verification steps.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Auth race-proof: get fresh session
      let { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      // If auth fails with 401 or coerce error, refresh session and retry once
      if (authError || !authUser?.id) {
        console.warn('Auth retry needed:', authError);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const retry = await supabase.auth.getUser();
          authUser = retry.data.user;
          authError = retry.error;
        }
      }
      
      if (!authUser?.id) {
        throw new Error('User not authenticated. Please log in and try again.');
      }

      // Upload files to verifications bucket
      const uploadToVerificationsBucket = async (file: File, role: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${entryId}/${role}-${crypto.randomUUID()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from('verifications')
          .upload(fileName, file);
        if (error) throw error;
        return `verifications/${data.path}`;
      };

      const uploads: any = {
        selfie_url: await uploadToVerificationsBucket(verificationData.selfie, 'selfie'),
        id_document_url: await uploadToVerificationsBucket(verificationData.idDocument, 'id'),
        witness_name: verificationData.witness.name,
        witness_email: verificationData.witness.email,
        witness_phone: verificationData.witness.phone,
        social_consent: verificationData.socialConsent,
        status: 'submitted'
      };

      if (verificationData.videoEvidence) {
        uploads.video_url = await uploadToVerificationsBucket(verificationData.videoEvidence, 'video');
      }

      // Create/update verification
      await supabase.rpc('create_or_upsert_verification', {
        p_entry_id: entryId,
        p_payload: uploads
      });

      // Send emails
      try {
        await supabase.functions.invoke('send-claim-confirmation', { body: { entryId } });
        if (verificationData.witness.email) {
          await supabase.functions.invoke('send-witness-request', {
            body: { verificationId: entryId, witnessEmail: verificationData.witness.email, witnessName: verificationData.witness.name }
          });
        }
      } catch (e) { console.warn('Email error:', e); }

      navigate(`/win-claim-success/${entryId}`);
    } catch (error) {
      console.error('Verification submission error:', error);
      toast({
        title: "Submission failed",
        description: "Please try again or contact support if the problem persists.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = () => {
    navigate(`/win-claim-success/${entryId}`);
  };

  const handleStepNavigation = (direction: 'next' | 'back') => {
    const steps: VerificationStep[] = ['selfie', 'id', 'witness', 'video', 'social', 'success'];
    const currentIndex = steps.indexOf(currentStep);
    
    if (direction === 'next' && currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    } else if (direction === 'back' && currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">Loading your verification...</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <SiteFooter />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
                <h2 className="text-xl font-semibold">Unable to Load Entry</h2>
                <p className="text-muted-foreground">{error}</p>
                <div className="flex gap-4 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(-1)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                🏆 Verify Your Hole-in-One!
              </h1>
              <p className="text-lg text-muted-foreground mb-4">
                Complete the verification process for your legendary shot at{' '}
                <span className="font-semibold">{entryData?.competition?.club?.name}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Competition: {entryData?.competition?.name} • Hole {entryData?.competition?.hole_number}
              </p>
            </div>

            {/* Progress Indicator */}
            {currentStep !== 'success' && (
              <div className="mb-8">
                <VerificationStepIndicator 
                  currentStep={stepIndex}
                  totalSteps={stepLabels.length}
                  stepLabels={stepLabels}
                />
              </div>
            )}

            {/* Processing Overlay */}
            {isSubmitting && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <Card className="p-8">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <h3 className="text-lg font-semibold">Submitting Your Evidence</h3>
                    <p className="text-muted-foreground">
                      Uploading files and creating your verification record...
                    </p>
                  </div>
                </Card>
              </div>
            )}

            {/* Step Content */}
            {currentStep === 'selfie' && (
              <SelfieCapture
                onPhotoCapture={handleSelfieCapture}
                onNext={() => handleStepNavigation('next')}
                onBack={() => handleStepNavigation('back')}
              />
            )}

            {currentStep === 'id' && (
              <IDDocumentCapture
                onDocumentCapture={handleIdCapture}
                onNext={() => handleStepNavigation('next')}
                onBack={() => handleStepNavigation('back')}
              />
            )}

            {currentStep === 'witness' && (
              <WitnessForm
                onWitnessSubmit={handleWitnessSubmit}
                onNext={() => handleStepNavigation('next')}
                onBack={() => handleStepNavigation('back')}
              />
            )}

            {currentStep === 'video' && (
              <div className="space-y-6">
                <VideoEvidenceCapture
                  onVideoCapture={handleVideoCapture}
                  capturedVideo={verificationData.videoEvidence}
                  onRemove={() => setVerificationData(prev => ({ ...prev, videoEvidence: undefined }))}
                />
                
                {/* Navigation for Video Step */}
                <div className="flex justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleStepNavigation('back')}
                  >
                    Back
                  </Button>
                  
                  <Button
                    onClick={() => handleStepNavigation('next')}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 'social' && (
              <div className="space-y-6">
                <SocialConsent
                  consent={verificationData.socialConsent}
                  onConsentChange={handleSocialConsentChange}
                />
                
                {/* Final Navigation */}
                <div className="flex justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleStepNavigation('back')}
                  >
                    Back
                  </Button>
                  
                  <Button
                    onClick={handleSubmitVerification}
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
                  >
                    {isSubmitting ? 'Submitting...' : '🏆 Submit for Glory!'}
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 'success' && (
              <VerificationSuccess 
                competitionName={entryData?.competition?.name || 'Golf Competition'}
                prizeAmount={1000}
                onComplete={handleComplete} 
              />
            )}

            {/* Navigation Buttons for Main Steps */}
            {currentStep !== 'success' && currentStep !== 'video' && currentStep !== 'social' && (
              <div className="flex justify-between pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleStepNavigation('back')}
                  disabled={currentStep === 'selfie'}
                >
                  Back
                </Button>
                
                <Button
                  onClick={() => handleStepNavigation('next')}
                  disabled={
                    (currentStep === 'selfie' && !verificationData.selfie) ||
                    (currentStep === 'id' && !verificationData.idDocument) ||
                    (currentStep === 'witness' && !verificationData.witness)
                  }
                >
                  Continue
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <SiteFooter />
    </div>
  );
};

export default WinClaimPageNew;