import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, Mail, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";

const ClubSupport = () => {
  const { profile } = useAuth();

  const handleMessageTeam = () => {
    const subject = "Support Request from Hole in 1 Challenge";
    const body = `Hi Support Team,

I need assistance with my club account.

Club: ${profile?.club_id || 'N/A'}
Name: ${profile?.first_name || ''} ${profile?.last_name || ''}
Email: ${profile?.email || ''}

Please describe your issue below:

---

Best regards,
${profile?.first_name || ''} ${profile?.last_name || ''}`;

    const mailtoLink = `mailto:support@holein1challenge.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
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

                {/* Message Team */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Contact Support
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="text-center py-8">
                        <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Need Help?</h3>
                        <p className="text-muted-foreground mb-6">
                          Click the button below to send us an email with your support request. 
                          We'll get back to you within 24 hours.
                        </p>
                        <Button 
                          onClick={handleMessageTeam}
                          className="bg-gradient-primary hover:opacity-90 text-primary-foreground"
                          size="lg"
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Message the Team
                        </Button>
                      </div>
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