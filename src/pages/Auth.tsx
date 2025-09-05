import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import { Eye, EyeOff } from "lucide-react";
import useAuth from "@/hooks/useAuth";

const Auth = () => {
  const { user, profile, loading, signIn, signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });
  
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    role: "PLAYER" as "ADMIN" | "CLUB" | "PLAYER",
  });

  // Redirect based on user role
  if (user && profile) {
    switch (profile.role) {
      case 'ADMIN':
        return <Navigate to="/dashboard/admin" replace />;
      case 'CLUB':
        return <Navigate to="/dashboard/club" replace />;
      case 'PLAYER':
        return <Navigate to="/players/entries" replace />;
      default:
        return <Navigate to="/" replace />;
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpData.password !== signUpData.confirmPassword) {
      return;
    }
    
    await signUp(signUpData.email, signUpData.password, {
      first_name: signUpData.firstName,
      last_name: signUpData.lastName,
      role: signUpData.role,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="xl" className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                Welcome to Hole in 1 Challenge
              </h1>
              <p className="text-muted-foreground">
                Sign in to your account or create a new one
              </p>
            </div>

            <Card className="shadow-medium">
              <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="signin" className="mt-6">
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
                  </TabsContent>
                  
                  <TabsContent value="signup" className="mt-6">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="first-name">First Name</Label>
                          <Input
                            id="first-name"
                            placeholder="First name"
                            value={signUpData.firstName}
                            onChange={(e) => setSignUpData({...signUpData, firstName: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="last-name">Last Name</Label>
                          <Input
                            id="last-name"
                            placeholder="Last name"
                            value={signUpData.lastName}
                            onChange={(e) => setSignUpData({...signUpData, lastName: e.target.value})}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="Enter your email"
                          value={signUpData.email}
                          onChange={(e) => setSignUpData({...signUpData, email: e.target.value})}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={signUpData.role}
                          onValueChange={(value: "ADMIN" | "CLUB" | "PLAYER") => 
                            setSignUpData({...signUpData, role: value})
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PLAYER">Player</SelectItem>
                            <SelectItem value="CLUB">Club Manager</SelectItem>
                            <SelectItem value="ADMIN">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="signup-password">Password</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Create a password"
                          value={signUpData.password}
                          onChange={(e) => setSignUpData({...signUpData, password: e.target.value})}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Confirm your password"
                          value={signUpData.confirmPassword}
                          onChange={(e) => setSignUpData({...signUpData, confirmPassword: e.target.value})}
                          required
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold"
                        size="lg"
                      >
                        Sign Up
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  <p>
                    Demo credentials available - check the console for test accounts
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