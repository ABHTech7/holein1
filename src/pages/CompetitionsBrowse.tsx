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
      const { data, error } = await supabase
        .from('competitions')
        .select(`
          id,
          name,
          description,
          entry_fee,
          prize_pool,
          hole_number,
          start_date,
          end_date,
          is_year_round,
          hero_image_url,
          clubs:clubs(
            id,
            name,
            website
          )
        `)
        .eq('status', 'ACTIVE')
        .eq('archived', false)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setCompetitions(data || []);
    } catch (error: any) {
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
      case 'ADMIN': return "/dashboard/admin";
      case 'CLUB': return "/dashboard/club";
      case 'PLAYER': return "/players/entries";
      default: return "/";
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
                        <Link to={`/competitions/${competition.id}`}>
                          View Details
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