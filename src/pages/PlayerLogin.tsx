import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import { Hero, HeroTitle, HeroSubtitle, HeroActions } from "@/components/ui/hero";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/routes";
import { clearAllEntryContext } from "@/lib/entryContextPersistence";

const PlayerLogin = () => {
  const { user, profile, signIn, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);

  // Clear entry context when user becomes authenticated as player
  useEffect(() => {
    if (user && profile?.role === 'PLAYER') {
      clearAllEntryContext();
    }
  }, [user, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await signIn(formData.email, formData.password);
    
    if (!error) {
      // Clear stale entry context on successful login
      clearAllEntryContext();
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="flex-1">
          <Container className="py-12">
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </Container>
        </main>
        <SiteFooter />
      </div>
    );
  }

  // Redirect authenticated players to their dashboard
  if (user && profile?.role === 'PLAYER') {
    return <Navigate to={ROUTES.PLAYER.DASHBOARD} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <Hero variant="image" backgroundImage="/placeholder.svg">
          <HeroTitle>Welcome Back, Challenger.</HeroTitle>
          <HeroSubtitle>
            Ready to make golf history? Sign in to track your entries, view your achievements, and see where you stand among the legends.
          </HeroSubtitle>
          <HeroActions>
            <Button asChild variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
              <a href="#login-form">Sign In Below</a>
            </Button>
          </HeroActions>
        </Hero>

        <Section spacing="xl">
          <Container>
            <div className="max-w-md mx-auto" id="login-form">
              <div className="text-center mb-8">
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Player Login
                </h2>
                <p className="text-muted-foreground">
                  Access your competition history and current challenges
                </p>
              </div>

              <Card className="shadow-medium">
                <CardHeader className="text-center">
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your player dashboard
                  </CardDescription>
                </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
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

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remember" 
                        checked={formData.rememberMe}
                        onCheckedChange={(checked) => setFormData({...formData, rememberMe: !!checked})}
                      />
                      <Label htmlFor="remember" className="text-sm">
                        Remember me
                      </Label>
                    </div>
                    <Link 
                      to="/forgot-password" 
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
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
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link to="/auth" className="text-primary hover:underline">
                      Create one here
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>

              <div className="mt-8 text-center">
                <Card className="bg-muted/50">
                  <CardContent className="p-6">
                    <h4 className="font-semibold text-foreground mb-2">New to Golf Challenges?</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Join thousands of golfers competing in hole-in-one challenges at premium courses worldwide.
                    </p>
                    <Button 
                      asChild 
                      variant="outline"
                      className="border-primary/20 hover:bg-primary/5"
                    >
                      <Link to="/auth">Join as Player</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default PlayerLogin;
