import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HandicapProofCaptureProps {
  onDocumentCapture: (file: File) => void;
  onNext: () => void;
  onBack: () => void;
  capturedDocument?: File;
  onRemove?: () => void;
}

const HandicapProofCapture: React.FC<HandicapProofCaptureProps> = ({
  onDocumentCapture,
  onNext,
  onBack,
  capturedDocument,
  onRemove
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or PDF file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    // Create preview for images only
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }

    onDocumentCapture(file);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove?.();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <FileText className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Upload Handicap Proof</h2>
        <p className="text-muted-foreground">
          Please upload a photo or PDF of your Golf England handicap certificate
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {!capturedDocument ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-primary/30 rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Click to upload</p>
                <p className="text-sm text-muted-foreground">
                  JPG, PNG or PDF (max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative border rounded-lg overflow-hidden">
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt="Handicap proof preview" 
                      className="w-full h-auto"
                    />
                  ) : (
                    <div className="p-8 text-center bg-muted">
                      <FileText className="w-16 h-16 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">{capturedDocument.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(capturedDocument.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemove}
                    className="absolute top-2 right-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    Make sure all details on your handicap certificate are clearly visible
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
        >
          Back
        </Button>
        
        <Button
          onClick={onNext}
          disabled={!capturedDocument}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default HandicapProofCapture;
