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

      {/* Simplified Photo Capture */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          {capturedPhoto ? (
            /* Photo Preview */
            <div className="space-y-4">
              <img
                src={capturedPhoto}
                alt="Captured selfie"
                className="w-full h-64 object-cover rounded-lg"
              />
              <div className="flex gap-2">
                <Button
                  onClick={retakePhoto}
                  variant="outline"
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
          ) : (
            /* Photo Upload Options */
            <div className="space-y-4">
              {/* Primary: Upload from Gallery (works everywhere) */}
              <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Upload a Photo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a clear selfie from your device
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  size="lg"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Secondary: Camera option (if supported) */}
              {isSupported && !cameraError && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or use camera</span>
                  </div>
                </div>
              )}

              {hasPermission && isSupported ? (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-48 object-cover rounded-lg bg-muted"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={switchCamera}
                      variant="outline"
                      className="flex-1"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Switch
                    </Button>
                    <Button
                      onClick={capturePhoto}
                      className="flex-1"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                    </Button>
                  </div>
                </div>
              ) : isSupported && !hasPermission && !cameraError && (
                <Button
                  onClick={handleStartCamera}
                  variant="outline"
                  className="w-full"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Enable Camera
                </Button>
              )}

              {cameraError && (
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <AlertCircle className="w-8 h-8 text-warning mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{cameraError}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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