import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { generateCompetitionEntryUrl } from "@/lib/competitionUtils";
import { 
  Trophy, 
  CheckCircle2, 
  Clock, 
  MapPin,
  Loader2,
  AlertTriangle
} from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";

interface EntryData {
  id: string;
  amount: number;
  entry_date: string;
  competition: {
    id: string;
    name: string;
    prize_pool: number;
    hole_number: number;
    club_name: string;
  };
}

const EntrySuccess: React.FC = () => {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [entryData, setEntryData] = useState<EntryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'win' | 'miss' | null>(null);

  useEffect(() => {
    const loadEntryData = async () => {
      if (!entryId) return;

      try {
        // Get entry with competition and club data
        const { data: entryRecord, error: entryError } = await supabase
          .from('entries')
          .select(`
            id,
            amount_minor,
            entry_date,
            competition:competitions!inner(
              id,
              name,
              prize_pool,
              hole_number,
              club:clubs!inner(
                name
              )
            )
          `)
          .eq('id', entryId)
          .single();

        if (entryError || !entryRecord) {
          console.error('Failed to load entry:', entryError);
          return;
        }

        setEntryData({
          id: entryRecord.id,
          amount: entryRecord.amount_minor || 0,
          entry_date: entryRecord.entry_date,
          competition: {
            id: entryRecord.competition.id,
            name: entryRecord.competition.name,
            prize_pool: entryRecord.competition.prize_pool || 0,
            hole_number: entryRecord.competition.hole_number,
            club_name: entryRecord.competition.club.name,
          }
        });
      } catch (error) {
        console.error('Error loading entry:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEntryData();
  }, [entryId]);

  const handleReportOutcome = async (outcome: 'win' | 'miss') => {
    if (!entryData || !user) return;
    
    setActionLoading(outcome);

    try {
      if (outcome === 'win') {
        // Navigate to hole-in-one verification flow
        navigate(`/win-claim/${entryId}`);
      } else {
        // Handle miss - update entry and navigate back to competition
        const { error } = await supabase
          .from('entries')
          .update({
            outcome_self: 'miss',
            outcome_reported_at: new Date().toISOString(),
            status: 'completed'
          })
          .eq('id', entryId);

        if (error) {
          console.error('Failed to update entry:', error);
          toast({
            title: "Error",
            description: "Failed to record your shot. Please try again.",
            variant: "destructive"
          });
          return;
        }

        toast({
          title: "Better luck next time! ⛳",
          description: "Your shot has been recorded. Ready for another attempt?"
        });

        // Navigate back to competition page with option to re-enter
        const competitionUrl = await generateCompetitionEntryUrl(entryData.competition.id);
        if (competitionUrl) {
          navigate(competitionUrl);
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Error reporting outcome:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin mr-3 text-primary" />
              <span className="text-muted-foreground">Loading your entry...</span>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!entryData) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="text-center p-8">
              <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Entry Not Found</h2>
              <p className="text-muted-foreground mb-6">
                We couldn't find your entry details.
              </p>
              <Button onClick={() => navigate('/')}>
                Go Home
              </Button>
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
      
      <main className="flex-1 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Success Header */}
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-medium">
              <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Entry Confirmed! 🎯
            </h1>
            <p className="text-lg text-muted-foreground">
              You're officially entered into the competition
            </p>
          </div>

          {/* Competition Details Card */}
          <Card className="shadow-soft animate-slide-up">
            <CardContent className="p-6 space-y-6">
              {/* Competition Info */}
              <div className="text-center border-b border-border pb-6">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {entryData.competition.name}
                </h2>
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>{entryData.competition.club_name}</span>
                </div>
                <div className="flex justify-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-foreground">Hole #{entryData.competition.hole_number}</div>
                    <div className="text-muted-foreground">Target</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground">
                      £{(entryData.competition.prize_pool / 100).toFixed(2)}
                    </div>
                    <div className="text-muted-foreground">Prize Pool</div>
                  </div>
                </div>
              </div>

              {/* Entry Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Entry ID</div>
                  <div className="font-mono text-foreground">#{entryData.id.slice(-8).toUpperCase()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Entry Fee</div>
                  <div className="font-semibold text-foreground">£{(entryData.amount / 100).toFixed(2)}</div>
                </div>
              </div>

              {/* Verification Window Info */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div className="text-sm">
                    <div className="font-semibold text-foreground mb-1">24-Hour Verification Window</div>
                    <div className="text-muted-foreground">
                      If you hit a hole-in-one, you'll have 24 hours to submit verification. 
                      After this time, the entry will automatically be marked as a miss.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Take Your Shot Section */}
          <Card className="shadow-soft animate-slide-up">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <Trophy className="w-12 h-12 text-secondary mx-auto mb-4" />
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                  Time to Take Your Shot!
                </h2>
                <p className="text-muted-foreground">
                  Head to the tee and show us what you've got. Report your result when you're done.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <Button
                  onClick={() => handleReportOutcome('win')}
                  disabled={actionLoading !== null}
                  className="w-full h-16 text-lg font-semibold bg-gradient-primary hover:bg-gradient-primary/90 text-primary-foreground shadow-medium transition-all duration-200 hover:scale-[1.02]"
                >
                  {actionLoading === 'win' ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    '🎉'
                  )}
                  <span className="ml-2">Yes! I hit the ace</span>
                </Button>

                <Button
                  onClick={() => handleReportOutcome('miss')}
                  disabled={actionLoading !== null}
                  variant="outline"
                  className="w-full h-16 text-lg font-semibold border-2 border-border hover:border-primary/30 transition-all duration-200 hover:scale-[1.02]"
                >
                  {actionLoading === 'miss' ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    '⛳'
                  )}
                  <span className="ml-2">Not this time</span>
                </Button>
              </div>

              {/* Info Badges */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                <Badge variant="secondary" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  24hr verification window
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Auto-miss after timeout
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default EntrySuccess;