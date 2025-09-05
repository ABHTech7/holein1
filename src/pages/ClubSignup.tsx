import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import { Trophy, Users, Calendar, BarChart3 } from "lucide-react";
import FeatureItem from "@/components/ui/feature-item";

const ClubSignup = () => {
  const [formData, setFormData] = useState({
    clubName: "",
    contactName: "",
    email: "",
    phone: "",
    sport: "",
    clubSize: "",
    description: "",
    agreeTerms: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Club signup form submitted:", formData);
    // Handle form submission
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="xl">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="font-display text-4xl font-bold text-foreground mb-4">
                Start Your Club's Digital Journey
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join thousands of sports clubs using SportSync to streamline operations 
                and engage members. Get started with our 30-day free trial.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Form */}
              <Card className="shadow-medium">
                <CardHeader>
                  <CardTitle className="text-2xl">Club Registration</CardTitle>
                  <CardDescription>
                    Fill in your club details to get started with SportSync
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="clubName">Club Name *</Label>
                        <Input
                          id="clubName"
                          placeholder="Enter your club name"
                          value={formData.clubName}
                          onChange={(e) => setFormData({...formData, clubName: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="contactName">Contact Person *</Label>
                        <Input
                          id="contactName"
                          placeholder="Your full name"
                          value={formData.contactName}
                          onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="club@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sport">Primary Sport *</Label>
                        <Select value={formData.sport} onValueChange={(value) => setFormData({...formData, sport: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your sport" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="football">Football</SelectItem>
                            <SelectItem value="basketball">Basketball</SelectItem>
                            <SelectItem value="tennis">Tennis</SelectItem>
                            <SelectItem value="swimming">Swimming</SelectItem>
                            <SelectItem value="athletics">Athletics</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="clubSize">Club Size</Label>
                        <Select value={formData.clubSize} onValueChange={(value) => setFormData({...formData, clubSize: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Number of members" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-50">1-50 members</SelectItem>
                            <SelectItem value="51-100">51-100 members</SelectItem>
                            <SelectItem value="101-250">101-250 members</SelectItem>
                            <SelectItem value="251-500">251-500 members</SelectItem>
                            <SelectItem value="500+">500+ members</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Club Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Tell us about your club, its history, and goals..."
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows={4}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="terms" 
                        checked={formData.agreeTerms}
                        onCheckedChange={(checked) => setFormData({...formData, agreeTerms: !!checked})}
                      />
                      <Label htmlFor="terms" className="text-sm leading-relaxed">
                        I agree to the{" "}
                        <Link to="/policies/terms" className="text-primary hover:underline">
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link to="/policies/privacy" className="text-primary hover:underline">
                          Privacy Policy
                        </Link>
                      </Label>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold"
                      size="lg"
                    >
                      Start Free Trial
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Link to="/players/login" className="text-primary hover:underline">
                        Sign in here
                      </Link>
                    </p>
                  </form>
                </CardContent>
              </Card>

              {/* Benefits */}
              <div className="space-y-8">
                <div>
                  <h3 className="font-display text-2xl font-semibold mb-4">What's Included</h3>
                  <div className="space-y-6">
                    <FeatureItem
                      variant="minimal"
                      icon={Users}
                      title="Member Management"
                      description="Complete member database with profiles, subscriptions, and communication tools."
                    />
                    <FeatureItem
                      variant="minimal"
                      icon={Calendar}
                      title="Event Scheduling"
                      description="Schedule training sessions, matches, and tournaments with automated notifications."
                    />
                    <FeatureItem
                      variant="minimal"
                      icon={BarChart3}
                      title="Analytics & Reports"
                      description="Track attendance, performance metrics, and generate detailed reports."
                    />
                    <FeatureItem
                      variant="minimal"
                      icon={Trophy}
                      title="Competition Tools"
                      description="Organize tournaments, manage brackets, and track results effortlessly."
                    />
                  </div>
                </div>

                <Card className="bg-muted/50 border-primary/20">
                  <CardContent className="p-6">
                    <h4 className="font-semibold text-foreground mb-2">30-Day Free Trial</h4>
                    <p className="text-sm text-muted-foreground">
                      Try all features risk-free. No credit card required. 
                      Cancel anytime during your trial period.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default ClubSignup;