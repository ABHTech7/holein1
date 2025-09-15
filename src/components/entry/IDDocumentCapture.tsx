import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Camera, 
  CreditCard, 
  Check, 
  X,
  FileText,
  AlertCircle,
  Loader2
} from "lucide-react";
import { cn } from '@/lib/utils';

interface IDDocumentCaptureProps {
  onDocumentCapture: (file: File) => void;
  onNext: () => void;
  onBack: () => void;
}

const IDDocumentCapture: React.FC<IDDocumentCaptureProps> = ({
  onDocumentCapture,
  onNext,
  onBack
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [capturedDocument, setCapturedDocument] = useState<{
    file: File;
    preview: string;
    type: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!acceptedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select an image (JPG, PNG, WEBP) or PDF file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    onDocumentCapture(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedDocument({
          file,
          preview: e.target?.result as string,
          type: 'image'
        });
      };
      reader.readAsDataURL(file);
    } else {
      // For PDFs, show file info
      setCapturedDocument({
        file,
        preview: '',
        type: 'pdf'
      });
    }
  };

  const removeDocument = () => {
    setCapturedDocument(null);
  };

  const handleNext = () => {
    if (capturedDocument) {
      onNext();
    }
  };

  const acceptedDocuments = [
    { name: "Driving License", icon: CreditCard },
    { name: "Passport", icon: FileText },
    { name: "National ID Card", icon: CreditCard },
    { name: "Government ID", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          Upload ID Document
        </h2>
        <p className="text-muted-foreground mb-4">
          We need to verify your identity with an official document
        </p>
        
        {/* Accepted Documents */}
        <div className="flex flex-wrap justify-center gap-2">
          {acceptedDocuments.map((doc) => (
            <Badge key={doc.name} variant="outline" className="text-xs">
              <doc.icon className="w-3 h-3 mr-1" />
              {doc.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Document Upload/Preview Section */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {capturedDocument ? (
            /* Document Preview */
            <div className="relative">
              {capturedDocument.type === 'image' ? (
                <img
                  src={capturedDocument.preview}
                  alt="ID Document"
                  className="w-full h-80 object-contain bg-muted"
                />
              ) : (
                <div className="h-80 flex flex-col items-center justify-center bg-muted/30">
                  <FileText className="w-16 h-16 text-primary mb-4" />
                  <div className="text-center">
                    <p className="font-semibold text-foreground">
                      {capturedDocument.file.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PDF • {(capturedDocument.file.size / (1024 * 1024)).toFixed(1)}MB
                    </p>
                  </div>
                </div>
              )}
              
              {/* Document Controls Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                <Button
                  onClick={removeDocument}
                  variant="secondary"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1"
                  disabled={isUploading}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Use Document
                </Button>
              </div>
            </div>
          ) : (
            /* Upload Interface */
            <div className="h-80 flex flex-col items-center justify-center p-8">
              <div 
                className="border-2 border-dashed border-border rounded-lg p-8 w-full text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
                <p className="text-lg font-semibold text-foreground mb-2">
                  Upload ID Document
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Tap to select from your device
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports: JPG, PNG, WEBP, PDF (max 10MB)
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Important Security Note */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-semibold text-foreground mb-1">
                Your Privacy is Important
              </div>
              <div className="text-muted-foreground">
                Your ID will only be used for verification purposes and will be securely stored. 
                We will never share your personal information with third parties.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={handleFileUpload}
        className="hidden"
      />

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
          disabled={!capturedDocument}
          className="flex-1"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default IDDocumentCapture;