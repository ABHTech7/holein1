import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import useAuth from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/layout/Container";
import { EntryHero } from "@/components/entry/EntryHero";
import { TrustBanner } from "@/components/entry/TrustBanner";
import { RuleSummary } from "@/components/entry/RuleSummary";
import { EnterNowCTA } from "@/components/entry/EnterNowCTA";
import { AuthModal } from "@/components/entry/AuthModal";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Clock } from "lucide-react";

interface VenueCompetition {
  id: string;
  name: string;
  description: string | null;
  entry_fee: number;
  prize_pool: number | null;
  hole_number: number;
  status: string;
  club_name: string;
  venue_name: string;
  venue_slug: string;
}

const EntryPageNew = () => {
  const { venueSlug, holeNumber } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [competition, setCompetition] = useState<VenueCompetition | null>(null);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null);

  useEffect(() => {
    const fetchCompetition = async () => {
      if (!venueSlug || !holeNumber) return;

      try {
        // First get the venue
        const { data: venue, error: venueError } = await supabase
          .from('venues')
          .select(`
            id,
            name,
            slug,
            club_id,
            clubs (name)
          `)
          .eq('slug', venueSlug)
          .single();

        if (venueError || !venue) {
          toast({
            title: "Venue not found",
            description: "The venue you're looking for doesn't exist.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        // Then get the competition for this venue and hole
        const { data: competitions, error: compError } = await supabase
          .from('competitions')
          .select('*')
          .eq('club_id', venue.club_id)
          .eq('hole_number', parseInt(holeNumber))
          .eq('archived', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (compError || !competitions || competitions.length === 0) {
          toast({
            title: "Competition not found",
            description: `No active competition found for hole ${holeNumber} at ${venue.name}.`,
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        const comp = competitions[0];
        setCompetition({
          id: comp.id,
          name: comp.name,
          description: comp.description,
          entry_fee: comp.entry_fee || 0,
          prize_pool: comp.prize_pool,
          hole_number: comp.hole_number,
          status: comp.status,
          club_name: venue.clubs.name,
          venue_name: venue.name,
          venue_slug: venue.slug
        });

        // Check for cooldown if user is logged in
        if (user) {
          await checkCooldown(user.id, comp.id);
        }

      } catch (error) {
        console.error('Error fetching competition:', error);
        toast({
          title: "Error loading competition",
          description: "Something went wrong. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCompetition();
  }, [venueSlug, holeNumber, navigate, user]);

  const checkCooldown = async (userId: string, competitionId: string) => {
    const { data: recentEntries, error } = await supabase
      .from('entries')
      .select('entry_date')
      .eq('player_id', userId)
      .eq('competition_id', competitionId)
      .eq('paid', true)
      .gte('entry_date', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
      .order('entry_date', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error checking cooldown:', error);
      return;
    }

    if (recentEntries && recentEntries.length > 0) {
      const lastEntry = new Date(recentEntries[0].entry_date);
      const cooldownEnd = new Date(lastEntry.getTime() + 12 * 60 * 60 * 1000);
      
      if (cooldownEnd > new Date()) {
        setCooldownEnd(cooldownEnd);
      }
    }
  };

  const handleEnterNow = () => {
    if (!user) {
      setAuthModalOpen(true);
    } else {
      // Proceed with entry
      handleEntry(user.id);
    }
  };

  const handleEntry = async (userId: string) => {
    if (!competition) return;

    if (cooldownEnd && cooldownEnd > new Date()) {
      toast({
        title: "Cooldown active",
        description: `You must wait until ${cooldownEnd.toLocaleTimeString()} before entering again.`,
        variant: "destructive"
      });
      return;
    }

    setEntering(true);

    try {
      // Create entry with payment pending
      const { data: entry, error: entryError } = await supabase
        .from('entries')
        .insert({
          competition_id: competition.id,
          player_id: userId,
          paid: false,
          amount_minor: competition.entry_fee,
          terms_version: "1.0",
          terms_accepted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (entryError) {
        throw entryError;
      }

      // TODO: Integrate with Stripe payment
      // For now, redirect to confirmation
      toast({
        title: "Entry created!",
        description: "Your entry has been created. Payment integration coming soon.",
      });

      // Navigate to confirmation (we'll create this route)
      navigate(`/entry/${entry.id}/confirmation`);

    } catch (error: any) {
      console.error('Entry error:', error);
      toast({
        title: "Entry failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setEntering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
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

  const isCooldownActive = cooldownEnd && cooldownEnd > new Date();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <EntryHero
          holeName={competition.name}
          holeNumber={competition.hole_number}
          prize={competition.prize_pool || 0}
          entryFee={competition.entry_fee}
          venueName={competition.venue_name}
        />

        <div className="py-12">
          <Container>
            <div className="max-w-2xl mx-auto space-y-8">
              {/* Trust Banner */}
              <TrustBanner />

              {/* Rules Summary */}
              <RuleSummary />

              {/* Cooldown Warning */}
              {isCooldownActive && (
                <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200">
                          Cooldown Active
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          You can enter again at {cooldownEnd.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Enter Now CTA */}
              <EnterNowCTA
                onClick={handleEnterNow}
                disabled={isCooldownActive || entering}
                loading={entering}
                entryFee={competition.entry_fee}
              />
            </div>
          </Container>
        </div>
      </main>

      <SiteFooter />

      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={handleEntry}
      />
    </div>
  );
};

export default EntryPageNew;