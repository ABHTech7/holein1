import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import useAuth from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/layout/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Trophy, 
  Target, 
  AlertTriangle, 
  CheckCircle2,
  XCircle
} from "lucide-react";
import { PlayerGreeting } from "@/components/ui/player-greeting";
import { SimpleAttemptFlow } from "@/components/entry/SimpleAttemptFlow";

interface EntryData {
  id: string;
  competition_name: string;
  hole_number: number;
  venue_name: string;
  attempt_window_start: string;
  attempt_window_end: string;
  status: string;
  outcome_self: string | null;
}

const EntryConfirmation = () => {
  const { entryId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Add a small delay to prevent premature redirects during auth state changes
    const checkAuthAndFetch = setTimeout(() => {
      if (!user) {
        console.log('No user found, redirecting to home');
        navigate('/');
        return;
      }
      fetchEntry();
    }, 100);

    return () => clearTimeout(checkAuthAndFetch);
  }, [entryId, user, navigate]);

  const fetchEntry = async () => {
    if (!entryId || !user) return;

    try {
        const { data, error } = await supabase
          .from('entries')
          .select(`
            id,
            attempt_window_start,
            attempt_window_end,
            status,
            outcome_self,
            competitions!inner (
              name,
              hole_number,
              club_id
            )
          `)
          .eq('id', entryId)
          .eq('player_id', user.id)
          .single();

        if (error || !data) {
          toast({
            title: "Entry not found",
            description: "Could not find your entry",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        // Get venue name from club
        const { data: venue } = await supabase
          .from('venues')
          .select('name')
          .eq('club_id', data.competitions.club_id)
          .single();

        setEntry({
          id: data.id,
          competition_name: data.competitions.name,
          hole_number: data.competitions.hole_number,
          venue_name: venue?.name || 'Unknown Venue',
          attempt_window_start: data.attempt_window_start,
          attempt_window_end: data.attempt_window_end,
          status: data.status,
          outcome_self: data.outcome_self
        });

      } catch (error: any) {
        console.error('Error fetching entry:', error);
        toast({
          title: "Error",
          description: "Failed to load entry details",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

  // Timer logic
  useEffect(() => {
    if (!entry?.attempt_window_end) return;

    const updateTimer = () => {
      const end = new Date(entry.attempt_window_end);
      const now = new Date();
      const remaining = Math.max(0, end.getTime() - now.getTime());
      
      setTimeRemaining(remaining);

      // Auto-miss if time is up and no outcome reported
      if (remaining === 0 && !entry.outcome_self) {
        handleAutoMiss();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [entry]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAutoMiss = async () => {
    if (!entry) return;

    try {
      await supabase
        .from('entries')
        .update({
          outcome_self: 'auto_miss',
          outcome_reported_at: new Date().toISOString()
        })
        .eq('id', entry.id);

      setEntry(prev => prev ? { ...prev, outcome_self: 'auto_miss' } : null);
      
      toast({
        title: "Time's up",
        description: "Entry automatically marked as missed",
        variant: "destructive"
      });
    } catch (error) {
      console.error('Auto-miss error:', error);
    }
  };

  const handleReportWin = async () => {
    if (!entry) return;

    setSubmitting(true);
    try {
      // For now, just update the outcome - full win reporting form will be separate
      await supabase
        .from('entries')
        .update({
          outcome_self: 'win',
          outcome_reported_at: new Date().toISOString()
        })
        .eq('id', entry.id);

      setEntry(prev => prev ? { ...prev, outcome_self: 'win' } : null);
      
      toast({
        title: "Win reported!",
        description: "Your win claim has been submitted for verification"
      });
    } catch (error: any) {
      console.error('Report win error:', error);
      toast({
        title: "Failed to report win",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportMiss = async () => {
    if (!entry) return;

    setSubmitting(true);
    try {
      await supabase
        .from('entries')
        .update({
          outcome_self: 'miss',
          outcome_reported_at: new Date().toISOString()
        })
        .eq('id', entry.id);

      setEntry(prev => prev ? { ...prev, outcome_self: 'miss' } : null);
      
      toast({
        title: "Outcome recorded",
        description: "Thanks for reporting your result"
      });
    } catch (error: any) {
      console.error('Report miss error:', error);
      toast({
        title: "Failed to report outcome",
        description: error.message || "Something went wrong", 
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading entry details...</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center p-8">
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Entry Not Found</h2>
              <Button onClick={() => navigate('/')}>
                Return Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const isTimeUp = timeRemaining === 0;
  const hasReportedOutcome = !!entry.outcome_self;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      
      <main className="flex-1 py-12">
        <Container>
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Entry Confirmation Card */}
            <Card>
              <CardHeader className="text-center pb-6">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-primary" />
                  </div>
                </div>
                
                {/* Personalized Greeting */}
                {user && profile?.first_name && (
                  <PlayerGreeting 
                    firstName={profile.first_name} 
                    variant="card"
                    className="mb-2"
                  />
                )}
                
                <CardTitle className="text-2xl font-['Montserrat'] text-primary">
                  Entry Confirmed!
                </CardTitle>
                <p className="text-muted-foreground">
                  Good luck with your Hole in 1 attempt
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Entry Details */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Entry ID</p>
                    <p className="font-mono text-sm">{entry.id.slice(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hole</p>
                    <p className="font-semibold">{entry.hole_number} at {entry.venue_name}</p>
                  </div>
                </div>

                {/* Timer Section */}
                {!hasReportedOutcome && (
                  <div className="text-center p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                    <div className="flex justify-center mb-4">
                      <Clock className={`w-8 h-8 ${isTimeUp ? 'text-destructive' : 'text-primary'}`} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {isTimeUp ? 'Time Up' : 'Time Remaining'}
                    </h3>
                    <div className={`text-3xl font-mono font-bold mb-2 ${isTimeUp ? 'text-destructive' : 'text-primary'}`}>
                      {isTimeUp ? '00:00' : formatTime(timeRemaining)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isTimeUp ? 'Your attempt window has expired' : 'to complete your attempt'}
                    </p>
                  </div>
                )}

                {/* Outcome Section */}
                {hasReportedOutcome ? (
                  <div className="text-center p-6 rounded-xl border">
                    <div className="flex justify-center mb-4">
                      {entry.outcome_self === 'win' ? (
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      ) : (
                        <XCircle className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {entry.outcome_self === 'win' ? 'Win Reported!' : 
                       entry.outcome_self === 'auto_miss' ? 'Auto-Missed' : 'Miss Reported'}
                    </h3>
                    <Badge variant={entry.outcome_self === 'win' ? 'default' : 'secondary'}>
                      {entry.outcome_self === 'win' ? 'Pending Verification' :
                       entry.outcome_self === 'auto_miss' ? 'Time Expired' : 'Complete'}
                    </Badge>
                  </div>
                ) : !isTimeUp ? (
                  <SimpleAttemptFlow
                    entryId={entry.id}
                    competitionName={entry.competition_name}
                    holeNumber={entry.hole_number}
                    venueName={entry.venue_name}
                    timeRemaining={timeRemaining}
                    onOutcomeReported={(outcome) => {
                      setEntry(prev => prev ? { ...prev, outcome_self: outcome } : null);
                      toast({
                        title: outcome === 'win' ? 'Win reported!' : 'Outcome recorded',
                        description: outcome === 'win' ? 
                          'Your win claim has been submitted for verification' :
                          'Thanks for reporting your result'
                      });
                    }}
                  />
                ) : null}
              </CardContent>
            </Card>

            {/* Back to Competitions */}
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="rounded-xl"
              >
                View Other Competitions
              </Button>
            </div>
          </div>
        </Container>
      </main>

      <SiteFooter />
    </div>
  );
};

export default EntryConfirmation;