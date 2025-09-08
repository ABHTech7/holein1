import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Camera, 
  Video, 
  Play, 
  Square, 
  RotateCcw, 
  Upload, 
  CheckCircle2, 
  AlertTriangle,
  Timer,
  Target,
  Trophy,
  RefreshCw
} from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import useAuth from '@/hooks/useAuth';
import WinClaimForm from './WinClaimForm';

interface AttemptFlowProps {
  entryId: string;
  competitionName: string;
  holeNumber: number;
  venueName: string;
  timeRemaining: number;
  onOutcomeReported: (outcome: 'win' | 'miss') => void;
}

type FlowStep = 'instructions' | 'setup' | 'recording' | 'review' | 'outcome' | 'win-claim';

export const AttemptFlow = ({ 
  entryId, 
  competitionName, 
  holeNumber, 
  venueName,
  timeRemaining,
  onOutcomeReported 
}: AttemptFlowProps) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('instructions');
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reportedOutcome, setReportedOutcome] = useState<'win' | 'miss' | null>(null);
  const [recordingProgress, setRecordingProgress] = useState(0);
  
  const { user } = useAuth();
  const {
    videoRef,
    isRecording,
    hasPermission,
    isSupported,
    requestPermission,
    startRecording,
    stopRecording,
    cleanup,
    switchCamera,
  } = useCamera({ maxDuration: 30, quality: 'medium' });

  // Recording progress timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingProgress(prev => {
          if (prev >= 100) {
            return 100;
          }
          return prev + (100 / 30); // 30 seconds max
        });
      }, 1000);
    } else {
      setRecordingProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const handleStartSetup = async () => {
    setCurrentStep('setup');
    const hasAccess = await requestPermission();
    if (hasAccess) {
      setCurrentStep('recording');
    }
  };

  const handleStartRecording = async () => {
    const success = await startRecording();
    if (!success) {
      setCurrentStep('setup');
    }
  };

  const handleStopRecording = async () => {
    const videoBlob = await stopRecording();
    if (videoBlob) {
      setRecordedVideo(videoBlob);
      const url = URL.createObjectURL(videoBlob);
      setVideoUrl(url);
      setCurrentStep('review');
    }
  };

  const handleRetakeVideo = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    setRecordedVideo(null);
    setCurrentStep('recording');
    setRecordingProgress(0);
  };

  const uploadVideo = async (videoBlob: Blob): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileName = `entry-${entryId}-${Date.now()}.mp4`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('shot-videos')
        .upload(filePath, videoBlob, {
          contentType: 'video/mp4',
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('Video upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('shot-videos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Video upload failed:', error);
      return null;
    }
  };

  const handleReportOutcome = async (outcome: 'win' | 'miss') => {
    setUploading(true);
    
    try {
      let videoEvidenceUrl = null;
      
      // Upload video if available
      if (recordedVideo) {
        videoEvidenceUrl = await uploadVideo(recordedVideo);
      }

      // Update entry with outcome and video
      const updateData: any = {
        outcome_self: outcome,
        outcome_reported_at: new Date().toISOString()
      };

      if (videoEvidenceUrl) {
        updateData.video_evidence_url = videoEvidenceUrl;
      }

      const { error } = await supabase
        .from('entries')
        .update(updateData)
        .eq('id', entryId);

      if (error) throw error;

      setReportedOutcome(outcome);
      
      if (outcome === 'win') {
        setCurrentStep('win-claim');
      } else {
        onOutcomeReported(outcome);
        toast({
          title: "Outcome recorded",
          description: "Thanks for reporting your result"
        });
      }
    } catch (error: any) {
      console.error('Report outcome error:', error);
      toast({
        title: "Failed to report outcome",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleWinClaimSuccess = () => {
    onOutcomeReported('win');
    cleanup();
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [cleanup, videoUrl]);

  if (currentStep === 'win-claim') {
    return (
      <WinClaimForm
        entryId={entryId}
        competitionName={competitionName}
        holeNumber={holeNumber}
        venueName={venueName}
        onSuccess={handleWinClaimSuccess}
        onCancel={() => setCurrentStep('outcome')}
      />
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Target className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-['Montserrat']">
          {currentStep === 'instructions' && 'Ready for Your Shot?'}
          {currentStep === 'setup' && 'Camera Setup'}
          {currentStep === 'recording' && 'Record Your Attempt'}
          {currentStep === 'review' && 'Review Your Shot'}
          {currentStep === 'outcome' && 'Report Your Result'}
        </CardTitle>
        
        {timeRemaining > 0 && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Timer className="w-4 h-4" />
            <span>Time remaining: {formatTime(timeRemaining)}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Instructions Step */}
        {currentStep === 'instructions' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Shot Recording Guidelines</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-muted/20 rounded-lg">
                  <Video className="w-6 h-6 text-primary mx-auto mb-2" />
                  <h4 className="font-medium mb-2">Before You Shoot</h4>
                  <ul className="text-left text-muted-foreground space-y-1">
                    <li>• Position camera to show tee and hole</li>
                    <li>• Ensure good lighting</li>
                    <li>• Start recording before you hit</li>
                  </ul>
                </div>
                <div className="p-4 bg-muted/20 rounded-lg">
                  <Camera className="w-6 h-6 text-primary mx-auto mb-2" />
                  <h4 className="font-medium mb-2">During Recording</h4>
                  <ul className="text-left text-muted-foreground space-y-1">
                    <li>• Keep camera steady</li>
                    <li>• Capture the full ball flight</li>
                    <li>• Record for 10-30 seconds</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 dark:text-amber-200">Important</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Video evidence helps verify your shot but is optional. You can still report your outcome without recording.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleStartSetup}
                size="lg"
                className="w-full h-14 text-lg rounded-xl"
                disabled={!isSupported}
              >
                <Video className="w-5 h-5 mr-2" />
                Start Recording Setup
              </Button>
              
              <Button
                onClick={() => setCurrentStep('outcome')}
                variant="outline"
                size="lg"
                className="w-full h-14 text-lg rounded-xl"
              >
                Skip Recording - Report Outcome Only
              </Button>
            </div>
          </div>
        )}

        {/* Setup Step */}
        {currentStep === 'setup' && (
          <div className="space-y-6">
            <div className="text-center">
              {hasPermission === null && (
                <div className="p-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Requesting camera access...</p>
                </div>
              )}
              
              {hasPermission === false && (
                <div className="p-6">
                  <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Camera Access Required</h3>
                  <p className="text-muted-foreground mb-4">
                    Please allow camera access to record your shot
                  </p>
                  <Button onClick={requestPermission}>
                    <Camera className="w-4 h-4 mr-2" />
                    Request Camera Access
                  </Button>
                </div>
              )}
              
              {hasPermission === true && (
                <div className="space-y-4">
                  <div className="w-full max-w-md mx-auto">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full rounded-lg border"
                    />
                  </div>
                  
                  <div className="flex gap-3 justify-center">
                    <Button onClick={switchCamera} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Switch Camera
                    </Button>
                    
                    <Button onClick={() => setCurrentStep('recording')}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recording Step */}
        {currentStep === 'recording' && (
          <div className="space-y-6">
            <div className="w-full max-w-md mx-auto">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full rounded-lg border"
              />
              
              {isRecording && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Recording...</span>
                  </div>
                  <Progress value={recordingProgress} className="w-full" />
                  <p className="text-xs text-center text-muted-foreground">
                    {Math.round(recordingProgress / (100/30))}s / 30s
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-center">
              {!isRecording ? (
                <>
                  <Button onClick={switchCamera} variant="outline" size="lg">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Switch Camera
                  </Button>
                  <Button onClick={handleStartRecording} size="lg" className="bg-red-600 hover:bg-red-700">
                    <Play className="w-4 h-4 mr-2" />
                    Start Recording
                  </Button>
                </>
              ) : (
                <Button onClick={handleStopRecording} size="lg" variant="destructive">
                  <Square className="w-4 h-4 mr-2" />
                  Stop Recording
                </Button>
              )}
            </div>
            
            <Button
              onClick={() => setCurrentStep('outcome')}
              variant="outline"
              className="w-full"
            >
              Skip Recording - Report Outcome Only
            </Button>
          </div>
        )}

        {/* Review Step */}
        {currentStep === 'review' && videoUrl && (
          <div className="space-y-6">
            <div className="w-full max-w-md mx-auto">
              <video
                src={videoUrl}
                controls
                className="w-full rounded-lg border"
              />
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={handleRetakeVideo} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake
              </Button>
              <Button onClick={() => setCurrentStep('outcome')}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Use This Video
              </Button>
            </div>
          </div>
        )}

        {/* Outcome Step */}
        {currentStep === 'outcome' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">How was your shot?</h3>
              {recordedVideo && (
                <Badge variant="outline" className="mb-4">
                  <Video className="w-3 h-3 mr-1" />
                  Video evidence recorded
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Button
                onClick={() => handleReportOutcome('win')}
                disabled={uploading}
                size="lg"
                className="h-16 text-lg bg-green-600 hover:bg-green-700"
              >
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uploading...
                  </div>
                ) : (
                  <>
                    <Trophy className="w-6 h-6 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold">Hole in 1! 🎉</div>
                      <div className="text-sm opacity-90">I got it in the hole</div>
                    </div>
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => handleReportOutcome('miss')}
                disabled={uploading}
                variant="outline"
                size="lg"
                className="h-16 text-lg"
              >
                <Target className="w-6 h-6 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">I Missed</div>
                  <div className="text-sm opacity-70">Better luck next time</div>
                </div>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};