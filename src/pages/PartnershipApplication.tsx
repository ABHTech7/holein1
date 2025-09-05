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
import { CheckCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const PartnershipApplication = () => {
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
          source: 'Partnership Application',
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
              <div className="text-center max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-accent" />
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Partnership Application Submitted!
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Thank you for your interest in partnering with us. Our team will review your application 
                  and get back to you within 24 hours with next steps.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button 
                    asChild 
                    className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold"
                  >
                    <Link to="/">Return Home</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/clubs/signup">Learn More</Link>
                  </Button>
                </div>
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
        <Section spacing="xl">
          <Container>
            <div className="max-w-2xl mx-auto">
              {/* Back Button */}
              <div className="mb-6">
                <Button asChild variant="ghost" className="gap-2">
                  <Link to="/">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                  </Link>
                </Button>
              </div>

              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Partnership Application
                </h1>
                <p className="text-lg text-muted-foreground">
                  Ready to bring the excitement of hole-in-one competitions to your course? 
                  Complete this simple form and we'll get back to you within 24 hours.
                </p>
              </div>

              {/* Application Form */}
              <Card className="shadow-medium">
                <CardHeader>
                  <CardTitle>Tell Us About Your Club</CardTitle>
                  <CardDescription>
                    We'll create a custom solution tailored to your club's needs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Club and Contact Info */}
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

                    {/* Role Selection */}
                    <div>
                      <Label htmlFor="role">Your Role at the Club *</Label>
                      <Select onValueChange={(value) => setFormData({...formData, role: value})} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
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

                    {/* Contact Details */}
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

                    {/* Additional Information */}
                    <div>
                      <Label htmlFor="message">Tell Us About Your Club (Optional)</Label>
                      <Textarea
                        id="message"
                        placeholder="Number of members, type of course, special considerations, etc."
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                      />
                    </div>

                    {/* Consent Checkbox */}
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="consent" 
                        checked={formData.consent}
                        onCheckedChange={(checked) => setFormData({...formData, consent: !!checked})}
                        required
                      />
                      <Label htmlFor="consent" className="text-sm leading-5">
                        I agree to be contacted by Hole in 1 Challenge regarding this partnership opportunity. 
                        I understand that submitting this form does not create any binding obligations.
                      </Label>
                    </div>

                    {/* Submit Button */}
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold"
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Submitting..." : "Submit Partnership Application"}
                    </Button>
                  </form>

                  {/* Footer Text */}
                  <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Questions? Contact us at{" "}
                      <a href="mailto:partnerships@holein1challenge.com" className="text-primary hover:underline">
                        partnerships@holein1challenge.com
                      </a>
                    </p>
                  </div>
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

export default PartnershipApplication;