import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";
import { Hero, HeroTitle, HeroSubtitle, HeroActions } from "@/components/ui/hero";
import FeatureItem from "@/components/ui/feature-item";
import { Trophy, Target, Users, TrendingUp, BarChart3, Shield } from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main>
        {/* Hero Section */}
        <Hero variant="image" backgroundImage="/img/hero-club.jpg">
          <HeroTitle>One shot. One chance. Your club remembered.</HeroTitle>
          <HeroSubtitle>
            Bring the thrill of golf's greatest shot to your course.
          </HeroSubtitle>
          <HeroActions>
            <Button 
              asChild 
              size="lg"
              className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold"
            >
              <Link to="/partnership">Partner with Us</Link>
            </Button>
          </HeroActions>
        </Hero>

        {/* About Section */}
        <Section spacing="xl" className="bg-muted/30">
          <Container>
            <div className="text-center max-w-4xl mx-auto">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                Where Dreams Meet Reality
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Founded by two lifelong golf enthusiasts, Hole in 1 Challenge gives clubs a fresh way to 
                excite members, attract new players, and unlock new revenue — all powered by smart technology 
                and insured peace of mind.
              </p>
            </div>
          </Container>
        </Section>

        {/* Benefits Grid Section */}
        <Section spacing="xl">
          <Container>
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Golf Clubs Choose Us
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Four pillars of excellence that transform your course into a destination
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureItem
                icon={Trophy}
                title="Prestige & Excitement"
                description="Make your club the place where legends are made."
              />
              <FeatureItem
                icon={TrendingUp}
                title="New Revenue"
                description="Generate income with every entry."
              />
              <FeatureItem
                icon={Users}
                title="Member Engagement"
                description="Give golfers a reason to keep coming back."
              />
              <FeatureItem
                icon={BarChart3}
                title="Smart Tech"
                description="Real-time reporting, dashboards, and marketing insights."
              />
            </div>
          </Container>
        </Section>

        {/* Technology Highlight Section */}
        <Section spacing="xl" className="bg-muted/30">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Reporting & Insights, made simple.
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Live venue tracking, performance insights, and marketing data to grow your club.
                </p>
                <Button 
                  asChild 
                  size="lg"
                  className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold"
                >
                  <Link to="/partnership">See It In Action</Link>
                </Button>
              </div>
              <div className="relative">
                <img 
                  src="/img/mock-dashboard.jpg" 
                  alt="Reporting dashboard with cards and charts"
                  className="rounded-xl shadow-elegant w-full"
                  loading="lazy"
                />
              </div>
            </div>
          </Container>
        </Section>

        {/* Trust Strip Section */}
        <Section spacing="lg" className="border-t border-border/40">
          <Container>
            <div className="text-center mb-8">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-6">
                Trusted by Golf Clubs Worldwide
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6 items-center">
                <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground font-semibold">Pine Valley GC</span>
                </div>
                <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground font-semibold">Oak Ridge CC</span>
                </div>
                <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground font-semibold">Highland Golf</span>
                </div>
                <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground font-semibold">Meadowbrook</span>
                </div>
                <div className="flex items-center justify-center p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-accent" />
                    <span className="text-accent font-semibold">Insured</span>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </Section>

        {/* Final CTA Banner */}
        <Section spacing="xl" className="bg-gradient-primary">
          <Container>
            <div className="text-center">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Turn every round into a moment worth remembering.
              </h2>
              <p className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
                Join the network of forward-thinking golf clubs creating legendary experiences for their members.
              </p>
              <Button 
                asChild 
                size="lg"
                variant="secondary"
                className="bg-background text-foreground hover:bg-background/90"
              >
                <Link to="/partnership">Sign Up Your Club Today</Link>
              </Button>
            </div>
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Home;