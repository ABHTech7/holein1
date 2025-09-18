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
                Founded by two lifelong golf enthusiasts, Official Hole In 1 gives clubs a fresh way to 
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
                  Real-time insights that drive results.
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Track performance, engage members, and maximize revenue with intelligent analytics and automated reporting.
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
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-8 shadow-elegant">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">Revenue</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">£12,450</div>
                      <div className="text-xs text-green-600">+24% this month</div>
                    </div>
                    <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-secondary" />
                        <span className="text-sm font-medium text-muted-foreground">Entries</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">1,247</div>
                      <div className="text-xs text-blue-600">Active today</div>
                    </div>
                    <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-accent" />
                        <span className="text-sm font-medium text-muted-foreground">Players</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">892</div>
                      <div className="text-xs text-purple-600">This week</div>
                    </div>
                    <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium text-muted-foreground">Wins</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">23</div>
                      <div className="text-xs text-yellow-600">Verified</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Live Analytics</span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">Real-time</span>
                      </div>
                    </div>
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