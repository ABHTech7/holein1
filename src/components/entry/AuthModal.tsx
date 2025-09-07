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
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Smartphone, Calendar, Target, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import useAuth from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (userId: string) => void;
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  handicap: string;
  consentMarketing: boolean;
}

export const AuthModal = ({ open, onOpenChange, onSuccess }: AuthModalProps) => {
  const { user, signUp, signIn } = useAuth();
  const [step, setStep] = useState<'login' | 'signup' | 'profile'>('login');
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    handicap: '',
    consentMarketing: false
  });

  const handleEmailLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      toast({
        title: "Missing information",
        description: "Please enter your email and password",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setStep('signup');
        setProfileForm(prev => ({ ...prev, email: loginForm.email }));
      }
    } else if (user) {
      onSuccess(user.id);
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    // Validate required fields
    if (!profileForm.firstName || !profileForm.lastName || !profileForm.email || 
        !profileForm.phone || !profileForm.dob || !profileForm.handicap) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Validate handicap eligibility
    const handicapValue = parseFloat(profileForm.handicap);
    if (handicapValue <= 0) {
      toast({
        title: "Eligibility Check Failed",
        description: "Players with handicap 0 or below are not eligible to enter competitions. Contact support if you believe this is an error.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const { error } = await signUp(
      profileForm.email,
      'temp-password-' + Date.now(),
      {
        first_name: profileForm.firstName,
        last_name: profileForm.lastName,
        phone: profileForm.phone,
        role: 'PLAYER',
        dob: profileForm.dob,
        handicap: handicapValue,
        consent_marketing: profileForm.consentMarketing
      }
    );

    if (!error && user) {
      onSuccess(user.id);
      onOpenChange(false);
    }
    setLoading(false);
  };

  const renderLoginStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Sign in to enter</h3>
        <p className="text-sm text-muted-foreground">
          Enter your email to sign in or create an account
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={loginForm.email}
            onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={loginForm.password}
            onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
          />
        </div>

        <Button
          onClick={handleEmailLogin}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Signing in..." : "Continue"}
        </Button>

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => {
              setStep('signup');
              setProfileForm(prev => ({ ...prev, email: loginForm.email }));
            }}
            className="text-sm"
          >
            Don't have an account? Sign up
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSignupStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Create your account</h3>
        <p className="text-sm text-muted-foreground">
          We need some information to verify your eligibility
        </p>
      </div>

      {/* Eligibility Warning */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Eligibility Requirement
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Players with handicap 0 or below cannot enter competitions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name *</Label>
          <Input
            id="firstName"
            placeholder="John"
            value={profileForm.firstName}
            onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name *</Label>
          <Input
            id="lastName"
            placeholder="Smith"
            value={profileForm.lastName}
            onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email address *</Label>
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
          value={profileForm.email}
          onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone number *</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+44 7700 900000"
          value={profileForm.phone}
          onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dob">Date of birth *</Label>
        <Input
          id="dob"
          type="date"
          value={profileForm.dob}
          onChange={(e) => setProfileForm(prev => ({ ...prev, dob: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="handicap">Golf handicap *</Label>
        <Input
          id="handicap"
          type="number"
          step="0.1"
          placeholder="18.5"
          value={profileForm.handicap}
          onChange={(e) => setProfileForm(prev => ({ ...prev, handicap: e.target.value }))}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="marketing"
          checked={profileForm.consentMarketing}
          onCheckedChange={(checked) => 
            setProfileForm(prev => ({ ...prev, consentMarketing: checked as boolean }))
          }
        />
        <Label htmlFor="marketing" className="text-sm">
          I'd like to receive marketing emails about competitions and offers
        </Label>
      </div>

      <Button
        onClick={handleSignup}
        disabled={loading}
        className="w-full"
      >
        {loading ? "Creating account..." : "Create Account & Enter"}
      </Button>

      <div className="text-center">
        <Button
          variant="link"
          onClick={() => setStep('login')}
          className="text-sm"
        >
          Already have an account? Sign in
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-['Montserrat']">
            {step === 'login' ? 'Welcome back' : 'Join Hole in 1 Challenge'}
          </DialogTitle>
          <DialogDescription>
            {step === 'login' 
              ? 'Sign in to your account to enter competitions'
              : 'Create your account to start entering competitions'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'login' && renderLoginStep()}
        {step === 'signup' && renderSignupStep()}
      </DialogContent>
    </Dialog>
  );
};