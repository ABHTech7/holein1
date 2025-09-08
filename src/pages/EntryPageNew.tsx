import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import useAuth from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { analytics } from "@/lib/analytics";
import { createClubSlug, createCompetitionSlug } from "@/lib/competitionUtils";
import { ClubService } from "@/lib/clubService";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/layout/Container";
import { EntryHero } from "@/components/entry/EntryHero";
import { TrustBanner } from "@/components/entry/TrustBanner";
import { RuleSummary } from "@/components/entry/RuleSummary";
import { EnterNowCTA } from "@/components/entry/EnterNowCTA";
import { ImprovedAuthModal } from "@/components/entry/ImprovedAuthModal";
import { MiniProfileForm } from "@/components/entry/MiniProfileForm";
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
  club_id: string;
  hero_image_url: string | null;
}

const EntryPageNew = () => {
  console.log('🚀 EntryPageNew component mounting...');
  console.log('🌐 Current URL:', window.location.href);
  console.log('🔗 Current pathname:', window.location.pathname);
  const { clubSlug, competitionSlug } = useParams<{
    clubSlug: string;
    competitionSlug: string;
  }>();
  console.log('📍 Raw URL params:', { clubSlug, competitionSlug });
  console.log('🔍 Route match check - clubSlug exists:', !!clubSlug, 'competitionSlug exists:', !!competitionSlug);
  
  // Add error boundary
  if (!clubSlug || !competitionSlug) {
    console.error('❌ Missing URL parameters');
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center p-8">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invalid URL</h2>
              <p className="text-muted-foreground mb-4">
                This page requires valid club and competition parameters.
              </p>
              <button 
                onClick={() => window.location.href = '/'}
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
  
  const navigate = useNavigate();
  const { user } = useAuth();
  console.log('👤 Current user in EntryPageNew:', user ? { id: user.id, email: user.email } : 'Not logged in');
  const [competition, setCompetition] = useState<VenueCompetition | null>(null);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null);

  useEffect(() => {
    const fetchCompetition = async () => {
      console.log('🔍 EntryPageNew: Route params received:', { clubSlug, competitionSlug });
      
      if (!clubSlug || !competitionSlug) {
        console.error('❌ Missing required params', { clubSlug, competitionSlug });
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
        console.log('🏌️ Looking for club with slug:', clubSlug);
        console.log('🏌️ Available clubs:', clubs.map(c => ({ name: c.name, slug: createClubSlug(c.name) })));

        if (!venue) {
          console.error('❌ Club not found for slug:', clubSlug);
          toast({
            title: "Venue not found",
            description: "The venue you're looking for doesn't exist.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        console.log('✅ Found venue:', venue.name);

        // Use the safe competition data function with the specific competition slug
        const competitions = await ClubService.getSafeCompetitionData(venue.id, competitionSlug);
        console.log('📊 Got competitions via safe function with slug:', competitions.length, 'competitions');

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
        console.log('✅ Found competition:', selectedCompetition.name);
        
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
        
        console.log('🏆 Setting competition:', competitionWithClub);
        setCompetition(competitionWithClub);
        
        // Check cooldown if user is logged in
        if (user) {
          await checkCooldown(user.id, selectedCompetition.id);
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
  }, [clubSlug, competitionSlug, navigate, user]);

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
      // Check if profile is complete
      checkProfileAndProceed();
    }
  };

  const checkProfileAndProceed = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('age_years, handicap, phone_e164')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Check if profile is complete
      if (!profile.age_years || !profile.handicap || !profile.phone_e164) {
        analytics.profileFormShown(user.id);
        setShowProfileForm(true);
      } else {
        // Profile complete, proceed with entry
        handleEntry(user.id);
      }
    } catch (error: any) {
      console.error('Profile check error:', error);
      toast({
        title: "Profile check failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleAuthSuccess = (userId: string) => {
    // After auth success, check profile completeness
    setTimeout(() => {
      checkProfileAndProceed();
    }, 500);
  };

  const handleProfileComplete = () => {
    if (user) {
      analytics.profileCompleted(user.id);
    }
    setShowProfileForm(false);
    if (user) {
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
      // Create entry with proper attempt window
      const now = new Date();
      const attemptWindowEnd = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
      
      const { data: entry, error: entryError } = await supabase
        .from('entries')
        .insert({
          competition_id: competition.id,
          player_id: userId,
          paid: false,
          status: 'pending',
          amount_minor: competition.entry_fee,
          terms_version: "1.0",
          terms_accepted_at: now.toISOString(),
          attempt_window_start: now.toISOString(),
          attempt_window_end: attemptWindowEnd.toISOString()
        })
        .select()
        .single();

      if (entryError) {
        throw entryError;
      }

      // TODO: Integrate with Stripe payment
      // For now, update entry as paid and redirect to confirmation
      const { error: updateError } = await supabase
        .from('entries')
        .update({ 
          paid: true,
          status: 'paid',
          payment_date: now.toISOString()
        })
        .eq('id', entry.id);

      if (updateError) throw updateError;

      toast({
        title: "Entry confirmed!",
        description: "You have 15 minutes to complete your attempt",
      });

      // Navigate to confirmation
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
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading competition...</p>
            {/* Visible debugging info */}
            <div className="text-xs text-muted-foreground/70 max-w-md mx-auto">
              <div className="bg-muted/50 p-2 rounded text-left space-y-1">
                <p><strong>Club slug:</strong> {clubSlug}</p>
                <p><strong>Competition slug:</strong> {competitionSlug}</p>
                <p><strong>Test slug generation:</strong> {createCompetitionSlug('SHRIGLEY HALL - Hole In 1 Challenge')}</p>
              </div>
            </div>
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
          venueName={competition.club_name}
          heroImageUrl={competition.hero_image_url}
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

      {/* Improved Auth Modal with Profile Collection */}
      <ImprovedAuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthSuccess}
        redirectUrl={`/competition/${clubSlug}/${competitionSlug}`}
      />

      {/* Mini Profile Form Modal */}
      {showProfileForm && user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <MiniProfileForm
            userId={user.id}
            userEmail={user.email || ''}
            onComplete={handleProfileComplete}
            onSkip={() => {
              analytics.profileSkipped(user.id);
              setShowProfileForm(false);
              if (user) {
                // Add small delay to ensure state is stable before navigation
                setTimeout(() => handleEntry(user.id), 100);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default EntryPageNew;