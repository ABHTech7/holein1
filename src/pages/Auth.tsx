import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import { Eye, EyeOff, Mail } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import { ROUTES } from "@/routes";
import { ResendMagicLink } from "@/components/auth/ResendMagicLink";
import { getPendingEntryContext, getLastAuthEmail } from "@/lib/entryContextPersistence";

const Auth = () => {
  const { user, profile, loading, signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showCheckEmail, setShowCheckEmail] = useState(false);
  const [checkEmailAddress, setCheckEmailAddress] = useState<string | null>(null);
  
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  // Check for pending entry context or recent auth email
  useEffect(() => {
    const entryContext = getPendingEntryContext();
    const lastEmail = getLastAuthEmail();
    
    if (entryContext?.email) {
      setCheckEmailAddress(entryContext.email);
      setShowCheckEmail(true);
    } else if (lastEmail) {
      setCheckEmailAddress(lastEmail);
      setShowCheckEmail(true);
    }
  }, []);

  // Redirect based on user role
  if (user && profile) {
    switch (profile.role) {
      case 'ADMIN':
        return <Navigate to={ROUTES.ADMIN.DASHBOARD} replace />;
      case 'CLUB':
        return <Navigate to={ROUTES.CLUB.DASHBOARD} replace />;
      case 'PLAYER':
        return <Navigate to={ROUTES.PLAYER.ENTRIES} replace />;
      default:
        return <Navigate to={ROUTES.HOME} replace />;
    }
  }

  // Show loading if user exists but profile is still loading
  if (user && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(signInData.email, signInData.password);
  };

  // Show check email state if we have pending entry context
  if (showCheckEmail && checkEmailAddress) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        
        <main className="flex-1">
          <Section spacing="xl" className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="w-full max-w-md">
              <div className="text-center mb-8">
                <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                  Check Your Email
                </h1>
                <p className="text-muted-foreground">
                  We sent you a secure entry link
                </p>
              </div>

              <Card className="shadow-medium">
                <CardContent className="p-6 text-center">
                  <Mail className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Link Sent</h3>
                  <p className="text-muted-foreground mb-4">
                    We've sent a secure link to <strong>{checkEmailAddress}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Click the link in your email to complete your entry
                  </p>
                  
                  <div className="w-full mb-4">
                    <ResendMagicLink
                      email={checkEmailAddress}
                      redirectUrl={`${window.location.origin}/auth/callback?email=${encodeURIComponent(checkEmailAddress)}`}
                      showAsCard={false}
                      size="default"
                      variant="outline"
                    />
                  </div>
                  
                  <Button 
                    variant="ghost"
                    onClick={() => setShowCheckEmail(false)}
                    className="text-sm"
                  >
                    Show sign-in form instead
                  </Button>
                </CardContent>
              </Card>
            </div>
          </Section>
        </main>

        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="xl" className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                Welcome to Official Hole in 1
              </h1>
              <p className="text-muted-foreground">
                Sign in to your existing account
              </p>
            </div>

            <Card className="shadow-medium">
              <CardContent className="p-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({...signInData, email: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={signInData.password}
                        onChange={(e) => setSignInData({...signInData, password: e.target.value})}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold"
                    size="lg"
                  >
                    Sign In
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    New player? Sign up is available through competition QR codes only.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Club managers and administrators are added through the admin dashboard.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Auth;