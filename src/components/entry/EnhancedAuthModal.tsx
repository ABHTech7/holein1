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
import { Separator } from "@/components/ui/separator";
import { Apple, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import useAuth from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface EnhancedAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (userId: string) => void;
  redirectUrl?: string;
}

export const EnhancedAuthModal = ({ 
  open, 
  onOpenChange, 
  onSuccess,
  redirectUrl 
}: EnhancedAuthModalProps) => {
  const { user, signUp } = useAuth();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
      onSuccess(user.id);
      onOpenChange(false);
    }
  }, [user, onSuccess, onOpenChange]);

  // Store redirect URL in localStorage for OAuth flows
  useEffect(() => {
    if (open && redirectUrl) {
      localStorage.setItem('auth_redirect_url', redirectUrl);
    }
  }, [open, redirectUrl]);

  const handleAppleAuth = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Authentication failed",
        description: error.message || "Failed to connect with Apple",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Authentication failed",
        description: error.message || "Failed to connect with Google",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Send magic link for email authentication
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      toast({
        title: "Check your email",
        description: "We've sent you a magic link to sign in",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Authentication failed", 
        description: error.message || "Failed to send magic link",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderMainAuth = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold font-['Montserrat']">
          Enter Competition
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose how you'd like to continue
        </p>
      </div>

      <div className="space-y-3">
        {/* Apple Sign In */}
        <Button
          onClick={handleAppleAuth}
          disabled={loading}
          variant="outline"
          size="lg"
          className="w-full h-12 text-base font-medium rounded-xl border-2 hover:border-primary/50 transition-all duration-200 hover:scale-[1.02]"
        >
          <Apple className="w-5 h-5 mr-3" />
          Continue with Apple
        </Button>

        {/* Google Sign In */}
        <Button
          onClick={handleGoogleAuth}
          disabled={loading}
          variant="outline"
          size="lg"
          className="w-full h-12 text-base font-medium rounded-xl border-2 hover:border-primary/50 transition-all duration-200 hover:scale-[1.02]"
        >
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        {/* Email Option */}
        <Button
          onClick={() => setShowEmailForm(true)}
          variant="secondary"
          size="lg"
          className="w-full h-12 text-base font-medium rounded-xl"
        >
          <Mail className="w-5 h-5 mr-3" />
          Continue with Email
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground px-4">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );

  const renderEmailForm = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold font-['Montserrat']">
          Sign in with Email
        </h3>
        <p className="text-sm text-muted-foreground">
          We'll send you a magic link to sign in
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12"
          />
        </div>

        <Button
          onClick={handleEmailAuth}
          disabled={loading}
          className="w-full h-12 text-base font-medium rounded-xl"
        >
          {loading ? "Sending..." : "Send Magic Link"}
        </Button>

        <Button
          variant="link"
          onClick={() => setShowEmailForm(false)}
          className="w-full"
        >
          ← Back to sign-in options
        </Button>
      </div>
    </div>
  );

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

        {showEmailForm ? renderEmailForm() : renderMainAuth()}
      </DialogContent>
    </Dialog>
  );
};