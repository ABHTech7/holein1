import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getFormGreeting } from "@/lib/copyEngine";
import { getAvailablePaymentProviders, createPaymentIntent, confirmPayment, updateEntryPaymentInfo } from "@/lib/paymentService";
import { Loader2, CreditCard, Shield, Zap } from "lucide-react";
import type { Gender } from '@/lib/copyEngine';

interface PlayerJourneyEntryFormProps {
  competition: {
    id: string;
    name: string;
    entry_fee: number;
    prize_pool: number;
    club_name: string;
  };
  onSuccess: (entryId: string, playerData: PlayerFormData) => void;
}

interface PlayerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: number;
  gender: Gender;
  handicap: number;
}

const PlayerJourneyEntryForm: React.FC<PlayerJourneyEntryFormProps> = ({
  competition,
  onSuccess
}) => {
  const { user, signUp } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<PlayerFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    age: 18,
    gender: 'prefer_not_to_say',
    handicap: 28,
  });
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'form' | 'payment' | 'processing'>('form');
  const [entryId, setEntryId] = useState<string | null>(null);
  
  // Auto-populate from existing profile if user is logged in
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        setIsLoading(true);
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (profile) {
            setFormData(prev => ({
              ...prev,
              firstName: profile.first_name || '',
              lastName: profile.last_name || '',
              email: profile.email || '',
              phone: profile.phone || '',
              age: profile.age_years || 18,
              gender: (profile.gender as Gender) || 'prefer_not_to_say',
              handicap: profile.handicap || 28,
            }));
          }
        } catch (error) {
          console.error('Error loading profile:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadUserProfile();
  }, [user]);

  const handleInputChange = (field: keyof PlayerFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      toast({ title: "First name required", variant: "destructive" });
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast({ title: "Valid email required", variant: "destructive" });
      return false;
    }
    if (!formData.phone.trim()) {
      toast({ title: "Phone number required", variant: "destructive" });
      return false;
    }
    if (formData.age < 16 || formData.age > 120) {
      toast({ title: "Age must be between 16 and 120", variant: "destructive" });
      return false;
    }
    if (formData.handicap < -10 || formData.handicap > 54) {
      toast({ title: "Handicap must be between -10 and 54", variant: "destructive" });
      return false;
    }
    if (!termsAccepted) {
      toast({ title: "Please accept terms and conditions", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      let userId = user?.id;
      
      // Auto-register user if not logged in
      if (!userId) {
        console.log('Creating new user account...');
        const authResult = await signUp(formData.email, 'temp-password-123!');
        
        if (authResult.error) {
          toast({ 
            title: "Registration failed", 
            description: authResult.error.message,
            variant: "destructive" 
          });
          return;
        }
        
        // For new registrations, we'll use the current user after signup
        // The auth system should automatically set the user state
        if (user?.id) {
          userId = user.id;
        } else {
          toast({ title: "User creation failed", variant: "destructive" });
          return;
        }
      }

      // Create entry record
      const { data: entry, error: entryError } = await supabase
        .from('entries')
        .insert({
          player_id: userId,
          competition_id: competition.id,
          amount_minor: competition.entry_fee * 100,
          terms_accepted_at: new Date().toISOString(),
          terms_version: '2.0',
          status: 'pending',
        })
        .select()
        .single();

      if (entryError || !entry) {
        console.error('Entry creation failed:', entryError);
        toast({ title: "Entry creation failed", variant: "destructive" });
        return;
      }

      setEntryId(entry.id);
      
      // Update user profile
      await supabase.from('profiles').upsert({
        id: userId,
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        age_years: formData.age,
        gender: formData.gender,
        handicap: formData.handicap,
      });

      // Move to payment step
      setPaymentStep('payment');
      
    } catch (error) {
      console.error('Form submission error:', error);
      toast({ title: "Submission failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!entryId) return;
    
    setPaymentStep('processing');
    
    try {
      const providers = getAvailablePaymentProviders();
      const provider = providers[0]; // Use first available provider
      
      if (!provider) {
        toast({ title: "No payment method available", variant: "destructive" });
        return;
      }

      // Create payment intent
      const paymentIntent = await createPaymentIntent(
        provider,
        competition.entry_fee * 100, // Convert to pence
        entryId,
        competition.id
      );

      // For demo, simulate payment confirmation
      const paymentResult = await confirmPayment(provider, paymentIntent);
      
      if (paymentResult.success) {
        // Update entry with payment info
        await updateEntryPaymentInfo(
          entryId,
          provider.id,
          paymentIntent.id,
          competition.entry_fee * 100
        );

        toast({ 
          title: "Payment successful!", 
          description: "Your entry is confirmed!"
        });

        onSuccess(entryId, formData);
      } else {
        toast({ 
          title: "Payment failed", 
          description: paymentResult.error,
          variant: "destructive" 
        });
        setPaymentStep('payment');
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      toast({ title: "Payment processing failed", variant: "destructive" });
      setPaymentStep('payment');
    }
  };

  const greeting = getFormGreeting({
    firstName: formData.firstName,
    gender: formData.gender,
    competitionName: competition.name
  });

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading your profile...</span>
        </CardContent>
      </Card>
    );
  }

  if (paymentStep === 'processing') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Processing Payment...</h3>
          <p className="text-muted-foreground text-center">
            Please wait while we process your payment securely.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (paymentStep === 'payment') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Complete Your Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">{competition.name}</h3>
            <div className="flex justify-between text-sm">
              <span>Entry Fee:</span>
              <span className="font-medium">£{(competition.entry_fee / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Prize Pool:</span>
              <span className="font-medium text-primary">£{(competition.prize_pool / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Secure payment powered by Stripe</span>
          </div>

          <Button 
            onClick={handlePayment}
            className="w-full h-12 text-lg"
            size="lg"
          >
            <Zap className="h-5 w-5 mr-2" />
            Pay £{(competition.entry_fee / 100).toFixed(2)} & Enter
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{greeting}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter your first name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter your mobile number"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                min="16"
                max="120"
                value={formData.age}
                onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 18)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select 
                value={formData.gender} 
                onValueChange={(value: Gender) => handleInputChange('gender', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="handicap">Handicap *</Label>
              <Input
                id="handicap"
                type="number"
                min="-10"
                max="54"
                value={formData.handicap}
                onChange={(e) => handleInputChange('handicap', parseFloat(e.target.value) || 28)}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(!!checked)}
            />
            <Label htmlFor="terms" className="text-sm">
              I accept the terms and conditions and privacy policy *
            </Label>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-lg"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Creating Entry...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 mr-2" />
                Continue to Payment
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PlayerJourneyEntryForm;