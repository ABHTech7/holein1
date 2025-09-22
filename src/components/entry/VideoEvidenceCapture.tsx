import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface VideoEvidenceCaptureProps {
  onVideoCapture: (file: File) => void;
  onRemove?: () => void;
  capturedVideo?: File | null;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function VideoEvidenceCapture({
  onVideoCapture,
  onRemove,
  capturedVideo,
  isUploading = false,
  uploadProgress = 0
}: VideoEvidenceCaptureProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Video must be under 20MB.",
        variant: "destructive"
      });
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onVideoCapture(file);
  };

  const handleRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    setIsPlaying(false);
    onRemove?.();
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          📹 Shot Video (Optional)
        </h3>
        <p className="text-sm text-muted-foreground">
          Got your shot on video? Upload it to strengthen your claim!
        </p>
      </div>

      {!capturedVideo ? (
        <Card className="p-6 border-2 border-dashed border-border hover:border-primary/50 transition-colors">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            
            <div>
              <h4 className="font-medium text-foreground mb-2">Upload Your Shot Video</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Show off that legendary swing! (Max 20MB)
              </p>
              
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Video File
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">Video Preview</h4>
              <Button
                onClick={handleRemove}
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>

            {previewUrl && (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={previewUrl}
                  className="w-full max-h-64 rounded-lg bg-black"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                />
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    onClick={togglePlayback}
                    variant="secondary"
                    size="lg"
                    className="opacity-80 hover:opacity-100"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Uploading video...</span>
                  <span className="text-muted-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}