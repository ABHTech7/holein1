import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Container from "@/components/layout/Container";
import { AlertCircle, Mail, RefreshCw } from "lucide-react";
import { ResendMagicLink } from "@/components/auth/ResendMagicLink";
import { toast } from "@/hooks/use-toast";

const LAST_AUTH_EMAIL_KEY = 'last_auth_email';
const EMAIL_TTL_MINUTES = 30;

const ExpiredLinkPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); 
  const [email, setEmail] = useState("");
  const [showEmailField, setShowEmailField] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Try to get email from URL params or localStorage
    const emailFromParams = searchParams.get('email');
    const storedEmailData = localStorage.getItem(LAST_AUTH_EMAIL_KEY);
    
    let storedEmail = '';
    if (storedEmailData) {
      try {
        const { email: stored, timestamp } = JSON.parse(storedEmailData);
        const isExpired = Date.now() - timestamp > EMAIL_TTL_MINUTES * 60 * 1000;
        if (!isExpired) {
          storedEmail = stored;
        } else {
          localStorage.removeItem(LAST_AUTH_EMAIL_KEY);
        }
      } catch {
        localStorage.removeItem(LAST_AUTH_EMAIL_KEY);
      }
    }
    
    const fallbackEmail = emailFromParams || storedEmail;
    if (fallbackEmail) {
      setEmail(fallbackEmail);
    } else {
      setShowEmailField(true);
    }
  }, [searchParams]);

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
            <CardTitle className="text-xl">Your sign-in link expired</CardTitle>
            <CardDescription>
              The secure link in your email has expired for security reasons. 
              You can request a new one below.
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
              redirectUrl={`${window.location.origin}/auth/callback`}
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