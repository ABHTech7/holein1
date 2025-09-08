import { useState, useRef, useCallback } from 'react';
import { toast } from './use-toast';

interface CameraOptions {
  maxDuration?: number; // in seconds
  quality?: 'low' | 'medium' | 'high';
}

export const useCamera = (options: CameraOptions = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { maxDuration = 30, quality = 'medium' } = options;

  const getConstraints = () => {
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: 'environment', // Use back camera by default
        width: quality === 'high' ? 1920 : quality === 'medium' ? 1280 : 640,
        height: quality === 'high' ? 1080 : quality === 'medium' ? 720 : 480,
      },
      audio: true,
    };
    return constraints;
  };

  const requestPermission = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsSupported(false);
      toast({
        title: "Camera not supported",
        description: "Your device doesn't support camera access",
        variant: "destructive"
      });
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(getConstraints());
      setHasPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      streamRef.current = stream;
      return true;
    } catch (error: any) {
      console.error('Camera permission error:', error);
      setHasPermission(false);
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Camera permission denied",
          description: "Please allow camera access to record your shot",
          variant: "destructive"
        });
      } else if (error.name === 'NotFoundError') {
        toast({
          title: "No camera found",
          description: "No camera device was detected",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Camera access failed",
          description: "Unable to access camera: " + error.message,
          variant: "destructive"
        });
      }
      return false;
    }
  }, [quality]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!streamRef.current) {
      const hasAccess = await requestPermission();
      if (!hasAccess) return false;
    }

    if (!streamRef.current) return false;

    try {
      const options = {
        mimeType: MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 
                   MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : undefined
      };

      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Auto-stop after maxDuration
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, maxDuration * 1000);

      return true;
    } catch (error: any) {
      console.error('Recording start error:', error);
      toast({
        title: "Recording failed",
        description: "Unable to start recording: " + error.message,
        variant: "destructive"
      });
      return false;
    }
  }, [maxDuration, requestPermission]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: chunksRef.current[0]?.type || 'video/mp4' 
        });
        setIsRecording(false);
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsRecording(false);
    setHasPermission(null);
  }, []);

  const switchCamera = useCallback(async () => {
    if (!streamRef.current) return;

    cleanup();

    const currentConstraints = getConstraints();
    const currentFacing = currentConstraints.video && typeof currentConstraints.video === 'object' 
      ? currentConstraints.video.facingMode : 'environment';
    
    const newFacing = currentFacing === 'environment' ? 'user' : 'environment';
    
    const newConstraints: MediaStreamConstraints = {
      ...currentConstraints,
      video: {
        ...currentConstraints.video as MediaTrackConstraints,
        facingMode: newFacing,
      }
    };

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(newConstraints);
      streamRef.current = newStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error('Camera switch error:', error);
      // Fallback to original camera
      await requestPermission();
    }
  }, [cleanup, requestPermission]);

  return {
    videoRef,
    isRecording,
    hasPermission,
    isSupported,
    requestPermission,
    startRecording,
    stopRecording,
    cleanup,
    switchCamera,
  };
};