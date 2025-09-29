import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";
import { Hero, HeroTitle, HeroSubtitle, HeroActions } from "@/components/ui/hero";
import FeatureItem from "@/components/ui/feature-item";
import { Target, Trophy, Smartphone, MapPin, Star, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createSlug } from "@/lib/slugUtils";
import { toast } from "@/hooks/use-toast";
import { resolvePublicUrl, withCacheBuster } from "@/lib/imageUtils";
import { showSupabaseError } from "@/lib/showSupabaseError";

interface Competition {
  id: string;
  name: string;
  description: string | null;
  entry_fee: number;
  prize_pool: number | null;
  hole_number: number;
  start_date: string;
  end_date: string | null;
  is_year_round: boolean;
  hero_image_url: string | null;
  clubs: {
    id: string;
    name: string;
    website: string | null;
  };
}

const PlayerExcitementSection = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    try {
      // Fetch all public competitions
      const { data: competitionsData, error: competitionsError } = await supabase
        .rpc('get_public_competition_data', {
          p_club_id: null,
          p_competition_slug: null
        });

      if (competitionsError) {
        const errorMsg = showSupabaseError(competitionsError, 'fetching competitions');
        throw new Error(errorMsg);
      }

      // Transform data to match our interface
      const transformedCompetitions = (competitionsData || [])
        .map(comp => ({
          id: comp.id,
          name: comp.name,
          description: comp.description,
          entry_fee: comp.entry_fee,
          prize_pool: comp.prize_pool,
          hole_number: comp.hole_number,
          start_date: comp.start_date,
          end_date: comp.end_date,
          is_year_round: comp.is_year_round,
          hero_image_url: comp.hero_image_url,
          clubs: {
            id: comp.club_id,
            name: comp.club_name,
            website: null // Not returned by the new RPC
          }
        }));

      // Sort by start date and limit to 3
      const sortedCompetitions = transformedCompetitions
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
        .slice(0, 3);

      setCompetitions(sortedCompetitions);
    } catch (error: any) {
      console.error('Error loading competitions:', error);
      const errorMessage = error?.message || 'Unable to load competitions. Please try again.';
      toast({
        title: "Error loading competitions",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount / 100);
  };

  const getCompetitionUrl = (competition: Competition) => {
    const clubSlug = createSlug(competition.clubs.name);
    const competitionSlug = createSlug(competition.name);
    return `/competition/${clubSlug}/${competitionSlug}`;
  };
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
            {loading ? (
              // Loading skeletons
              [...Array(3)].map((_, i) => (
                <div key={i} className="bg-card rounded-xl p-6 shadow-soft">
                  <div className="flex items-center gap-3 mb-4">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              ))
            ) : competitions.length === 0 ? (
              // No competitions message
              <div className="col-span-full text-center py-12">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No Active Competitions</h3>
                <p className="text-muted-foreground mb-6">
                  Check back soon for new competitions to join
                </p>
                <Button asChild>
                  <Link to="/competitions">Browse All Competitions</Link>
                </Button>
              </div>
            ) : (
              // Real competition cards
              competitions.map((competition, index) => {
                const iconBackgrounds = ['bg-gradient-primary', 'bg-gradient-gold', 'bg-gradient-primary'];
                const iconComponents = [Trophy, Star, Target];
                const IconComponent = iconComponents[index % 3];
                
                // Get hero image URL with proper handling
                const heroImageUrl = competition.hero_image_url ? 
                  withCacheBuster(resolvePublicUrl(competition.hero_image_url) || '', competition.id) : 
                  null;
                
                return (
                  <div key={competition.id} className="bg-card rounded-xl overflow-hidden shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
                    {/* Hero Image */}
                    <div className="relative h-48 bg-muted/30">
                      {heroImageUrl ? (
                        <img 
                          src={heroImageUrl}
                          alt={`${competition.name} at ${competition.clubs.name}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to icon on error
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`absolute inset-0 flex items-center justify-center ${heroImageUrl ? 'hidden' : ''}`}>
                        <div className={`w-16 h-16 ${iconBackgrounds[index % 3]} rounded-xl flex items-center justify-center`}>
                          <IconComponent className="w-8 h-8 text-primary-foreground" />
                        </div>
                      </div>
                      {/* Gradient overlay for better text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Competition title overlay */}
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="font-display font-bold text-white text-lg mb-1">{competition.name}</h3>
                        <p className="text-white/90 text-sm">{competition.clubs.name}</p>
                      </div>
                    </div>
                    
                    {/* Card Content */}
                    <div className="p-6">
                      <div className="space-y-2 mb-4">
                        {competition.prize_pool && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Prize Pool:</span>
                            <span className="font-semibold text-secondary">{formatCurrency(competition.prize_pool)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Entry Fee:</span>
                          <span className="font-semibold text-foreground">{formatCurrency(competition.entry_fee)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Hole:</span>
                          <span className="font-semibold text-foreground">{competition.hole_number}th Par 3</span>
                        </div>
                      </div>
                      <Button asChild className="w-full bg-gradient-primary hover:opacity-90">
                        <Link to={getCompetitionUrl(competition)}>
                          Enter Competition
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
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