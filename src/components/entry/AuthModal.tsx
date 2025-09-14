import { useState, useEffect } from "react";
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
import { Mail, User, Phone, Calendar, Target, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import useAuth from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (userId: string) => void;
}

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  handicap: string;
  consentMarketing: boolean;
}

export const AuthModal = ({ open, onOpenChange, onSuccess }: AuthModalProps) => {
  const { user, signIn, sendOtp } = useAuth();
  const [step, setStep] = useState<'login' | 'signup' | 'profile'>('login');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    handicap: '',
    consentMarketing: false
  });

  useEffect(() => {
    if (user) {
      onSuccess(user.id);
      onOpenChange(false);
    }
  }, [user, onSuccess, onOpenChange]);

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      toast({
        title: "Please enter email and password",
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
    }
    
    setLoading(false);
  };

  const handleSendOtp = async (isResend = false) => {
    if (!profileForm.email || !profileForm.email.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    if (isResend) {
      setResendLoading(true);
    } else {
      setLoading(true);
    }

    const { error } = await sendOtp(profileForm.email);

    if (error) {
      toast({
        title: isResend ? "Failed to resend link" : "Authentication failed",
        description: error,
        variant: "destructive"
      });
    } else {
      setEmailSent(true);
      toast({
        title: isResend ? "Link resent!" : "Check your email",
        description: "We've sent you a secure entry link.",
      });
    }

    if (isResend) {
      setResendLoading(false);
    } else {
      setLoading(false);
    }
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
          <Label htmlFor="email">Email</Label>
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
          onClick={handleLogin}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </div>

      <div className="text-center">
        <Button
          variant="link"
          onClick={() => {
            setStep('signup');
            setProfileForm(prev => ({ ...prev, email: loginForm.email }));
          }}
          className="text-sm"
        >
          Don't have an account? Sign up instead
        </Button>
      </div>
    </div>
  );

  const renderSignupStep = () => {
    if (emailSent) {
      return (
        <div className="space-y-4">
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Check your email
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    We've sent a secure entry link to <strong>{profileForm.email}</strong>. Open it on this device to continue.
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
                onClick={() => handleSendOtp(true)}
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
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Enter Competition</h3>
          <p className="text-sm text-muted-foreground">
            We'll send you a secure entry link to verify and complete your entry
          </p>
        </div>

        <div className="space-y-4">
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
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={profileForm.email}
              onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

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
              onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dob" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date of birth *
              </Label>
              <Input
                id="dob"
                type="date"
                value={profileForm.dob}
                onChange={(e) => setProfileForm(prev => ({ ...prev, dob: e.target.value }))}
              />
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
                onChange={(e) => setProfileForm(prev => ({ ...prev, handicap: e.target.value }))}
              />
            </div>
          </div>

          <Button
            onClick={() => handleSendOtp()}
            disabled={loading}
            className="w-full"
          >
            <Mail className="w-5 h-5 mr-3" />
            {loading ? "Sending..." : "Send Secure Entry Link"}
          </Button>

          <p className="text-xs text-center text-muted-foreground px-4">
            By continuing, you agree to our Terms of Service and Privacy Policy.
            We'll send you a secure link to verify and complete your entry.
          </p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-2xl font-['Montserrat']">
            Welcome
          </DialogTitle>
          <DialogDescription>
            Quick and secure authentication to enter competitions
          </DialogDescription>
        </DialogHeader>

        {step === 'login' && renderLoginStep()}
        {step === 'signup' && renderSignupStep()}
      </DialogContent>
    </Dialog>
  );
};