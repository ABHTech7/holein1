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
import { Mail } from "lucide-react";
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
  const { user, sendOtp } = useAuth();
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
      // Send secure entry link for email authentication
      const { error } = await sendOtp(email);

      if (error) throw new Error(error);

      toast({
        title: "Check your email",
        description: "We've sent you a secure entry link. Open it on this device to continue.",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Authentication failed", 
        description: error.message || "Failed to send secure link",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderEmailForm = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold font-['Montserrat']">
          Enter Competition
        </h3>
        <p className="text-sm text-muted-foreground">
          We'll send you a secure entry link. Open it on this device to continue.
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
          aria-label="Enter Competition"
        >
          <Mail className="w-5 h-5 mr-3" />
          {loading ? "Sending..." : "Enter Competition"}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground px-4">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
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

        {renderEmailForm()}
      </DialogContent>
    </Dialog>
  );
};