import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCamera } from "@/hooks/useCamera";
import { uploadFile } from "@/lib/fileUploadService";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Camera, 
  Upload, 
  RefreshCw, 
  Check, 
  X,
  Loader2,
  AlertCircle
} from "lucide-react";
import { cn } from '@/lib/utils';

interface SelfieCaptureProps {
  onPhotoCapture: (file: File) => void;
  onNext: () => void;
  onBack: () => void;
}

const SelfieCapture: React.FC<SelfieCaptureProps> = ({
  onPhotoCapture,
  onNext,
  onBack
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const {
    videoRef,
    isRecording,
    hasPermission,
    isSupported,
    requestPermission,
    switchCamera,
    cleanup
  } = useCamera({ quality: 'medium' });

  // Cleanup camera on unmount or when navigating away
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const handleStartCamera = async () => {
    setCameraError(null);
    const success = await requestPermission();
    if (!success) {
      setCameraError("Unable to access camera. Please check permissions.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      toast({
        title: "Camera error",
        description: "Unable to capture photo. Please try again.",
        variant: "destructive"
      });
      return;
    }

    // Set canvas size to match video
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    // Draw the video frame to canvas
    context.drawImage(videoRef.current, 0, 0);
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
        onPhotoCapture(file);
        setCapturedPhoto(canvas.toDataURL('image/jpeg'));
        cleanup(); // Stop camera after capture
      }
    }, 'image/jpeg', 0.9);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    onPhotoCapture(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedPhoto(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    handleStartCamera();
  };

  const handleNext = () => {
    if (capturedPhoto) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          Take Your Selfie
        </h2>
        <p className="text-muted-foreground">
          We need a clear photo of your face to verify your identity
        </p>
      </div>

      {/* Camera/Photo Section */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {capturedPhoto ? (
            /* Photo Preview */
            <div className="relative">
              <img
                src={capturedPhoto}
                alt="Captured selfie"
                className="w-full h-80 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                <Button
                  onClick={retakePhoto}
                  variant="secondary"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retake
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1"
                  disabled={isUploading}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Use Photo
                </Button>
              </div>
            </div>
          ) : hasPermission && isSupported ? (
            /* Camera View */
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                webkit-playsinline="true"
                className="w-full h-80 object-cover bg-muted"
              />
              
              {/* Camera Controls Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-4">
                <Button
                  onClick={switchCamera}
                  variant="secondary"
                  size="lg"
                  className="rounded-full w-12 h-12 p-0"
                >
                  <RefreshCw className="w-5 h-5" />
                </Button>
                
                <Button
                  onClick={capturePhoto}
                  size="lg"
                  className="rounded-full w-16 h-16 p-0 bg-white text-primary hover:bg-white/90"
                >
                  <Camera className="w-6 h-6" />
                </Button>
              </div>
            </div>
          ) : (
            /* Camera Setup/Error */
            <div className="h-80 flex flex-col items-center justify-center p-8 bg-muted/30">
              {cameraError ? (
                <>
                  <AlertCircle className="w-12 h-12 text-warning mb-4" />
                  <p className="text-center text-muted-foreground mb-4">{cameraError}</p>
                  <Button onClick={handleStartCamera}>
                    Try Again
                  </Button>
                </>
              ) : !isSupported ? (
                <>
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-center text-muted-foreground mb-4">
                    Camera not supported on this device
                  </p>
                </>
              ) : (
                <>
                  <Camera className="w-12 h-12 text-primary mb-4" />
                  <p className="text-center text-muted-foreground mb-4">
                    Allow camera access to take your selfie
                  </p>
                  <Button onClick={handleStartCamera}>
                    Enable Camera
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alternative Upload Option */}
      {!capturedPhoto && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Can't use the camera? Upload a photo instead
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload from Gallery
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-4 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!capturedPhoto}
          className="flex-1"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default SelfieCapture;