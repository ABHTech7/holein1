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
import { EnhancedAuthModal } from "@/components/entry/EnhancedAuthModal";
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
  const params = useParams();
  const venueSlug = params.venueSlug;
  
  // Determine if this is legacy format (numeric) or new format (slug)
  const secondParam = params.param;
  const isNumeric = secondParam && /^\d+$/.test(secondParam);
  
  const holeNumber = isNumeric ? secondParam : undefined;
  const competitionSlug = !isNumeric ? secondParam : undefined;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [competition, setCompetition] = useState<VenueCompetition | null>(null);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null);

  useEffect(() => {
    const fetchCompetition = async () => {
      // Support both new format (competitionSlug) and legacy format (holeNumber)
      if (!venueSlug || (!competitionSlug && !holeNumber)) {
        console.log('🎯 EntryPageNew: Missing required params', { venueSlug, competitionSlug, holeNumber });
        return;
      }

      console.log('🎯 EntryPageNew: Starting competition fetch with params:', { venueSlug, competitionSlug, holeNumber });
      const isLegacyFormat = !competitionSlug && holeNumber;
      console.log('🎯 EntryPageNew: Format detection:', { isLegacyFormat, competitionSlug, holeNumber });

      try {
        // Get all clubs safely (works for unauthenticated users)
        console.log('🎯 EntryPageNew: Fetching clubs data...');
        const clubs = await ClubService.getSafeClubsData();
        console.log('🎯 EntryPageNew: Got clubs:', clubs.length, 'clubs');

        if (!clubs || clubs.length === 0) {
          console.error('🎯 EntryPageNew: No clubs found');
          toast({
            title: "Error loading clubs",
            description: "Something went wrong. Please try again.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        // Debug club slug matching
        console.log('🎯 EntryPageNew: Looking for venue slug:', venueSlug);
        console.log('🎯 EntryPageNew: Available clubs with slugs:', 
          clubs.map(club => ({ 
            id: club.id, 
            name: club.name, 
            slug: createClubSlug(club.name),
            matches: createClubSlug(club.name) === venueSlug
          }))
        );

        // Find the club whose generated slug matches the venueSlug
        const matchingClub = clubs.find(club => createClubSlug(club.name) === venueSlug);

        if (!matchingClub) {
          console.error('🎯 EntryPageNew: No club found with slug:', venueSlug);
          console.error('🎯 EntryPageNew: Available slugs:', clubs.map(c => createClubSlug(c.name)));
          toast({
            title: "Venue not found",
            description: "The venue you're looking for doesn't exist.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        console.log('🎯 EntryPageNew: Found matching club:', matchingClub.name, 'for slug:', venueSlug);

        let foundCompetition = null;
    const now = new Date().toISOString();

        if (isLegacyFormat) {
          // Legacy format: find by hole number
          console.log('Using legacy format - finding by hole number:', holeNumber);
          
          // First try year-round competitions (no end date)
          const { data: yearRoundComps, error: yearRoundError } = await supabase
            .from('competitions')
            .select('*')
            .eq('club_id', matchingClub.id)
            .eq('hole_number', parseInt(holeNumber))
            .eq('archived', false)
            .eq('status', 'ACTIVE')
            .lte('start_date', now)
            .is('end_date', null)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!yearRoundError && yearRoundComps && yearRoundComps.length > 0) {
            foundCompetition = yearRoundComps[0];
            console.log('Found year-round competition:', foundCompetition.name);
          } else {
            // Try time-bounded competitions
            console.log('No year-round competition found, trying time-bounded...');
            const { data: timeBoundedComps, error: timeBoundedError } = await supabase
              .from('competitions')
              .select('*')
              .eq('club_id', matchingClub.id)
              .eq('hole_number', parseInt(holeNumber))
              .eq('archived', false)
              .eq('status', 'ACTIVE')
              .lte('start_date', now)
              .gte('end_date', now)
              .order('created_at', { ascending: false })
              .limit(1);

            if (!timeBoundedError && timeBoundedComps && timeBoundedComps.length > 0) {
              foundCompetition = timeBoundedComps[0];
              console.log('Found time-bounded competition:', foundCompetition.name);
            }
          }
        } else {
          // New format: find by competition slug
          console.log('🎯 EntryPageNew: Using new format - finding by competition slug:', competitionSlug);
          
          // First try year-round competitions (no end date)
          console.log('🎯 EntryPageNew: Searching year-round competitions...');
          const { data: yearRoundComps, error: yearRoundError } = await supabase
            .from('competitions')
            .select('*')
            .eq('club_id', matchingClub.id)
            .eq('archived', false)
            .eq('status', 'ACTIVE')
            .lte('start_date', now)
            .is('end_date', null);

          console.log('🎯 EntryPageNew: Year-round query result:', { 
            error: yearRoundError, 
            count: yearRoundComps?.length || 0,
            queryParams: {
              club_id: matchingClub.id,
              archived: false,
              status: 'ACTIVE',
              start_date_lte: now,
              end_date_is_null: true
            },
            competitions: yearRoundComps?.map(c => ({ 
              id: c.id, 
              name: c.name, 
              start_date: c.start_date,
              end_date: c.end_date,
              status: c.status,
              archived: c.archived,
              is_year_round: c.is_year_round,
              slug: createCompetitionSlug(c.name),
              matches: createCompetitionSlug(c.name) === competitionSlug,
              startDateCompare: {
                competition_start: c.start_date,
                now_iso: now,
                passes_filter: new Date(c.start_date) <= new Date(now)
              }
            })) || []
          });

          if (!yearRoundError && yearRoundComps) {
            foundCompetition = yearRoundComps.find(comp => 
              createCompetitionSlug(comp.name) === competitionSlug
            );
            if (foundCompetition) {
              console.log('🎯 EntryPageNew: Found year-round competition by slug:', foundCompetition.name);
            }
          }

          if (!foundCompetition) {
            // Try time-bounded competitions
            console.log('🎯 EntryPageNew: No year-round competition found by slug, trying time-bounded...');
            const { data: timeBoundedComps, error: timeBoundedError } = await supabase
              .from('competitions')
              .select('*')
              .eq('club_id', matchingClub.id)
              .eq('archived', false)
              .eq('status', 'ACTIVE')
              .lte('start_date', now)
              .gte('end_date', now);

            console.log('🎯 EntryPageNew: Time-bounded query result:', { 
              error: timeBoundedError, 
              count: timeBoundedComps?.length || 0,
              competitions: timeBoundedComps?.map(c => ({ 
                id: c.id, 
                name: c.name, 
                slug: createCompetitionSlug(c.name),
                matches: createCompetitionSlug(c.name) === competitionSlug
              })) || []
            });

            if (!timeBoundedError && timeBoundedComps) {
              foundCompetition = timeBoundedComps.find(comp => 
                createCompetitionSlug(comp.name) === competitionSlug
              );
              if (foundCompetition) {
                console.log('🎯 EntryPageNew: Found time-bounded competition by slug:', foundCompetition.name);
              }
            }
          }
        }

        if (!foundCompetition) {
          const errorMessage = isLegacyFormat 
            ? `No active competition found for hole ${holeNumber} at ${matchingClub.name}.`
            : `No active competition found matching "${competitionSlug}" at ${matchingClub.name}.`;
          
          console.error('🎯 EntryPageNew: No competition found - FINAL RESULT');
          console.error('🎯 EntryPageNew: Search summary:', {
            clubName: matchingClub.name,
            clubId: matchingClub.id,
            isLegacyFormat,
            searchTerm: isLegacyFormat ? holeNumber : competitionSlug,
            currentTime: now
          });
          
          toast({
            title: "No Active Competition",
            description: `${errorMessage} The competition may be scheduled for later or already finished.`,
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        console.log('🎯 EntryPageNew: SUCCESS - Setting competition:', foundCompetition.name);
        setCompetition({
          id: foundCompetition.id,
          name: foundCompetition.name,
          description: foundCompetition.description,
          entry_fee: foundCompetition.entry_fee || 0,
          prize_pool: foundCompetition.prize_pool,
          hole_number: foundCompetition.hole_number,
          status: foundCompetition.status,
          club_name: matchingClub.name,
          club_id: matchingClub.id,
          hero_image_url: foundCompetition.hero_image_url
        });

        // Check for cooldown if user is logged in
        if (user) {
          await checkCooldown(user.id, foundCompetition.id);
        }

        // Track entry view
        analytics.entryViewed(foundCompetition.id, matchingClub.name, foundCompetition.hole_number);

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
  }, [venueSlug, competitionSlug, holeNumber, navigate, user]);

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

      {/* Enhanced Auth Modal */}
      <EnhancedAuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthSuccess}
        redirectUrl={competitionSlug ? `/enter/${venueSlug}/${competitionSlug}` : `/enter/${venueSlug}/${holeNumber}`}
      />

      {/* Mini Profile Form Modal */}
      {showProfileForm && user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <MiniProfileForm
            userId={user.id}
            userEmail={user.email || ''}
            onComplete={handleProfileComplete}
            onSkip={() => {
              setShowProfileForm(false);
              if (user) handleEntry(user.id);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default EntryPageNew;