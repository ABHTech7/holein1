import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import { Hero, HeroTitle, HeroSubtitle } from "@/components/ui/hero";
import { Trophy, PoundSterling, MapPin, Clock, ArrowLeft, Search, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/formatters";
import { createClubSlug, createCompetitionSlug, generateCompetitionEntryUrlSync } from "@/lib/competitionUtils";
import { ROUTES, getDashboardRoute as getRouteDashboard } from "@/routes";

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
  is_highlighted: boolean;
  hero_image_url: string | null;
  clubs: {
    id: string;
    name: string;
    website: string | null;
  };
}

const CompetitionsBrowseNew = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    try {
      const { data: competitionsData, error: competitionsError } = await supabase
        .rpc('get_public_competition_data');

      if (competitionsError) throw competitionsError;

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
          is_highlighted: false, // Will be added to RPC in future
          hero_image_url: comp.hero_image_url,
          clubs: {
            id: comp.club_id,
            name: comp.club_name,
            website: null
          }
        }))
        .sort((a, b) => {
          // Highlighted first
          if (a.is_highlighted !== b.is_highlighted) {
            return a.is_highlighted ? -1 : 1;
          }
          // Then by start date
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        });

      setCompetitions(transformedCompetitions);
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
        return ROUTES.ADMIN.DASHBOARD;
      case 'CLUB':
        return ROUTES.CLUB.DASHBOARD;
      case 'PLAYER':
        return ROUTES.PLAYER.DASHBOARD;
      case 'INSURANCE_PARTNER':
        return ROUTES.INSURANCE.DASHBOARD;
      default:
        return ROUTES.HOME;
    }
  };

  const filteredCompetitions = competitions.filter(comp =>
    comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comp.clubs.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (comp.description && comp.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const highlightedCompetitions = filteredCompetitions.filter(c => c.is_highlighted);
  const regularCompetitions = filteredCompetitions.filter(c => !c.is_highlighted);

  const CompetitionCard = ({ competition }: { competition: Competition }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{competition.name}</CardTitle>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              {competition.clubs.name}
            </div>
          </div>
          {competition.is_highlighted && (
            <Badge variant="default" className="ml-2">
              <Star className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {competition.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {competition.description}
          </p>
        )}
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center">
            <PoundSterling className="w-4 h-4 mr-1" />
            <span className="font-medium">{formatCurrency(competition.entry_fee)}</span>
          </div>
          <div className="flex items-center">
            <Trophy className="w-4 h-4 mr-1" />
            Hole {competition.hole_number}
          </div>
        </div>

        {competition.prize_pool && (
          <Badge variant="secondary" className="w-full justify-center">
            Prize: {formatCurrency(competition.prize_pool)}
          </Badge>
        )}

        {!competition.is_year_round && competition.end_date && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="w-3 h-3 mr-1" />
            Until {formatDateTime(competition.end_date)}
          </div>
        )}

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
  );

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Hero>
          <Container>
            <div className="text-center">
              <HeroTitle>Browse Competitions</HeroTitle>
              <HeroSubtitle className="max-w-2xl mx-auto">
                Discover exciting golf challenges and competitions
              </HeroSubtitle>
              
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
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
            {/* Search Bar */}
            <div className="max-w-md mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search competitions or clubs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-8">
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
              </div>
            ) : filteredCompetitions.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">
                  {searchTerm ? "No competitions found" : "No Active Competitions"}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm 
                    ? "Try adjusting your search" 
                    : "Check back soon for new competitions to join"}
                </p>
                {searchTerm && (
                  <Button onClick={() => setSearchTerm("")}>Clear Search</Button>
                )}
              </div>
            ) : (
              <div className="space-y-12">
                {/* Featured Competitions */}
                {highlightedCompetitions.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                      <Star className="w-6 h-6 text-primary" />
                      Featured Competitions
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {highlightedCompetitions.map((competition) => (
                        <CompetitionCard key={competition.id} competition={competition} />
                      ))}
                    </div>
                  </div>
                )}

                {/* All Competitions */}
                {regularCompetitions.length > 0 && (
                  <div>
                    {highlightedCompetitions.length > 0 && (
                      <h2 className="text-2xl font-bold mb-6">All Competitions</h2>
                    )}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {regularCompetitions.map((competition) => (
                        <CompetitionCard key={competition.id} competition={competition} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default CompetitionsBrowseNew;
