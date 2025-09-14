import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, User, Phone, Calendar, Target, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ImprovedAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (userId: string) => void;
  redirectUrl?: string;
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ageYears: string;
  handicap: string;
}

export const ImprovedAuthModal = ({ 
  open, 
  onOpenChange, 
  onSuccess,
  redirectUrl 
}: ImprovedAuthModalProps) => {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    ageYears: '',
    handicap: ''
  });

  const [errors, setErrors] = useState<Partial<ProfileFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<ProfileFormData> = {};

    if (!profileForm.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!profileForm.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!profileForm.email || !profileForm.email.includes('@')) {
      newErrors.email = "Valid email is required";
    }

    if (!profileForm.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }

    const age = parseInt(profileForm.ageYears);
    if (!profileForm.ageYears || age < 13 || age > 100) {
      newErrors.ageYears = "Age must be between 13 and 100";
    }

    const handicap = parseFloat(profileForm.handicap);
    if (!profileForm.handicap || handicap <= 0 || handicap > 54) {
      newErrors.handicap = "Handicap must be between 0.1 and 54";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendMagicLink = async (isResend = false) => {
    if (!validateForm()) {
      toast({
        title: "Please fix the errors",
        description: "Check the form for validation errors",
        variant: "destructive"
      });
      return;
    }

    if (isResend) {
      setResendLoading(true);
    } else {
      setLoading(true);
    }

    try {
      // Call our custom secure entry link edge function
      const { data, error } = await supabase.functions.invoke('send-magic-link', {
        body: {
          email: profileForm.email,
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          phone: profileForm.phone,
          ageYears: parseInt(profileForm.ageYears),
          handicap: parseFloat(profileForm.handicap),
          competitionUrl: `${window.location.origin}${redirectUrl || '/'}`.replace(/\/$/, '')
        }
      });

      if (error) throw error;

      if (data?.success) {
        setEmailSent(true);
        toast({
          title: isResend ? "Link resent!" : "Check your email",
          description: "We've sent you a secure entry link. Open it on this device to continue.",
        });
      } else {
        throw new Error(data?.error || "Failed to send secure link");
      }
    } catch (error: any) {
      console.error('Secure link error:', error);
      toast({
        title: isResend ? "Failed to resend link" : "Failed to send secure link", 
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      if (isResend) {
        setResendLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  const updateForm = (field: keyof ProfileFormData, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (emailSent) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-['Montserrat']">
              Check Your Email
            </DialogTitle>
            <DialogDescription>
              We've sent a secure entry link to <strong>{profileForm.email}</strong>. Open it on this device to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Click the link in your email to complete your entry
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      The link expires in 15 minutes for security
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Didn't get it? Check spam or try again.
              </p>
              
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => handleSendMagicLink(true)}
                  disabled={resendLoading}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {resendLoading ? "Resending..." : "Resend Link"}
                </Button>
                
                <Button
                  variant="link"
                  onClick={() => {
                    setEmailSent(false);
                    setLoading(false);
                    setResendLoading(false);
                  }}
                  className="text-sm"
                >
                  Use a different email address
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-2xl font-['Montserrat']">
            Enter Competition
          </DialogTitle>
          <DialogDescription>
            Quick signup to secure your spot in the competition
          </DialogDescription>
        </DialogHeader>

        {/* Eligibility Warning */}
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Eligibility Requirements
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Must be 13+ with golf handicap above 0. We'll send you a secure link to verify and complete your entry.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                First name *
              </Label>
              <Input
                id="firstName"
                placeholder="John"
                value={profileForm.firstName}
                onChange={(e) => updateForm('firstName', e.target.value)}
                className={errors.firstName ? "border-destructive" : ""}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name *</Label>
              <Input
                id="lastName"
                placeholder="Smith"
                value={profileForm.lastName}
                onChange={(e) => updateForm('lastName', e.target.value)}
                className={errors.lastName ? "border-destructive" : ""}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={profileForm.email}
              onChange={(e) => updateForm('email', e.target.value)}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone number *
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+44 7700 900000"
              value={profileForm.phone}
              onChange={(e) => updateForm('phone', e.target.value)}
              className={errors.phone ? "border-destructive" : ""}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </div>

          {/* Age and Handicap */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ageYears" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Age *
              </Label>
              <Input
                id="ageYears"
                type="number"
                placeholder="25"
                min="13"
                max="100"
                value={profileForm.ageYears}
                onChange={(e) => updateForm('ageYears', e.target.value)}
                className={errors.ageYears ? "border-destructive" : ""}
              />
              {errors.ageYears && (
                <p className="text-sm text-destructive">{errors.ageYears}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="handicap" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Golf handicap *
              </Label>
              <Input
                id="handicap"
                type="number"
                step="0.1"
                placeholder="18.5"
                min="0.1"
                max="54"
                value={profileForm.handicap}
                onChange={(e) => updateForm('handicap', e.target.value)}
                className={errors.handicap ? "border-destructive" : ""}
              />
              {errors.handicap && (
                <p className="text-sm text-destructive">{errors.handicap}</p>
              )}
            </div>
          </div>

          <Button
            onClick={() => handleSendMagicLink()}
            disabled={loading}
            className="w-full h-12 text-base font-medium rounded-xl"
            aria-label="Enter Competition"
          >
            <Mail className="w-5 h-5 mr-3" />
            {loading ? "Entering Competition..." : "Enter Competition"}
          </Button>

          <p className="text-xs text-center text-muted-foreground px-4">
            By continuing, you agree to our Terms of Service and Privacy Policy.
            We'll send you a secure link to verify and complete your entry.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};