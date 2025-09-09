import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

const TokenEntryConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const entryIdParam = searchParams.get('entry');
  
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    if (!token || !entryIdParam) {
      toast({
        title: "Invalid Link",
        description: "This confirmation link is invalid",
        variant: "destructive"
      });
      navigate('/');
      return;
    }

    validateTokenAndFetchEntry();
  }, [token, entryIdParam, navigate]);

  const validateTokenAndFetchEntry = async () => {
    if (!token || !entryIdParam) return;

    try {
      // Validate confirmation token
      const { data: tokenData, error: tokenError } = await supabase
        .from('entry_confirmation_tokens')
        .select('*')
        .eq('token', token)
        .eq('entry_id', entryIdParam)
        .single();

      if (tokenError || !tokenData) {
        toast({
          title: "Invalid Token",
          description: "This confirmation link is invalid or has expired",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      
      if (expiresAt <= now) {
        toast({
          title: "Link Expired",
          description: "This confirmation link has expired",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      // Token is valid, extract user data
      const userData = tokenData.user_data as unknown as UserData;
      setUserData(userData);
      setTokenValid(true);

      // Fetch entry details using token validation (no auth required)
      const { data: entryData, error: entryError } = await supabase
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
        .eq('id', entryIdParam)
        .single();

      if (entryError || !entryData) {
        toast({
          title: "Entry not found",
          description: "Could not find this entry",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      // Get venue name from club
      const { data: venue } = await supabase
        .from('venues')
        .select('name')
        .eq('club_id', entryData.competitions.club_id)
        .single();

      setEntry({
        id: entryData.id,
        competition_name: entryData.competitions.name,
        hole_number: entryData.competitions.hole_number,
        venue_name: venue?.name || 'Unknown Venue',
        attempt_window_start: entryData.attempt_window_start,
        attempt_window_end: entryData.attempt_window_end,
        status: entryData.status,
        outcome_self: entryData.outcome_self
      });

    } catch (error: any) {
      console.error('Error validating token and fetching entry:', error);
      toast({
        title: "Error",
        description: "Failed to load entry details",
        variant: "destructive"
      });
      navigate('/');
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

  const handleOutcomeReported = (outcome: string) => {
    setEntry(prev => prev ? { ...prev, outcome_self: outcome } : null);
    toast({
      title: outcome === 'win' ? 'Win reported!' : 'Outcome recorded',
      description: outcome === 'win' ? 
        'Your win claim has been submitted for verification' :
        'Thanks for reporting your result'
    });
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

  if (!entry || !tokenValid) {
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
                {userData?.first_name && (
                  <PlayerGreeting 
                    firstName={userData.first_name} 
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
                    onOutcomeReported={handleOutcomeReported}
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

export default TokenEntryConfirmation;