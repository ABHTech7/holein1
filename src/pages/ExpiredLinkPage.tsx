import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Container from "@/components/layout/Container";
import { AlertCircle, Mail, RefreshCw } from "lucide-react";
import { ResendMagicLink } from "@/components/auth/ResendMagicLink";
import { toast } from "@/hooks/use-toast";
import { getLastAuthEmail } from "@/lib/entryContextPersistence";
import useAuth from "@/hooks/useAuth";

const LAST_AUTH_EMAIL_KEY = 'last_auth_email';
const EMAIL_TTL_MINUTES = parseInt(import.meta.env.VITE_AUTH_EMAIL_TTL_MINUTES as string, 10) || 360; // 6 hours

const ExpiredLinkPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); 
  const [email, setEmail] = useState("");
  const [showEmailField, setShowEmailField] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoResendTriggered, setAutoResendTriggered] = useState(false);
  const { sendOtp } = useAuth();
  const autoResendOnceRef = useRef(false);

  useEffect(() => {
    // Try to get email from URL params or localStorage
    const emailFromParams = searchParams.get('email');
    const reason = searchParams.get('reason');
    const autoResend = searchParams.get('auto_resend') === '1';
    
    // Try to get stored email with 6-hour TTL
    const storedEmail = getLastAuthEmail() || (() => {
      const storedEmailData = localStorage.getItem(LAST_AUTH_EMAIL_KEY);
      if (storedEmailData) {
        try {
          const { email: stored, timestamp } = JSON.parse(storedEmailData);
          const isExpired = Date.now() - timestamp > EMAIL_TTL_MINUTES * 60 * 1000;
          if (!isExpired) {
            return stored;
          } else {
            localStorage.removeItem(LAST_AUTH_EMAIL_KEY);
          }
        } catch {
          localStorage.removeItem(LAST_AUTH_EMAIL_KEY);
        }
      }
      return null;
    })();
    
    const fallbackEmail = emailFromParams || storedEmail;
    if (fallbackEmail) {
      setEmail(fallbackEmail);
      
      // Auto-resend if requested and not already triggered
      if (autoResend && !autoResendOnceRef.current && !autoResendTriggered) {
        autoResendOnceRef.current = true;
        setAutoResendTriggered(true);
        
        // Wait briefly then auto-resend
        setTimeout(async () => {
          try {
            const result = await sendOtp(fallbackEmail, true);
            if (result.error) {
              console.warn('[ExpiredLink] Auto-resend failed:', result.error);
            } else {
              const messageMap = {
                pkce_missing: "Looks like you opened the link in a different app or browser. We're sending a new one now.",
                expired: "Your secure link has expired. We're sending a new one.",
                missing: "We're sending you a new secure link."
              };
              
              toast({
                title: "New link sent!",
                description: messageMap[reason as keyof typeof messageMap] || "Check your inbox for the new secure link.",
              });
            }
          } catch (error) {
            console.error('[ExpiredLink] Auto-resend error:', error);
          }
        }, 1000);
      }
    } else {
      setShowEmailField(true);
    }
  }, [searchParams, sendOtp, autoResendTriggered]);

  const handleResendSuccess = () => {
    toast({
      title: "Link sent!",
      description: "Check your inbox for the new secure link.",
    });
    
    // Store the email for future use
    localStorage.setItem(LAST_AUTH_EMAIL_KEY, JSON.stringify({
      email,
      timestamp: Date.now()
    }));
  };

  const handleResendError = (error: string) => {
    toast({
      title: "Failed to resend link",
      description: error,
      variant: "destructive"
    });
  };

  const handleDifferentEmail = () => {
    setShowEmailField(true);
    setEmail("");
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setShowEmailField(false);
    // Store the new email
    localStorage.setItem(LAST_AUTH_EMAIL_KEY, JSON.stringify({
      email: email.trim(),
      timestamp: Date.now()
    }));
  };

  return (
    <Container className="py-24">
      <div className="mx-auto max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-xl">
              {searchParams.get('reason') === 'pkce_missing' ? 'Link opened in different app' : 'Your sign-in link expired'}
            </CardTitle>
            <CardDescription>
              {(() => {
                const reason = searchParams.get('reason');
                if (reason === 'pkce_missing') {
                  return "Looks like you opened the link in a different app or browser. We'll send you a fresh link.";
                } else if (reason === 'expired') {
                  return "Your secure link has expired for security reasons. You can request a new one below.";
                } else {
                  return "The secure link in your email has expired for security reasons. You can request a new one below.";
                }
              })()}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {showEmailField ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={!email.trim()}>
                  Continue
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center p-3 bg-muted rounded-lg">
                  <Mail className="w-5 h-5 text-muted-foreground mr-3" />
                  <span className="text-sm font-medium">{email}</span>
                </div>
                
            <ResendMagicLink
              email={email}
              redirectUrl={`${window.location.origin}/auth/callback?email=${encodeURIComponent(email)}`}
              onResendSuccess={handleResendSuccess}
              onResendError={handleResendError}
              showAsCard={false}
              size="lg"
              variant="default"
            />
                
                <Button 
                  variant="outline" 
                  onClick={handleDifferentEmail}
                  className="w-full"
                >
                  Use a different email
                </Button>
              </div>
            )}
            
            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/auth')}
                className="text-sm"
              >
                Back to sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
};

export default ExpiredLinkPage;