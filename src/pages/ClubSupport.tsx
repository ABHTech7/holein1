import { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Phone, Mail, HelpCircle, Bug, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";

const ClubSupport = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    message: '',
    name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || '',
    email: profile?.email || '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.category || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Call edge function to send support ticket
      const { error } = await supabase.functions.invoke('send-support-ticket', {
        body: {
          ...formData,
          club_id: profile?.club_id,
          user_id: profile?.id,
          user_role: profile?.role
        }
      });

      if (error) throw error;

      toast({
        title: "Support Ticket Submitted",
        description: "We've received your request and will get back to you within 24 hours.",
      });

      // Reset form
      setFormData({
        subject: '',
        category: '',
        priority: 'medium',
        message: '',
        name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || '',
        email: profile?.email || '',
        phone: ''
      });

    } catch (error) {
      console.error('Error submitting support ticket:', error);
      toast({
        title: "Error",
        description: "Failed to submit support ticket. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="lg">
          <Container>
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Header */}
              <div className="text-center">
                <h1 className="font-display text-3xl font-bold text-foreground">Support & Help</h1>
                <p className="text-muted-foreground mt-2">
                  Get help with your Hole in 1 Challenge management
                </p>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Quick Help */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5" />
                        Quick Help
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <h4 className="font-medium">Common Questions</h4>
                        <div className="space-y-2 text-sm">
                          <button className="block text-left hover:text-primary">
                            How do I set up a new competition?
                          </button>
                          <button className="block text-left hover:text-primary">
                            How do players enter competitions?
                          </button>
                          <button className="block text-left hover:text-primary">
                            How do I track payments?
                          </button>
                          <button className="block text-left hover:text-primary">
                            How do I verify hole-in-one claims?
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Phone className="w-5 h-5" />
                        Contact Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        support@holein1challenge.com
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        Available via support ticket
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Response time: Usually within 24 hours
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Support Ticket Form */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Submit Support Ticket
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => handleInputChange('name', e.target.value)}
                              placeholder="Your full name"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => handleInputChange('email', e.target.value)}
                              placeholder="your@email.com"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone (Optional)</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            placeholder="Your phone number"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="category">Category *</Label>
                            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="technical">Technical Issue</SelectItem>
                                <SelectItem value="billing">Billing & Payments</SelectItem>
                                <SelectItem value="competition">Competition Management</SelectItem>
                                <SelectItem value="player">Player Management</SelectItem>
                                <SelectItem value="feature">Feature Request</SelectItem>
                                <SelectItem value="general">General Question</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="subject">Subject *</Label>
                          <Input
                            id="subject"
                            value={formData.subject}
                            onChange={(e) => handleInputChange('subject', e.target.value)}
                            placeholder="Brief description of your issue"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message">Message *</Label>
                          <Textarea
                            id="message"
                            value={formData.message}
                            onChange={(e) => handleInputChange('message', e.target.value)}
                            placeholder="Please provide as much detail as possible about your question or issue..."
                            rows={6}
                            required
                          />
                        </div>

                        <Button 
                          type="submit" 
                          disabled={loading}
                          className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground"
                        >
                          {loading ? "Submitting..." : "Submit Support Ticket"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default ClubSupport;