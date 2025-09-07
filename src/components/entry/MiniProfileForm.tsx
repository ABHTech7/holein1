import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, User, Phone, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatToE164, validatePhone } from "@/lib/phoneUtils";

interface MiniProfileFormProps {
  userId: string;
  userEmail: string;
  onComplete: () => void;
  onSkip?: () => void;
}

interface ProfileData {
  age_years: number | null;
  handicap: number | null;
  phone_e164: string | null;
}

export const MiniProfileForm = ({ 
  userId, 
  userEmail, 
  onComplete, 
  onSkip 
}: MiniProfileFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    age: '',
    handicap: '',
    phone: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateAge = (age: string) => {
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 16 || ageNum > 100) {
      return "Age must be between 16 and 100";
    }
    return '';
  };

  const validateHandicap = (handicap: string) => {
    const handicapNum = parseFloat(handicap);
    if (isNaN(handicapNum) || handicapNum < 1) {
      return "Handicap must be 1 or higher (amateurs only)";
    }
    return '';
  };

  const validatePhoneNumber = (phone: string) => {
    const validation = validatePhone(phone);
    return validation.error || '';
  };

  const formatPhoneToE164 = (phone: string): string => {
    try {
      return formatToE164(phone);
    } catch (error) {
      throw new Error('Invalid phone number format');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    const ageError = validateAge(formData.age);
    if (ageError) newErrors.age = ageError;
    
    const handicapError = validateHandicap(formData.handicap);
    if (handicapError) newErrors.handicap = handicapError;
    
    const phoneError = validatePhoneNumber(formData.phone);
    if (phoneError) newErrors.phone = phoneError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const phoneE164 = formatPhoneToE164(formData.phone);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          age_years: parseInt(formData.age),
          handicap: parseFloat(formData.handicap),
          phone_e164: phoneE164
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been completed successfully"
      });
      
      onComplete();
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-['Montserrat'] text-center">
          Complete Your Profile
        </CardTitle>
        <p className="text-sm text-muted-foreground text-center">
          Just a few quick details before you enter
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Email Display */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Email
          </Label>
          <Input 
            value={userEmail} 
            disabled 
            className="bg-muted/50"
          />
        </div>

        {/* Age Input */}
        <div className="space-y-2">
          <Label htmlFor="age" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Age (years) *
          </Label>
          <Input
            id="age"
            type="number"
            min="16"
            max="100"
            placeholder="25"
            value={formData.age}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, age: e.target.value }));
              if (errors.age && e.target.value) {
                const error = validateAge(e.target.value);
                setErrors(prev => ({ ...prev, age: error }));
              }
            }}
            className={errors.age ? "border-destructive" : ""}
          />
          {errors.age && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.age}
            </p>
          )}
        </div>

        {/* Handicap Input */}
        <div className="space-y-2">
          <Label htmlFor="handicap" className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 12h8"/>
              <path d="M12 8v8"/>
            </svg>
            Golf Handicap *
          </Label>
          <Input
            id="handicap"
            type="number"
            step="0.1"
            min="1"
            placeholder="18.5"
            value={formData.handicap}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, handicap: e.target.value }));
              if (errors.handicap && e.target.value) {
                const error = validateHandicap(e.target.value);
                setErrors(prev => ({ ...prev, handicap: error }));
              }
            }}
            className={errors.handicap ? "border-destructive" : ""}
          />
          {errors.handicap && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.handicap}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Must be 1+ for amateur eligibility
          </p>
        </div>

        {/* Phone Input */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Mobile Number *
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="07700 900000"
            value={formData.phone}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, phone: e.target.value }));
              if (errors.phone && e.target.value) {
                const error = validatePhoneNumber(e.target.value);
                setErrors(prev => ({ ...prev, phone: error }));
              }
            }}
            className={errors.phone ? "border-destructive" : ""}
          />
          {errors.phone && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.phone}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            UK format preferred (e.g., 07700 900000)
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 rounded-xl font-medium"
          >
            {loading ? "Saving..." : "Continue to Payment"}
          </Button>
          
          {onSkip && (
            <Button
              variant="ghost"
              onClick={onSkip}
              className="w-full"
            >
              Skip for now
            </Button>
          )}
        </div>
        
        <p className="text-xs text-center text-muted-foreground">
          * Required for competition eligibility
        </p>
      </CardContent>
    </Card>
  );
};