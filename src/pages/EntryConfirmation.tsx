import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureVerificationRecord } from '@/lib/verificationService';
import useAuth from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { getConfig } from "@/lib/featureFlags";
import { clearAllEntryContext } from "@/lib/entryContextPersistence";
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
  XCircle,
  RotateCcw
} from "lucide-react";
import { PlayerGreeting } from "@/components/ui/player-greeting";
import { SimpleAttemptFlow } from "@/components/entry/SimpleAttemptFlow";

interface EntryData {
  id: string;
  competition_id?: string;
  competition_name: string;
  hole_number: number;
  venue_name: string;
  attempt_window_start: string;
  attempt_window_end: string;
  auto_miss_at: string | null;
  status: string;
  outcome_self: string | null;
  entry_fee?: number;
}

const EntryConfirmation = () => {
  const { entryId: entryIdParam } = useParams();
  const navigate = useNavigate();
  const { user, profile, forceRefresh } = useAuth();
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const initializedRef = useRef(false);
  const [showNoEntry, setShowNoEntry] = useState(false);
  const [showPlayAgain, setShowPlayAgain] = useState(false);
  
  // Read entryId from param or cookie fallback
  const entryId = entryIdParam || (() => {
    try {
      const cookies = document.cookie.split(';');
      const entryCookie = cookies.find(c => c.trim().startsWith('oh1_entry_id='));
      return entryCookie?.split('=')[1]?.trim();
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    console.log('🔍 EntryConfirmation: Component mounted', { user: !!user, entryId, initialized: initializedRef.current });
    
    // Check for "no active entry" flag from AuthCallback
    const noActiveEntry = sessionStorage.getItem('no_active_entry');
    if (noActiveEntry) {
      console.log('🔍 EntryConfirmation: No active entry flag set');
      sessionStorage.removeItem('no_active_entry');
      setShowNoEntry(true);
      setLoading(false);
      return;
    }
    
    if (!entryId) {
      console.log('❌ EntryConfirmation: No entryId provided (param or cookie)');
      setShowNoEntry(true);
      setLoading(false);
      return;
    }

    // Only initialize once per entryId
    if (initializedRef.current) {
      console.log('🔍 EntryConfirmation: Already initialized, skipping');
      return;
    }

    initializedRef.current = true;

    // Force check for session and attempt to fetch entry
    const initializeEntry = async () => {
      console.log('🔄 EntryConfirmation: Initializing entry fetch...');
      
      // First try with current user
      if (user?.id) {
        console.log('✅ EntryConfirmation: User from hook available, fetching entry');
        await fetchEntry();
        return;
      }

      // If no user from hook, check Supabase session directly
      console.log('⚠️ EntryConfirmation: No user from hook, checking Supabase session...');
      try {
        // Try force refresh first
        const authRefreshed = await forceRefresh?.();
        if (authRefreshed) {
          console.log('✅ EntryConfirmation: Auth refreshed successfully, fetching entry');
          setTimeout(() => fetchEntry(), 100); // Small delay to let state update
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔍 EntryConfirmation: Session check result', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          error: error?.message 
        });

        if (session?.user?.id) {
          console.log('✅ EntryConfirmation: Session found, fetching entry');
          await fetchEntry();
          return;
        }

        // Check secure storage as fallback
        const { SecureStorage } = await import('@/lib/secureStorage');
        const hasAuthData = SecureStorage.getAuthData('session_check');
        if (hasAuthData) {
          console.log('⚠️ EntryConfirmation: Found auth indicator, waiting for sync...');
          // Give auth hook time to sync
          setTimeout(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
              console.log('✅ EntryConfirmation: Auth synced, fetching entry');
              await fetchEntry();
            } else {
              console.log('❌ EntryConfirmation: Auth sync failed after delay');
              setLoading(false);
            }
          }, 2000);
          return;
        }

        console.log('❌ EntryConfirmation: No authentication found');
        setLoading(false);
      } catch (error) {
        console.error('💥 EntryConfirmation: Session check failed', error);
        setLoading(false);
      }
    };

    // Set up timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('⏰ EntryConfirmation: Timeout reached, stopping loading');
      setLoading(false);
    }, 10000); // 10 second timeout

    const cleanup = () => clearTimeout(timeoutId);
    
    initializeEntry().finally(cleanup);
    return cleanup;
  }, [entryId, navigate]);

  const fetchEntry = async () => {
    if (!entryId) {
      console.log('❌ fetchEntry: No entryId provided');
      return;
    }

    console.log('🔄 fetchEntry: Starting entry fetch...', { entryId });

    // Try to get session directly from Supabase if user hook hasn't updated yet
    let userId = user?.id;
    if (!userId) {
      console.log('⚠️ fetchEntry: No user from hook, checking Supabase session...');
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
      console.log('🔍 fetchEntry: Session check result', { userId });
    }

    if (!userId) {
      console.log('❌ fetchEntry: No user ID available from any source');
      setLoading(false);
      return;
    }

    try {
        // Only show loading if we don't have entry data yet
        if (!entry) {
          setLoading(true);
        }
        console.log('🔄 fetchEntry: Querying database via RPC...', { entryId, userId });
        
        let data: any = null;
        let error: any = null;

        // Use secure RPC function for entry fetch
        const rpcResult = await supabase.rpc('get_entry_for_current_email', { 
          p_entry_id: entryId 
        }).maybeSingle();

        data = rpcResult.data;
        error = rpcResult.error;

        // Handle "Cannot coerce" error with retry after session refresh
        if (error && (error.message?.includes('Cannot coerce') || error.code === 'PGRST116')) {
          console.warn('⚠️ fetchEntry: Cannot coerce error, refreshing session and retrying...', error);
          
          // Refresh session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('🔄 fetchEntry: Session refreshed, retrying RPC...');
            const retryResult = await supabase.rpc('get_entry_for_current_email', { 
              p_entry_id: entryId 
            }).maybeSingle();
            
            data = retryResult.data;
            error = retryResult.error;
          }
        }

        console.log('🔍 fetchEntry: RPC query result', { 
          hasData: !!data, 
          error: error?.message,
          entryStatus: data?.status,
          hasOutcome: !!data?.outcome_self
        });

        if (error || !data) {
          console.error('❌ fetchEntry: Entry fetch error:', error);
          
          // Fallback: Try to backfill email if entry exists but has NULL email
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email) {
            console.log('🔄 fetchEntry: Attempting email backfill for entry:', entryId);
            const { error: backfillError } = await supabase
              .from('entries')
              .update({ email: session.user.email })
              .eq('id', entryId)
              .is('email', null);
            
            if (!backfillError) {
              console.log('✅ fetchEntry: Email backfilled, retrying fetch...');
              // Retry the RPC call once
              const retryResult = await supabase.rpc('get_entry_for_current_email', { 
                p_entry_id: entryId 
              }).maybeSingle();
              
              if (retryResult.data) {
                console.log('✅ fetchEntry: Retry successful after backfill');
                data = retryResult.data;
                error = null;
              }
            }
          }
          
          // If still no data after backfill attempt, show no entry
          if (error || !data) {
            const isCantCoerce = error?.message?.includes('Cannot coerce') || error?.code === 'PGRST116';
            if (!isCantCoerce) {
              console.log('Entry not found - showing branded message without toast');
            }
            setShowNoEntry(true);
            setLoading(false);
            return;
          }
        }

        // Check for missing attempt_window_end (legacy or invalid entry)
        if (!data.attempt_window_end) {
          console.warn('⚠️ fetchEntry: Entry missing attempt_window_end - showing No Active Entry');
          setShowNoEntry(true);
          setLoading(false);
          return;
        }

        const entryData = {
          id: data.id,
          competition_id: data.competition_id,
          competition_name: data.competition_name,
          hole_number: data.hole_number,
          venue_name: data.club_name || 'Unknown Club',
          attempt_window_start: data.attempt_window_start,
          attempt_window_end: data.attempt_window_end,
          auto_miss_at: data.auto_miss_at,
          status: data.status,
          outcome_self: data.outcome_self,
          entry_fee: data.entry_fee || 7.50
        };

        console.log('✅ fetchEntry: Entry data loaded successfully', {
          entryId: entryData.id,
          competitionName: entryData.competition_name,
          hasAttemptWindow: !!(entryData.attempt_window_start && entryData.attempt_window_end),
          outcome: entryData.outcome_self
        });

        // DEBUG: Log all timing windows
        console.log('ENTRY WINDOWS', {
          attempt_window_start: entryData.attempt_window_start,
          attempt_window_end: entryData.attempt_window_end,
          auto_miss_at: entryData.auto_miss_at
        });

        setEntry(entryData);

        // Check if attempt window has expired
        if (entryData.attempt_window_end) {
          const endTime = new Date(entryData.attempt_window_end);
          const now = new Date();
          if (now > endTime && !entryData.outcome_self) {
            console.log('⚠️ fetchEntry: Attempt window expired, triggering auto-miss');
            setTimeout(() => handleAutoMiss(), 1000);
          }
        }

      } catch (error: any) {
        console.error('💥 fetchEntry: Unexpected error:', error);
        // Don't show any destructive toasts - let the UI show branded "Entry Not Found" state
        console.log('Entry fetch failed - showing branded message without toast');
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
    const totalMinutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}m`;
    } else {
      return `${totalMinutes}m ${seconds}s`;
    }
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
      // Update the outcome and mark as completed
      await supabase
        .from('entries')
        .update({
          outcome_self: 'win',
          outcome_reported_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', entry.id);

      setEntry(prev => prev ? { ...prev, outcome_self: 'win', status: 'completed' } : null);
      
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
          outcome_reported_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', entry.id);

      setEntry(prev => prev ? { ...prev, outcome_self: 'miss', status: 'completed' } : null);
      setShowPlayAgain(true);
      
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

  const handlePlayAgain = async () => {
    if (!entry?.competition_id) {
      toast({
        title: "Error",
        description: "Competition information not found",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .rpc('create_new_entry_for_current_email', {
          p_competition_id: entry.competition_id
        });

      if (error) throw error;

      // Type cast the response
      const result = data as { entry_id: string; duplicate_prevented?: boolean } | null;

      if (!result?.entry_id) {
        throw new Error('No entry ID returned');
      }

      // Clear all entry context before navigating
      clearAllEntryContext();

      // Navigate to new entry confirmation
      navigate(`/entry/${result.entry_id}/confirmation`);
      
      toast({
        title: "New entry created!",
        description: "Good luck with your next attempt"
      });
    } catch (error: any) {
      console.error('Play again error:', error);
      toast({
        title: "Failed to create new entry",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading while we're fetching data
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <div>
              <p className="text-muted-foreground">Loading entry details...</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                This may take a moment after clicking your secure link
              </p>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  // Show "No Active Entry" recovery screen
  if (!entry && (showNoEntry || !loading)) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center p-8 space-y-4">
              <AlertTriangle className="w-12 h-12 text-primary mx-auto" />
              <div>
                <h2 className="text-xl font-semibold mb-2">No Active Entry</h2>
                <p className="text-sm text-muted-foreground">
                  We couldn't find an active entry for this link. This may happen if the link expired or was already completed.
                </p>
              </div>
              <Button 
                onClick={() => {
                  clearAllEntryContext();
                  navigate('/');
                }} 
                className="w-full"
              >
                Start a New Entry
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
                      {isTimeUp ? 'Take your shot and report your result' : 'to complete your attempt'}
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
                    <Badge variant={entry.outcome_self === 'win' ? 'default' : 'secondary'} className="mb-4">
                      {entry.outcome_self === 'win' ? 'Pending Verification' :
                       entry.outcome_self === 'auto_miss' ? 'Time Expired' : 'Complete'}
                    </Badge>
                    
                    {/* Continue to Evidence Collection for wins */}
                    {entry.outcome_self === 'win' && (
                      <div className="mt-4">
                        <Button 
                          onClick={async () => {
                            // Ensure verification record exists before navigating
                            await ensureVerificationRecord(entry.id);
                            // Navigate to win claim page
                            navigate(`/win-claim/${entry.id}`);
                          }}
                          className="w-full"
                        >
                          Continue to Evidence Collection
                        </Button>
                        <p className="text-sm text-muted-foreground mt-2">
                          Lock in your legend status with photos, witness details, and more
                        </p>
                      </div>
                    )}

                    {/* Play Again button for misses */}
                    {(entry.outcome_self === 'miss' || entry.outcome_self === 'auto_miss') && showPlayAgain && (
                      <div className="mt-4 space-y-3">
                        <Button 
                          onClick={handlePlayAgain}
                          disabled={submitting}
                          className="w-full"
                          size="lg"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Have another go ({entry.entry_fee ? `£${entry.entry_fee.toFixed(2)}` : '£7.50'})
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Payment will be processed before your next attempt
                        </p>
                      </div>
                    )}
                  </div>
                ) : isTimeUp ? (
                  // Time up - show action buttons (no dead-end)
                  <div className="text-center p-6 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <div className="flex justify-center mb-4">
                      <AlertTriangle className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Time's Up!</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Your 6-hour attempt window has ended. Did you make your attempt?
                    </p>
                    
                    <div className="space-y-3">
                      <Button 
                        onClick={async () => {
                          await handleReportWin();
                          // Navigate to evidence collection
                          await ensureVerificationRecord(entry.id);
                          navigate(`/win-claim/${entry.id}`);
                        }}
                        disabled={submitting}
                        className="w-full"
                        size="lg"
                      >
                        <Trophy className="w-4 h-4 mr-2" />
                        I Won! (Submit Evidence)
                      </Button>
                      
                      <Button 
                        onClick={handleReportMiss}
                        disabled={submitting}
                        variant="outline"
                        className="w-full"
                        size="lg"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Missed
                      </Button>
                      
                      <Button 
                        onClick={() => {
                          clearAllEntryContext();
                          navigate('/');
                        }}
                        variant="ghost"
                        className="w-full"
                      >
                        Start a New Entry
                      </Button>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-4">
                      Note: Entry will auto-miss after 12 hours if no outcome is reported
                    </p>
                  </div>
                ) : (
                  <SimpleAttemptFlow
                    entry={{ id: entry.id }}
                    competition={{ 
                      name: entry.competition_name,
                      club: { name: entry.venue_name }
                    }}
                    holeNumber={entry.hole_number}
                    venueName={entry.venue_name}
                    timeRemaining={timeRemaining}
                    onOutcome={(outcome) => {
                      setEntry(prev => prev ? { ...prev, outcome_self: outcome } : null);
                    }}
                    onWin={() => {
                      // Navigate to win claim page for evidence collection
                      navigate(`/win-claim/${entry.id}`);
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Back to Competitions */}
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  clearAllEntryContext();
                  navigate('/');
                }}
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