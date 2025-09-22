import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { uploadFile, deleteFile, getFileUrl } from "@/lib/fileUploadService";
import { getWinClaimMessage, getVerificationPrompt } from "@/lib/copyEngine";
import { getConfig } from "@/lib/featureFlags";
import { 
  Trophy, 
  Camera, 
  Upload, 
  X, 
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  User,
  Video,
  Loader2,
  Shield,
  Clock
} from "lucide-react";
import type { Gender } from '@/lib/copyEngine';
import type { UploadedFile } from '@/lib/fileUploadService';

interface EnhancedWinClaimFormProps {
  entryId: string;
  competition: {
    name: string;
    prize_pool: number;
    hole_number: number;
    club_name: string;
  };
  player: {
    first_name: string;
    gender?: Gender;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const EnhancedWinClaimForm: React.FC<EnhancedWinClaimFormProps> = ({
  entryId,
  competition,
  player,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Form state
  const [currentStep, setCurrentStep] = useState<'verification' | 'evidence' | 'submitting'>('verification');
  const [witnessName, setWitnessName] = useState('');
  const [witnessContact, setWitnessContact] = useState('');
  const [notes, setNotes] = useState('');
  
  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState<{
    selfie?: UploadedFile;
    idDocument?: UploadedFile;
    handicapProof?: UploadedFile;
    videoEvidence?: UploadedFile;
  }>({});
  
  const [uploadProgress, setUploadProgress] = useState<{
    selfie: number;
    idDocument: number;
    handicapProof: number;
    videoEvidence: number;
  }>({
    selfie: 0,
    idDocument: 0,
    handicapProof: 0,
    videoEvidence: 0
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // File input refs
  const selfieRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);
  const handicapRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const winMessage = getWinClaimMessage({
    firstName: player.first_name,
    gender: player.gender,
    prizeAmount: competition.prize_pool / 100,
  });

  const verificationPrompt = getVerificationPrompt({
    firstName: player.first_name,
    gender: player.gender,
  });

  const handleFileUpload = async (
    file: File, 
    purpose: 'selfie' | 'id_document' | 'handicap_proof' | 'video_evidence'
  ) => {
    if (!user?.id) {
      toast({ title: "Authentication required", variant: "destructive" });
      return;
    }

    try {
      // Update progress
      setUploadProgress(prev => ({ ...prev, [purpose]: 10 }));
      
      // Upload file with expiration (24 hours for verification files)
      const uploadedFile = await uploadFile(file, user.id, {
        purpose: purpose === 'video_evidence' ? 'shot_video' : purpose,
        expiresInHours: 24,
      });
      
      setUploadProgress(prev => ({ ...prev, [purpose]: 100 }));
      
      // Update state
      setUploadedFiles(prev => ({
        ...prev,
        [purpose]: uploadedFile,
      }));
      
      toast({ 
        title: "Upload successful", 
        description: `${purpose.replace('_', ' ')} uploaded successfully`
      });

      // Auto-advance to next step if all required files are uploaded
      setTimeout(() => {
        setUploadProgress(prev => ({ ...prev, [purpose]: 0 }));
      }, 1000);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadProgress(prev => ({ ...prev, [purpose]: 0 }));
      toast({ 
        title: "Upload failed", 
        description: error instanceof Error ? error.message : 'Please try again',
        variant: "destructive"
      });
    }
  };

  const handleFileRemove = async (purpose: keyof typeof uploadedFiles) => {
    const file = uploadedFiles[purpose];
    if (!file) return;

    try {
      await deleteFile(file.id);
      setUploadedFiles(prev => {
        const updated = { ...prev };
        delete updated[purpose];
        return updated;
      });
      toast({ title: "File removed" });
    } catch (error) {
      console.error('Remove failed:', error);
      toast({ title: "Remove failed", variant: "destructive" });
    }
  };

  const canProceedToEvidence = () => {
    return uploadedFiles.selfie && uploadedFiles.idDocument && uploadedFiles.handicapProof;
  };

  const canSubmit = () => {
    return canProceedToEvidence() && witnessName.trim() && witnessContact.trim();
  };

  const handleSubmit = async () => {
    if (!canSubmit()) {
      toast({ title: "Missing required information", variant: "destructive" });
      return;
    }

    setCurrentStep('submitting');
    setIsSubmitting(true);

    try {
      const config = getConfig();
      const autoMissAt = new Date(Date.now() + config.verificationTimeoutHours * 60 * 60 * 1000);

      // Create verification record with file storage references (bucket/path format)
      const { error: verificationError } = await supabase
        .from('verifications')
        .insert({
          entry_id: entryId,
          witnesses: {
            name: witnessName.trim(),
            contact: witnessContact.trim()
          },
          // Store as bucket/path format for signed URL generation
          selfie_url: `${uploadedFiles.selfie!.storage_bucket}/${uploadedFiles.selfie!.storage_path}`,
          id_document_url: `${uploadedFiles.idDocument!.storage_bucket}/${uploadedFiles.idDocument!.storage_path}`,
          handicap_proof_url: `${uploadedFiles.handicapProof!.storage_bucket}/${uploadedFiles.handicapProof!.storage_path}`,
          video_url: uploadedFiles.videoEvidence ? 
            `${uploadedFiles.videoEvidence.storage_bucket}/${uploadedFiles.videoEvidence.storage_path}` : 
            null,
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

      toast({
        title: "Verification submitted!",
        description: "Your hole-in-one claim is now under review"
      });

      onSuccess();
      
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
      setCurrentStep('evidence');
      setIsSubmitting(false);
    }
  };

  const FileUploadCard = ({ 
    purpose, 
    title, 
    icon: Icon, 
    required = false,
    acceptedTypes = "image/*",
    description 
  }: {
    purpose: keyof typeof uploadedFiles;
    title: string;
    icon: any;
    required?: boolean;
    acceptedTypes?: string;
    description: string;
  }) => {
    const file = uploadedFiles[purpose];
    const progress = uploadProgress[purpose as keyof typeof uploadProgress];
    const isUploading = progress > 0 && progress < 100;

    return (
      <Card className="relative">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{title}</h3>
              {required && <Badge variant="destructive" className="text-xs">Required</Badge>}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-4">{description}</p>

          {file ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800 dark:text-green-200 font-medium">
                    {file.original_filename}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleFileRemove(purpose)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {isUploading && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    Uploading... {progress}%
                  </p>
                </div>
              )}
              
              <Button
                variant="outline"
                className="w-full h-16 border-2 border-dashed hover:border-primary/50"
                onClick={() => {
                  const refs = { selfie: selfieRef, idDocument: idRef, handicapProof: handicapRef, videoEvidence: videoRef };
                  refs[purpose]?.current?.click();
                }}
                disabled={isUploading}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-5 h-5" />
                  <span className="text-sm">
                    {isUploading ? 'Uploading...' : 'Tap to upload'}
                  </span>
                </div>
              </Button>
              
              <input
                ref={refs[purpose as keyof typeof refs]}
                type="file"
                accept={acceptedTypes}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, purpose as any);
                }}
                className="hidden"
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const refs = { selfie: selfieRef, idDocument: idRef, handicapProof: handicapRef, videoEvidence: videoRef };

  if (currentStep === 'submitting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-center">Processing Your Claim</h3>
            <p className="text-muted-foreground text-center mb-4">
              Please wait while we securely process your verification...
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Secure verification in progress</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2">{winMessage}</h1>
              <p className="text-muted-foreground mb-4">{verificationPrompt}</p>
              
              <div className="flex justify-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span>£{(competition.prize_pool / 100).toFixed(2)} Prize</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>{getConfig().verificationTimeoutHours}h verification window</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'verification' ? 'bg-primary text-white' : 'bg-green-500 text-white'
          }`}>
            {currentStep === 'verification' ? '1' : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div className="w-16 h-1 bg-muted rounded-full">
            <div className={`h-full rounded-full transition-all ${
              currentStep === 'evidence' || canProceedToEvidence() ? 'bg-primary w-full' : 'bg-muted w-0'
            }`} />
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'evidence' ? 'bg-primary text-white' : 
            canProceedToEvidence() ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            2
          </div>
        </div>

        {currentStep === 'verification' && (
          <>
            {/* Required Evidence Upload */}
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Upload Required Evidence</h2>
                <p className="text-muted-foreground">We need these documents to verify your identity and handicap</p>
              </div>

              <div className="grid gap-4">
                <FileUploadCard
                  purpose="selfie"
                  title="Take a Selfie"
                  icon={Camera}
                  required
                  acceptedTypes="image/*"
                  description="Take a clear selfie to verify your identity"
                />
                
                <FileUploadCard
                  purpose="idDocument"
                  title="ID Document"
                  icon={CreditCard}
                  required
                  acceptedTypes="image/*,application/pdf"
                  description="Upload your driving license, passport, or ID card"
                />
                
                <FileUploadCard
                  purpose="handicapProof"
                  title="Handicap Certificate"
                  icon={User}
                  required
                  acceptedTypes="image/*,application/pdf"
                  description="Upload your official handicap certificate or card"
                />
              </div>

              <div className="flex justify-between gap-4">
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={() => setCurrentStep('evidence')}
                  disabled={!canProceedToEvidence()}
                  className="flex-1"
                >
                  Continue to Witness Details
                </Button>
              </div>
            </div>
          </>
        )}

        {currentStep === 'evidence' && (
          <>
            {/* Witness Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Witness Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="witness-name">Witness Name *</Label>
                  <Input
                    id="witness-name"
                    value={witnessName}
                    onChange={(e) => setWitnessName(e.target.value)}
                    placeholder="Full name of person who saw your shot"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="witness-contact">Witness Contact *</Label>
                  <Input
                    id="witness-contact"
                    value={witnessContact}
                    onChange={(e) => setWitnessContact(e.target.value)}
                    placeholder="Phone number or email"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Optional Video Evidence */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Video Evidence
                  <Badge variant="outline" className="text-xs">Optional</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUploadCard
                  purpose="videoEvidence"
                  title="Shot Video"
                  icon={Video}
                  acceptedTypes="video/*"
                  description="Upload a video of your shot (if available)"
                />
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardContent className="p-4">
                <Label htmlFor="notes">Additional Details</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional details about your shot (optional)"
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep('verification')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit() || isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4 mr-2" />
                    Submit Claim
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Security Notice */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>All uploads are encrypted and automatically deleted after verification</span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedWinClaimForm;