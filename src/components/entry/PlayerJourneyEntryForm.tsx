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
import { getPaymentMode } from "@/lib/featureFlags";
import { Loader2, CreditCard, Shield, Zap, Badge, Flag, User, Mail, Phone, Target, Info } from "lucide-react";
import type { Gender } from '@/lib/copyEngine';

interface PlayerJourneyEntryFormProps {
  competition: {
    id: string;
    name: string;
    entry_fee: number;
    prize_pool: number;
    club_name: string;
    hole_number?: number;
  };
  onSuccess: (entryId: string, playerData: PlayerFormData) => void;
}

interface PlayerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: number | null;
  gender: Gender;
  handicap: number | null;
}

const PlayerJourneyEntryForm: React.FC<PlayerJourneyEntryFormProps> = ({
  competition,
  onSuccess
}) => {
  const { user, sendOtp } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<PlayerFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    age: null,
    gender: 'prefer_not_to_say',
    handicap: null,
  });

  const [ageError, setAgeError] = useState<string>('');
  
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
              age: profile.age_years || null,
              gender: (profile.gender as Gender) || 'prefer_not_to_say',
              handicap: profile.handicap || null,
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

  const handleInputChange = (field: keyof PlayerFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear age error when user starts typing
    if (field === 'age') {
      setAgeError('');
    }
  };

  const handleAgeBlur = () => {
    if (formData.age !== null && (formData.age < 13 || formData.age > 120)) {
      setAgeError('Age must be between 13 and 120');
    } else {
      setAgeError('');
    }
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
    if (formData.age !== null && (formData.age < 13 || formData.age > 120)) {
      toast({ title: "Age must be between 13 and 120", variant: "destructive" });
      return false;
    }
    if (formData.age === null) {
      toast({ title: "Age is required", variant: "destructive" });
      return false;
    }
    if (formData.handicap !== null && (formData.handicap < -10 || formData.handicap > 54)) {
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
      
      // Send OTP for authentication if not logged in
      if (!userId) {
        console.warn('[Auth] About to send OTP for', formData.email);
        
        // Store form data securely with 30-minute expiration
        try {
          const { SecureStorage } = await import('@/lib/secureStorage');
          SecureStorage.setAuthData('pending_entry_form', {
            ...formData,
            competitionId: competition.id,
            termsAccepted
          });
        } catch (error) {
          console.warn('Failed to use secure storage, falling back to localStorage');
          localStorage.setItem('pending_entry_form', JSON.stringify({
            ...formData,
            competitionId: competition.id,
            termsAccepted
          }));
        }
        
        const { error } = await sendOtp(formData.email);
        
        if (error) {
          toast({ 
            title: "Sign-in failed", 
            description: error,
            variant: "destructive" 
          });
          return;
        }
        
        toast({
          title: "Check your email",
          description: "We've sent you a secure entry link.",
        });
        
        return;
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

      // Check if payment providers are available
      const availableProviders = getAvailablePaymentProviders();
      const paymentMode = getPaymentMode();
      
      console.info('[Payments] Mode:', paymentMode);
      
      if (availableProviders.length === 0) {
        // No payment providers - skip payment and mark as active entry
        await supabase
          .from('entries')
          .update({
            payment_provider: null,
            paid: false,
            payment_date: null,
            status: 'active' // Mark as active (playable) but unpaid
          })
          .eq('id', entry.id);

        toast({ 
          title: "Entry recorded!", 
          description: "Your entry has been successfully recorded."
        });

        onSuccess(entry.id, formData);
        return;
      }

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
    
    const providers = getAvailablePaymentProviders();
    
    if (providers.length === 0) {
      // No payment providers available - complete entry without payment
      setPaymentStep('processing');
      
      try {
        await supabase
          .from('entries')
          .update({
            payment_provider: null,
            paid: false,
            payment_date: null,
            status: 'active'
          })
          .eq('id', entryId);

        toast({ 
          title: "Entry recorded!", 
          description: "Your entry has been successfully recorded."
        });

        onSuccess(entryId, formData);
      } catch (error) {
        console.error('Entry update error:', error);
        toast({ title: "Entry recording failed", variant: "destructive" });
        setPaymentStep('payment');
      }
      return;
    }
    
    setPaymentStep('processing');
    
    try {
      const provider = providers[0]; // Use first available provider

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
    const availableProviders = getAvailablePaymentProviders();
    const paymentMode = getPaymentMode();
    
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Complete Your Entry
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs font-medium text-muted-foreground">
              <Badge className="h-3 w-3" />
              {paymentMode}
            </div>
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

          {availableProviders.length > 0 ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Secure payment powered by {availableProviders[0].name}</span>
              </div>

              <Button 
                onClick={handlePayment}
                className="w-full h-12 text-lg"
                size="lg"
              >
                <Zap className="h-5 w-5 mr-2" />
                Pay £{(competition.entry_fee / 100).toFixed(2)} & Enter
              </Button>
            </>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <p className="text-amber-800 text-sm">
                  Online payment isn't enabled yet. Your entry is recorded.
                </p>
              </div>

              <Button 
                onClick={handlePayment}
                className="w-full h-12 text-lg"
                size="lg"
              >
                Complete Entry
              </Button>
              
              <p className="text-xs text-muted-foreground text-center mt-2">
                💳 Payment will be handled offline at the clubhouse.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const paymentMode = getPaymentMode();
  const availableProviders = getAvailablePaymentProviders();

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Golf Scorecard Container */}
      <div className="rounded-2xl shadow-lg bg-slate-50 border border-emerald-100 overflow-hidden">
        
        {/* Scorecard Header Strip */}
        <div className="bg-emerald-100 border-t-2 border-b-2 border-emerald-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flag className="h-5 w-5 text-emerald-700" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">{competition.name}</h2>
                <p className="text-sm text-slate-700">{competition.club_name} · Hole #{competition.hole_number || 1}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-white rounded-full text-sm font-semibold text-emerald-700 border border-emerald-200">
                £{(competition.entry_fee / 100).toFixed(2)}
              </div>
              <div className="px-3 py-1 bg-emerald-700 text-white rounded-full text-xs font-medium">
                {paymentMode}
              </div>
            </div>
          </div>
        </div>

        {/* Eligibility Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <strong>Eligibility Requirements</strong> — Must be 13+ and either have a handicap (1–54) or select 'I don't have one'. We'll send you a secure link to verify and complete your entry.
            </div>
          </div>
        </div>

        {/* Scorecard Form */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
          
          {/* Row 1: First & Last Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500/10">
              <Label htmlFor="firstName" className="text-xs uppercase font-medium text-slate-500 mb-1 block">
                <User className="h-3 w-3 inline mr-1" />
                First Name *
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter first name"
                className="border-0 p-0 text-base font-semibold text-slate-900 focus-visible:ring-0 bg-transparent"
                required
              />
            </div>
            
            <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500/10 md:border-l-0 md:border-l-2 md:border-l-emerald-100 md:border-dotted">
              <Label htmlFor="lastName" className="text-xs uppercase font-medium text-slate-500 mb-1 block">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
                className="border-0 p-0 text-base font-semibold text-slate-900 focus-visible:ring-0 bg-transparent"
              />
            </div>
          </div>

          {/* Row 2: Email */}
          <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500/10">
            <Label htmlFor="email" className="text-xs uppercase font-medium text-slate-500 mb-1 block">
              <Mail className="h-3 w-3 inline mr-1" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email"
              className="border-0 p-0 text-base font-semibold text-slate-900 focus-visible:ring-0 bg-transparent"
              required
            />
          </div>

          {/* Row 3: Phone */}
          <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500/10">
            <Label htmlFor="phone" className="text-xs uppercase font-medium text-slate-500 mb-1 block">
              <Phone className="h-3 w-3 inline mr-1" />
              Mobile Number *
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter your mobile number"
              className="border-0 p-0 text-base font-semibold text-slate-900 focus-visible:ring-0 bg-transparent"
              required
            />
          </div>

          {/* Row 4: Age & Handicap */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500/10">
              <Label htmlFor="age" className="text-xs uppercase font-medium text-slate-500 mb-1 block">
                Age *
              </Label>
              <Input
                id="age"
                type="number"
                min="13"
                max="120"
                value={formData.age === null ? '' : String(formData.age)}
                onChange={(e) => handleInputChange('age', e.target.value === '' ? null : Number(e.target.value))}
                onBlur={handleAgeBlur}
                placeholder="Enter age"
                className="border-0 p-0 text-base font-semibold text-slate-900 focus-visible:ring-0 bg-transparent"
                required
              />
              {ageError && (
                <p className="text-red-500 text-xs mt-1" aria-live="polite">{ageError}</p>
              )}
            </div>
            
            <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500/10 md:border-l-0 md:border-l-2 md:border-l-emerald-100 md:border-dotted">
              <Label htmlFor="handicap" className="text-xs uppercase font-medium text-slate-500 mb-1 block">
                <Target className="h-3 w-3 inline mr-1" />
                Handicap
              </Label>
              <Select
                value={formData.handicap === null ? 'none' : String(formData.handicap)}
                onValueChange={(value) => handleInputChange('handicap', value === 'none' ? null : Number(value))}
              >
                <SelectTrigger className="border-0 p-0 text-base font-semibold text-slate-900 focus:ring-0 bg-transparent h-auto">
                  <SelectValue placeholder="Select handicap" />
                </SelectTrigger>
                <SelectContent className="bg-white border-emerald-200">
                  <SelectItem value="none">I don't have one</SelectItem>
                  {Array.from({ length: 54 }, (_, i) => i + 1).map((handicap) => (
                    <SelectItem key={handicap} value={handicap.toString()}>
                      {handicap}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 5: Gender */}
          <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500/10">
            <Label htmlFor="gender" className="text-xs uppercase font-medium text-slate-500 mb-1 block">
              Gender
            </Label>
            <Select
              value={formData.gender} 
              onValueChange={(value) => handleInputChange('gender', value)}
            >
              <SelectTrigger className="border-0 p-0 text-base font-semibold text-slate-900 focus:ring-0 bg-transparent h-auto">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent className="bg-white border-emerald-200">
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(!!checked)}
              className="mt-1"
            />
            <Label htmlFor="terms" className="text-sm text-slate-700 leading-relaxed">
              I accept the terms and conditions and privacy policy *
            </Label>
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm text-lg"
              disabled={isSubmitting}
              aria-label="Enter Competition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Creating Entry...
                </>
              ) : (
                'Enter Competition'
              )}
            </Button>
            
            <p className="text-xs text-slate-500 text-center mt-3">
              By continuing, you agree to our Terms & Conditions and Privacy Policy
            </p>

            {/* No-Payments Note */}
            {availableProviders.length === 0 && (
              <p className="text-xs text-slate-500 text-center mt-2">
                💳 Payment will be handled offline at the clubhouse.
              </p>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};

export default PlayerJourneyEntryForm;