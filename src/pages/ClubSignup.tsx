import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import { Hero, HeroTitle, HeroSubtitle, HeroActions } from "@/components/ui/hero";
import FeatureItem from "@/components/ui/feature-item";
import { CheckCircle, Trophy, Users, TrendingUp, Target, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const ClubSignup = () => {
  const [formData, setFormData] = useState({
    clubName: "",
    contactName: "",
    role: "",
    email: "",
    phone: "",
    message: "",
    consent: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.consent) {
      toast({
        title: "Consent Required",
        description: "Please agree to our terms and conditions to proceed.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Store lead in database
      const { error: leadError } = await supabase
        .from('leads')
        .insert({
          name: formData.contactName,
          email: formData.email,
          phone: formData.phone,
          source: 'Club Signup Form',
          status: 'NEW',
          notes: `Club: ${formData.clubName}, Role: ${formData.role}, Message: ${formData.message}`
        });

      if (leadError) throw leadError;

      // Send internal notification email
      const { error: emailError } = await supabase.functions.invoke('send-lead-notification', {
        body: {
          lead: {
            clubName: formData.clubName,
            contactName: formData.contactName,
            role: formData.role,
            email: formData.email,
            phone: formData.phone,
            message: formData.message
          }
        }
      });

      if (emailError) {
        console.warn('Email notification failed:', emailError);
        // Don't fail the whole process if email fails
      }

      setIsSubmitted(true);
      toast({
        title: "Application Submitted!",
        description: "Thank you for your interest. We'll be in touch within 24 hours."
      });
    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Section spacing="xl" className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Container>
              <div className="text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-accent" />
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Application Submitted Successfully!
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                  Thank you for your interest in partnering with us. Our team will review your application 
                  and get back to you within 24 hours with next steps.
                </p>
                <Button 
                  asChild 
                  className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold"
                >
                  <Link to="/">Return Home</Link>
                </Button>
              </div>
            </Container>
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
        {/* Hero Section */}
        <Hero variant="gradient">
          <HeroTitle>Join the Challenge. Elevate Your Club.</HeroTitle>
          <HeroSubtitle>
            Partner with us to bring the excitement of hole-in-one competitions to your course.
          </HeroSubtitle>
          <HeroActions>
            <Button 
              asChild 
              size="lg"
              variant="secondary"
              className="bg-background text-foreground hover:bg-background/90"
            >
              <a href="#registration">Register Your Interest</a>
            </Button>
          </HeroActions>
        </Hero>

        {/* Why Partner Section */}
        <Section spacing="xl" className="bg-muted/30">
          <Container>
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Partner with Us?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Four key benefits that will transform your golf club experience
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <Trophy className="w-12 h-12 text-accent mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  Prestige & Excitement
                </h3>
                <p className="text-muted-foreground">
                  Create buzz and excitement that attracts new members and keeps existing ones engaged.
                </p>
              </div>

              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-accent mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  New Revenue
                </h3>
                <p className="text-muted-foreground">
                  Generate additional income through entry fees and increased course utilization.
                </p>
              </div>

              <div className="text-center">
                <Users className="w-12 h-12 text-accent mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  Member Engagement
                </h3>
                <p className="text-muted-foreground">
                  Give your members something special to look forward to every time they play.
                </p>
              </div>

              <div className="text-center">
                <Settings className="w-12 h-12 text-accent mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  Technology That Works for You
                </h3>
                <p className="text-muted-foreground">
                  Simple, powerful tools that integrate seamlessly with your current operations.
                </p>
              </div>
            </div>
          </Container>
        </Section>

        {/* How It Works Section */}
        <Section spacing="xl">
          <Container>
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Three simple steps to transform your course into a destination for unforgettable golf experiences
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="relative mb-6">
                  <img 
                    src="/img/handshake.jpg" 
                    alt="Professional handshake representing partnership"
                    className="w-full h-48 object-cover rounded-xl shadow-medium"
                    loading="lazy"
                  />
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-primary-foreground">1</span>
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-4">
                  Choose your hole.
                </h3>
                <p className="text-muted-foreground">
                  Select the perfect par-3 hole on your course to host the challenge. We'll help you pick the ideal location.
                </p>
              </div>

              <div className="text-center">
                <div className="relative mb-6">
                  <img 
                    src="/img/laptop-dashboard.jpg" 
                    alt="Laptop showing competition dashboard"
                    className="w-full h-48 object-cover rounded-xl shadow-medium"
                    loading="lazy"
                  />
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-primary-foreground">2</span>
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-4">
                  Players enter for their chance to win.
                </h3>
                <p className="text-muted-foreground">
                  Members sign up through our easy-to-use platform and play their rounds, all tracked automatically.
                </p>
              </div>

              <div className="text-center">
                <div className="relative mb-6">
                  <img 
                    src="/img/celebration.jpg" 
                    alt="Golfers celebrating on the course"
                    className="w-full h-48 object-cover rounded-xl shadow-medium"
                    loading="lazy"
                  />
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-primary-foreground">3</span>
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-4">
                  Your club enjoys more engagement, revenue, and prestige.
                </h3>
                <p className="text-muted-foreground">
                  Watch as your course becomes the talk of the golfing community, driving more play and revenue.
                </p>
              </div>
            </div>
          </Container>
        </Section>

        {/* Tech + Support Section */}
        <Section spacing="xl" className="bg-muted/30">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Technology & Support That Delivers
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Our platform handles all the complexity while you focus on what you do best - running an exceptional golf club.
                </p>
                
                <div className="space-y-4">
                  <FeatureItem
                    icon={Target}
                    title="Real-time Tracking"
                    description="Monitor competitions and player progress instantly through your dashboard"
                  />
                  <FeatureItem
                    icon={Settings}
                    title="Automated Management"
                    description="From entry processing to winner verification, everything happens automatically"
                  />
                  <FeatureItem
                    icon={Users}
                    title="Dedicated Support"
                    description="Your success manager ensures smooth operations and maximizes your program's impact"
                  />
                </div>
              </div>
              
              <div>
                <img 
                  src="/img/mock-dashboard.jpg" 
                  alt="Dashboard interface showing competition management"
                  className="rounded-xl shadow-elegant w-full"
                  loading="lazy"
                />
              </div>
            </div>
          </Container>
        </Section>

        {/* Registration Form */}
        <Section spacing="xl">
          <Container>
            <div className="max-w-2xl mx-auto" id="registration">
              <div className="text-center mb-8">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Ready to Get Started?
                </h2>
                <p className="text-lg text-muted-foreground">
                  Complete this form and we'll be in touch within 24 hours to discuss your partnership.
                </p>
              </div>

              <Card className="shadow-medium">
                <CardHeader>
                  <CardTitle>Partnership Application</CardTitle>
                  <CardDescription>
                    Tell us about your club and we'll create a custom solution for your needs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="clubName">Club Name *</Label>
                        <Input
                          id="clubName"
                          placeholder="Pine Valley Golf Club"
                          value={formData.clubName}
                          onChange={(e) => setFormData({...formData, clubName: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="contactName">Your Name *</Label>
                        <Input
                          id="contactName"
                          placeholder="John Smith"
                          value={formData.contactName}
                          onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="role">Your Role *</Label>
                      <Select onValueChange={(value) => setFormData({...formData, role: value})} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role at the club" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="General Manager">General Manager</SelectItem>
                          <SelectItem value="Owner">Owner</SelectItem>
                          <SelectItem value="Golf Professional">Golf Professional</SelectItem>
                          <SelectItem value="Director of Golf">Director of Golf</SelectItem>
                          <SelectItem value="Head Pro">Head Pro</SelectItem>
                          <SelectItem value="Club President">Club President</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@pinevalleygc.com"
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
                          placeholder="(555) 123-4567"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="message">Tell Us About Your Club</Label>
                      <Textarea
                        id="message"
                        placeholder="Share details about your club, member count, current events, and what makes your club special. What are your goals for a hole-in-one challenge program?"
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        rows={4}
                      />
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="consent" 
                        checked={formData.consent}
                        onCheckedChange={(checked) => setFormData({...formData, consent: !!checked})}
                      />
                      <Label htmlFor="consent" className="text-sm leading-5">
                        I agree to be contacted regarding partnership opportunities and accept the{" "}
                        <Link to="/policies/terms" className="text-primary hover:underline">Terms of Service</Link>
                        {" "}and{" "}
                        <Link to="/policies/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                      </Label>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold"
                      size="lg"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Partnership Application"}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      * Required fields. We'll respond within 24 hours.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default ClubSignup;