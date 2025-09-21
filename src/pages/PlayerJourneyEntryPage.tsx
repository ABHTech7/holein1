import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { ClubService } from "@/lib/clubService";
import { createClubSlug, createCompetitionSlug } from "@/lib/competitionUtils";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/layout/Container";
import PlayerJourneyEntryForm from "@/components/entry/PlayerJourneyEntryForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";

interface VenueCompetition {
  id: string;
  name: string;
  description: string | null;
  entry_fee: number;
  prize_pool: number | null;
  hole_number: number;
  status: string;
  club_name: string;
  club_id: string;
  hero_image_url: string | null;
}

const PlayerJourneyEntryPage = () => {
  const { clubSlug, competitionSlug } = useParams<{
    clubSlug: string;
    competitionSlug: string;
  }>();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<VenueCompetition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompetition = async () => {
      if (!clubSlug || !competitionSlug) {
        console.error('Missing required params', { clubSlug, competitionSlug });
        return;
      }

      try {
        // Get all clubs safely (works for unauthenticated users)
        const clubs = await ClubService.getSafeClubsData();

        if (!clubs || clubs.length === 0) {
          console.error('No clubs found');
          toast({
            title: "Error loading clubs",
            description: "Something went wrong. Please try again.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        // Find the venue (club) by matching the slug
        const venue = clubs.find(club => createClubSlug(club.name) === clubSlug);

        if (!venue) {
          console.error('Club not found for slug:', clubSlug);
          toast({
            title: "Venue not found",
            description: "The venue you're looking for doesn't exist.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        // Use the safe competition data function with the specific competition slug
        const competitions = await ClubService.getSafeCompetitionData(venue.id, competitionSlug);

        if (!competitions || competitions.length === 0) {
          console.error('No active competition found for club:', venue.name, 'and slug:', competitionSlug);
          toast({
            title: "Competition Not Found",
            description: `The competition "${competitionSlug}" was not found at ${venue.name}.`,
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        // The database function should now return exactly the competition we want
        const selectedCompetition = competitions[0];
        
        // Build the competition object (data already includes club info from the safe function)
        const competitionWithClub = {
          id: selectedCompetition.id,
          name: selectedCompetition.name,
          description: selectedCompetition.description,
          entry_fee: selectedCompetition.entry_fee || 0,
          prize_pool: selectedCompetition.prize_pool || 0,
          hole_number: selectedCompetition.hole_number,
          status: selectedCompetition.status,
          club_name: selectedCompetition.club_name,
          club_id: selectedCompetition.club_id,
          hero_image_url: selectedCompetition.hero_image_url,
        };
        
        setCompetition(competitionWithClub);

      } catch (error) {
        console.error('Error fetching competition:', error);
        toast({
          title: "Error loading competition",
          description: "Something went wrong. Please try again.",
          variant: "destructive"
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchCompetition();
  }, [clubSlug, competitionSlug, navigate]);

  const handleSuccess = (entryId: string, playerData: any) => {
    navigate(`/entry-success/${entryId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading competition...</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center p-8">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Competition Not Found</h2>
              <p className="text-muted-foreground mb-4">
                No active competition found for this venue and hole.
              </p>
              <button 
                onClick={() => navigate('/')}
                className="text-primary hover:underline"
              >
                Return Home
              </button>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      
      <main className="flex-1 py-12">
        <Container>
          <div className="max-w-2xl mx-auto">
            {/* Back Button */}
            <div className="flex justify-start mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">{competition.name}</h1>
              <p className="text-xl text-muted-foreground">at {competition.club_name}</p>
            </div>
            
            <PlayerJourneyEntryForm 
              competition={competition}
              onSuccess={handleSuccess}
            />
          </div>
        </Container>
      </main>

      <SiteFooter />
    </div>
  );
};

export default PlayerJourneyEntryPage;