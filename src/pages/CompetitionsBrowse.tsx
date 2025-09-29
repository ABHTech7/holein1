import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import { Hero, HeroTitle, HeroSubtitle } from "@/components/ui/hero";
import { Trophy, PoundSterling, MapPin, Calendar, ArrowLeft, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/formatters";
import { createClubSlug, createCompetitionSlug, generateCompetitionEntryUrlSync } from "@/lib/competitionUtils";

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

const CompetitionsBrowse = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    try {
      // Fetch all active competitions without demo filtering
      const { data: competitionsData, error: competitionsError } = await supabase
        .rpc('get_public_competition_data');

      if (competitionsError) throw competitionsError;

      // Transform data to match our interface (using snake_case to match Competition type)
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
            website: null
          }
        }));

      // Sort by start date
      const sortedCompetitions = transformedCompetitions
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

      setCompetitions(sortedCompetitions);
    } catch (error: any) {
      console.error('Error loading competitions:', error);
      toast({
        title: "Error loading competitions",
        description: "Unable to load competitions. Please try again.",
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

  const getDashboardRoute = () => {
    if (!profile) return "/";
    switch (profile.role) {
      case 'SUPER_ADMIN':
      case 'ADMIN': 
        return "/dashboard/admin";
      case 'CLUB': 
        return "/dashboard/club";
      case 'PLAYER': 
        return "/players/entries";
      default: 
        return "/";
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Hero>
          <Container>
            <div className="text-center">
              <HeroTitle>Browse Competitions</HeroTitle>
              <HeroSubtitle className="max-w-2xl mx-auto">
                Discover exciting golf challenges and competitions near you
              </HeroSubtitle>
              
              <div className="flex justify-center mt-8">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(getDashboardRoute())}
                  className="flex items-center gap-2"
                  data-testid="back-to-dashboard-btn"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </Container>
        </Hero>

        <Section spacing="lg">
          <Container>
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full mb-4" />
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : competitions.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No Active Competitions</h3>
                <p className="text-muted-foreground mb-6">
                  Check back soon for new competitions to join
                </p>
                <Button asChild>
                  <Link to={getDashboardRoute()}>Back to Dashboard</Link>
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {competitions.map((competition) => (
                  <Card key={competition.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{competition.name}</CardTitle>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-1" />
                        {competition.clubs.name}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {competition.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {competition.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          <PoundSterling className="w-4 h-4 mr-1" />
                          <span className="font-medium">{formatCurrency(competition.entry_fee)}</span>
                        </div>
                        {competition.prize_pool && (
                          <Badge variant="secondary">
                            Prize: {formatCurrency(competition.prize_pool)}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Trophy className="w-4 h-4 mr-1" />
                         Hole {competition.hole_number}
                        </div>
                        {competition.is_year_round ? (
                          <Badge variant="outline">Year-round</Badge>
                        ) : (
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>Until {formatDateTime(competition.end_date || competition.start_date)}</span>
                          </div>
                        )}
                      </div>

                      <Button asChild className="w-full">
                        <Link to={generateCompetitionEntryUrlSync(
                          createClubSlug(competition.clubs.name),
                          createCompetitionSlug(competition.name)
                        )}>
                          Enter Competition
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default CompetitionsBrowse;