import { Link } from "react-router-dom";
import { Hero, HeroTitle, HeroSubtitle, HeroActions } from "@/components/ui/hero";
import { Button } from "@/components/ui/button";
import Section from "@/components/layout/Section";
import FeatureItem from "@/components/ui/feature-item";
import StatsCard from "@/components/ui/stats-card";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import { Users, Calendar, Trophy, BarChart3, Shield, Zap } from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <Hero>
          <HeroTitle>
            Transform Your Sports Club Management
          </HeroTitle>
          <HeroSubtitle>
            Streamline operations, engage members, and grow your sporting community 
            with our comprehensive club management platform.
          </HeroSubtitle>
          <HeroActions>
            <Button 
              size="lg" 
              asChild
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
            >
              <Link to="/clubs/signup">Start Your Free Trial</Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              asChild
              className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/players/login">Player Login</Link>
            </Button>
          </HeroActions>
        </Hero>

        {/* Stats Section */}
        <Section spacing="lg" background="muted">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              Trusted by Sports Clubs Worldwide
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join thousands of clubs already using SportSync to manage their operations efficiently.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatsCard
              title="Active Clubs"
              value="2,500+"
              description="Sports clubs using our platform"
              icon={Trophy}
              trend={{ value: 15, isPositive: true }}
            />
            <StatsCard
              title="Members Managed"
              value="150K+"
              description="Athletes and club members"
              icon={Users}
              trend={{ value: 23, isPositive: true }}
            />
            <StatsCard
              title="Events Organized"
              value="50K+"
              description="Competitions and training sessions"
              icon={Calendar}
              trend={{ value: 31, isPositive: true }}
            />
          </div>
        </Section>

        {/* Features Section */}
        <Section spacing="xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Manage Your Club
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              From member management to event organization, our platform provides 
              all the tools you need to run a successful sports club.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureItem
              variant="card"
              icon={Users}
              title="Member Management"
              description="Easily manage member profiles, subscriptions, and communication in one centralized platform."
            />
            <FeatureItem
              variant="card"
              icon={Calendar}
              title="Event Scheduling"
              description="Schedule training sessions, competitions, and club events with automated notifications."
            />
            <FeatureItem
              variant="card"
              icon={BarChart3}
              title="Performance Analytics"
              description="Track member progress, attendance, and club performance with detailed analytics and reports."
            />
            <FeatureItem
              variant="card"
              icon={Shield}
              title="Secure Platform"
              description="Bank-level security ensures your club and member data is always protected and compliant."
            />
            <FeatureItem
              variant="card"
              icon={Zap}
              title="Mobile Ready"
              description="Access your club management tools anywhere with our responsive web platform."
            />
            <FeatureItem
              variant="card"
              icon={Trophy}
              title="Competition Tools"
              description="Organize tournaments, track scores, and manage competition brackets effortlessly."
            />
          </div>
        </Section>

        {/* CTA Section */}
        <Section spacing="xl" background="primary" className="text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-primary-foreground mb-6">
              Ready to Transform Your Club?
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-8">
              Join thousands of clubs already using SportSync. Start your free trial today 
              and experience the difference professional management makes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                asChild
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
              >
                <Link to="/clubs/signup">Start Free Trial</Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                asChild
                className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/players/login">I'm a Player</Link>
              </Button>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Home;