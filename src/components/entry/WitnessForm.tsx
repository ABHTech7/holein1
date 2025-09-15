import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Mail, 
  Phone, 
  MessageSquare,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface WitnessData {
  name: string;
  email: string;
  phone: string;
  notes?: string;
}

interface WitnessFormProps {
  onWitnessSubmit: (witnessData: WitnessData) => void;
  onNext: () => void;
  onBack: () => void;
}

const WitnessForm: React.FC<WitnessFormProps> = ({
  onWitnessSubmit,
  onNext,
  onBack
}) => {
  const { toast } = useToast();
  
  const [witnessData, setWitnessData] = useState<WitnessData>({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  
  const [errors, setErrors] = useState<Partial<WitnessData>>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Basic phone validation - at least 10 digits
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<WitnessData> = {};

    if (!witnessData.name.trim()) {
      newErrors.name = 'Witness name is required';
    } else if (witnessData.name.trim().length < 2) {
      newErrors.name = 'Please enter a valid name';
    }

    if (!witnessData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!validateEmail(witnessData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!witnessData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(witnessData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof WitnessData, value: string) => {
    setWitnessData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onWitnessSubmit(witnessData);
      onNext();
    } else {
      toast({
        title: "Please fix the errors",
        description: "Check the required fields and try again.",
        variant: "destructive"
      });
    }
  };

  const isFormValid = witnessData.name.trim() && 
                     witnessData.email.trim() && 
                     witnessData.phone.trim() && 
                     Object.keys(errors).length === 0;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          Witness Verification
        </h2>
        <p className="text-muted-foreground mb-4">
          Every ace needs a witness — add yours here
        </p>
        <Badge variant="outline" className="text-xs">
          <Users className="w-3 h-3 mr-1" />
          Required for verification
        </Badge>
      </div>

      {/* Witness Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Witness Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="witness-name" className="text-sm font-semibold">
              Full Name *
            </Label>
            <Input
              id="witness-name"
              value={witnessData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter witness full name"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="witness-email" className="text-sm font-semibold">
              Email Address *
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="witness-email"
                type="email"
                value={witnessData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="witness@example.com"
                className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.email}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              We'll send a verification email to confirm their witness statement
            </p>
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="witness-phone" className="text-sm font-semibold">
              Phone Number *
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="witness-phone"
                type="tel"
                value={witnessData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+44 7XXX XXXXXX"
                className={`pl-10 ${errors.phone ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.phone && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="witness-notes" className="text-sm font-semibold">
              Additional Notes
              <span className="text-muted-foreground font-normal ml-1">(Optional)</span>
            </Label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Textarea
                id="witness-notes"
                value={witnessData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional details about the witness or the shot..."
                className="pl-10 min-h-[80px] resize-none"
                maxLength={500}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>e.g., relationship to you, how they saw the shot</span>
              <span>{witnessData.notes?.length || 0}/500</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Information */}
      <Card className="bg-secondary/5 border-secondary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-semibold text-foreground mb-1">
                Witness Verification Process
              </div>
              <div className="text-muted-foreground">
                Your witness will receive an email asking them to confirm they saw your hole-in-one. 
                This helps us verify legitimate claims and maintain the integrity of the competition.
              </div>
            </div>
          </div>
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
          onClick={handleSubmit}
          disabled={!isFormValid}
          className="flex-1"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default WitnessForm;