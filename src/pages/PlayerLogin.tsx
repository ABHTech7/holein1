import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import { Eye, EyeOff } from "lucide-react";

const PlayerLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Player login form submitted:", formData);
    // Handle form submission
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="xl" className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                Welcome Back
              </h1>
              <p className="text-muted-foreground">
                Sign in to access your club dashboard and manage your activities
              </p>
            </div>

            {/* Login Form */}
            <Card className="shadow-medium">
              <CardHeader className="text-center">
                <CardTitle>Player Login</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
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
                    <Link to="/clubs/signup" className="text-primary hover:underline">
                      Register your club
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Additional Info */}
            <div className="mt-8 text-center">
              <Card className="bg-muted/50">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-foreground mb-2">New to SportSync?</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    If you're a club administrator looking to register your organization, 
                    use our club signup process instead.
                  </p>
                  <Button 
                    asChild 
                    variant="outline"
                    className="border-primary/20 hover:bg-primary/5"
                  >
                    <Link to="/clubs/signup">Register Club</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default PlayerLogin;