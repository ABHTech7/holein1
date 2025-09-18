import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";
import { Hero, HeroTitle, HeroSubtitle, HeroActions } from "@/components/ui/hero";
import FeatureItem from "@/components/ui/feature-item";
import { Trophy, TrendingUp, Users, Shield, BarChart3, Zap } from "lucide-react";

const ClubPartnerSection = () => {
  return (
    <div className="animate-fade-in">
      {/* Club-Focused Hero */}
      <Hero variant="image" backgroundImage="/img/hero-club.jpg">
        <HeroTitle>Transform Your Golf Course Into a Legendary Destination</HeroTitle>
        <HeroSubtitle>
          Join the network of forward-thinking clubs creating unforgettable experiences, 
          boosting member engagement, and building lasting prestige.
        </HeroSubtitle>
        <HeroActions>
          <Button 
            asChild 
            size="lg"
            className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold btn-glow"
          >
            <Link to="/partnership">Partner with Us</Link>
          </Button>
        </HeroActions>
      </Hero>

      {/* Why Clubs Choose Us */}
      <Section spacing="xl">
        <Container>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Top Golf Clubs Choose Our Platform
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Four pillars of excellence that transform your course into a premier destination
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureItem
              icon={Trophy}
              title="Build Prestige"
              description="Create legendary moments that members will talk about for years."
            />
            <FeatureItem
              icon={TrendingUp}
              title="New Revenue Streams"
              description="Generate additional income with every entry and competition."
            />
            <FeatureItem
              icon={Users}
              title="Boost Engagement"
              description="Give members compelling reasons to visit and stay active."
            />
            <FeatureItem
              icon={BarChart3}
              title="Smart Technology"
              description="Real-time insights, automated reporting, and member analytics."
            />
          </div>
        </Container>
      </Section>

      {/* Technology & Features */}
      <Section spacing="xl" className="bg-muted/30">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                Professional-grade technology that works seamlessly
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our platform integrates effortlessly with your existing operations, 
                providing powerful tools for member management, competition tracking, 
                and business intelligence.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Fully Insured</span>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-secondary" />
                  <span className="text-sm font-medium">Instant Setup</span>
                </div>
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-accent" />
                  <span className="text-sm font-medium">Live Analytics</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary-glow" />
                  <span className="text-sm font-medium">24/7 Support</span>
                </div>
              </div>

              <Button 
                asChild 
                size="lg"
                className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold"
              >
                <Link to="/partnership">Schedule a Demo</Link>
              </Button>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-8 shadow-medium">
                <div className="text-center mb-6">
                  <h3 className="font-display text-xl font-bold text-foreground mb-2">
                    Comprehensive Club Management
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Everything you need to run successful competitions
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Member Participation</span>
                      <span className="text-sm text-success font-semibold">+47% increase</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div className="bg-gradient-primary h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  
                  <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Competition Management</span>
                      <span className="text-sm text-primary font-semibold">Automated</span>
                    </div>
                    <div className="flex items-center mt-2 gap-2">
                      <Trophy className="w-4 h-4 text-secondary" />
                      <span className="text-xs text-muted-foreground">Setup, tracking, verification & payouts</span>
                    </div>
                  </div>
                  
                  <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Marketing Support</span>
                      <span className="text-sm text-accent font-semibold">Included</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Social media assets, promotional materials, and event marketing
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Success Stories Teaser */}
      <Section spacing="xl">
        <Container>
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              Be Part of Golf's Next Evolution
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
              Join the growing network of forward-thinking golf clubs who are ready to 
              transform their member experience and create legendary moments.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">✓</div>
                <div className="text-sm text-muted-foreground">Fully Insured Platform</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary mb-2">✓</div>
                <div className="text-sm text-muted-foreground">Professional Verification</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent mb-2">✓</div>
                <div className="text-sm text-muted-foreground">Complete Support</div>
              </div>
            </div>
            <Button 
              asChild 
              size="lg"
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Link to="/partnership">Learn More</Link>
            </Button>
          </div>
        </Container>
      </Section>

      {/* Final CTA */}
      <Section spacing="xl" className="bg-gradient-primary">
        <Container>
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Transform Your Club?
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              Join the network of forward-thinking golf clubs creating legendary experiences for their members.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                size="lg"
                variant="secondary"
                className="bg-background text-foreground hover:bg-background/90"
              >
                <Link to="/partnership">Start Partnership Application</Link>
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
};

export default ClubPartnerSection;