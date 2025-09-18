import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Container from "@/components/layout/Container";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import { AlertCircle } from "lucide-react";
import { ResendMagicLink } from "@/components/auth/ResendMagicLink";
import { toast } from "@/hooks/use-toast";
import { getLastAuthEmail } from "@/lib/entryContextPersistence";

const AuthExpiredPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); 
  const [email, setEmail] = useState("");

  useEffect(() => {
    // Try to get email from URL params or localStorage
    const emailFromParams = searchParams.get('email');
    const storedEmail = getLastAuthEmail();
    
    const fallbackEmail = emailFromParams || storedEmail;
    if (fallbackEmail) {
      setEmail(fallbackEmail);
    }
  }, [searchParams]);

  const handleResendSuccess = () => {
    toast({
      title: "Link sent!",
      description: "Check your inbox for the new secure link.",
    });
  };

  const handleResendError = (error: string) => {
    toast({
      title: "Failed to resend link",
      description: error,
      variant: "destructive"
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
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
                {email ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        Resend link to: <strong>{email}</strong>
                      </p>
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
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      No email found. Please return to the entry page to request a new link.
                    </p>
                  </div>
                )}
                
                <div className="text-center">
                  <button 
                    onClick={() => navigate('/auth')}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Back to sign in
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
};

export default AuthExpiredPage;