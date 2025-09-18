import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";
import { Hero, HeroTitle, HeroSubtitle, HeroActions } from "@/components/ui/hero";
import FeatureItem from "@/components/ui/feature-item";
import { Target, Trophy, Smartphone, MapPin, Star, Camera } from "lucide-react";

const PlayerExcitementSection = () => {
  return (
    <div className="animate-fade-in">
      {/* Player-Focused Hero */}
      <Hero variant="image" backgroundImage="/img/entry-hero.jpg">
        <HeroTitle>Your Shot at Golfing Glory Awaits</HeroTitle>
        <HeroSubtitle>
          Step up to legendary holes across the country. One perfect shot could change everything. 
          Are you ready to make history?
        </HeroSubtitle>
        <HeroActions>
          <Button 
            asChild 
            size="lg"
            className="bg-gradient-gold hover:opacity-90 text-secondary-foreground font-semibold btn-glow"
          >
            <Link to="/competitions">Find Competitions</Link>
          </Button>
        </HeroActions>
      </Hero>

      {/* What Makes It Special */}
      <Section spacing="xl">
        <Container>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              The Ultimate Hole-in-One Experience
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every shot is verified, every win is celebrated, and every moment is legendary
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureItem
              icon={Target}
              title="Perfect Shots"
              description="Step up to specially selected holes designed for glory."
            />
            <FeatureItem
              icon={Trophy}
              title="Real Prizes"
              description="Win genuine rewards from £500 to £10,000+ jackpots."
            />
            <FeatureItem
              icon={Camera}
              title="Verified Wins"
              description="Every hole-in-one is captured and professionally verified."
            />
            <FeatureItem
              icon={Star}
              title="Hall of Fame"
              description="Join the exclusive club of legendary shot makers."
            />
          </div>
        </Container>
      </Section>

      {/* How It Works */}
      <Section spacing="xl" className="bg-muted/30">
        <Container>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Three Simple Steps to Glory
            </h2>
            <p className="text-lg text-muted-foreground">
              From entry to celebration - we've made it effortless
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-4">
                1. Find Your Challenge
              </h3>
              <p className="text-muted-foreground">
                Browse active competitions at golf clubs near you. Each hole is carefully selected 
                for that perfect shot opportunity.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-gold rounded-full flex items-center justify-center mx-auto mb-6">
                <Smartphone className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-4">
                2. Take Your Shot
              </h3>
              <p className="text-muted-foreground">
                Enter the competition, capture your attempt with our app, and let the magic happen. 
                Every swing is recorded for verification.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-4">
                3. Claim Your Glory
              </h3>
              <p className="text-muted-foreground">
                Hit that perfect shot? We verify it professionally and celebrate your achievement. 
                Prizes are processed instantly.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Current Competitions Highlight */}
      <Section spacing="xl">
        <Container>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Active Competitions This Week
            </h2>
            <p className="text-lg text-muted-foreground">
              Don't miss these exciting opportunities to make your mark
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground">Championship Series</h3>
                  <p className="text-sm text-muted-foreground">Premium Golf Club</p>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prize Pool:</span>
                  <span className="font-semibold text-secondary">£5,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hole:</span>
                  <span className="font-semibold text-foreground">7th Par 3</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Distance:</span>
                  <span className="font-semibold text-foreground">165 yards</span>
                </div>
              </div>
              <Button className="w-full bg-gradient-primary hover:opacity-90">
                Enter Competition
              </Button>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-gold rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground">Weekend Challenge</h3>
                  <p className="text-sm text-muted-foreground">Riverside Golf Course</p>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prize Pool:</span>
                  <span className="font-semibold text-secondary">£2,500</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hole:</span>
                  <span className="font-semibold text-foreground">12th Par 3</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Distance:</span>
                  <span className="font-semibold text-foreground">142 yards</span>
                </div>
              </div>
              <Button className="w-full bg-gradient-gold hover:opacity-90 text-secondary-foreground">
                Enter Competition
              </Button>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground">Daily Special</h3>
                  <p className="text-sm text-muted-foreground">Green Valley Club</p>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prize Pool:</span>
                  <span className="font-semibold text-secondary">£1,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hole:</span>
                  <span className="font-semibold text-foreground">3rd Par 3</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Distance:</span>
                  <span className="font-semibold text-foreground">128 yards</span>
                </div>
              </div>
              <Button className="w-full bg-gradient-primary hover:opacity-90">
                Enter Competition
              </Button>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button 
              asChild 
              size="lg"
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Link to="/competitions">View All Competitions</Link>
            </Button>
          </div>
        </Container>
      </Section>

      {/* Success Stories */}
      <Section spacing="xl" className="bg-muted/30">
        <Container>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Legends Are Made Here
            </h2>
            <p className="text-lg text-muted-foreground">
              Real players, real shots, real celebrations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card rounded-xl p-8 shadow-soft">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-gold rounded-full flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground">Sarah M.</h3>
                  <p className="text-sm text-muted-foreground">Amateur Golfer</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                "I never thought I'd hit a hole-in-one, let alone win £5,000 doing it! 
                The whole experience was incredible - from the moment the ball left my club 
                to celebrating with everyone at the clubhouse."
              </p>
              <div className="flex items-center gap-2 text-secondary font-semibold">
                <Trophy className="w-4 h-4" />
                <span>£5,000 Winner</span>
              </div>
            </div>

            <div className="bg-card rounded-xl p-8 shadow-soft">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground">James R.</h3>
                  <p className="text-sm text-muted-foreground">Club Member</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                "Been playing golf for 20 years and finally got my ace! The verification 
                process was seamless, and having it professionally recorded made it even 
                more special. Best £2,500 I've ever earned!"
              </p>
              <div className="flex items-center gap-2 text-secondary font-semibold">
                <Trophy className="w-4 h-4" />
                <span>£2,500 Winner</span>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Final CTA */}
      <Section spacing="xl" className="bg-gradient-gold">
        <Container>
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-secondary-foreground mb-4">
              Your Perfect Shot Is Waiting
            </h2>
            <p className="text-lg text-secondary-foreground/80 mb-8 max-w-2xl mx-auto">
              Join thousands of golfers who've already discovered the thrill of competitive hole-in-one challenges.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link to="/competitions">Start Playing Today</Link>
              </Button>
              <Button 
                asChild 
                size="lg"
                variant="outline"
                className="border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10"
              >
                <Link to="/player-signup">Create Free Account</Link>
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
};

export default PlayerExcitementSection;