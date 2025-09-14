import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getEntrySuccessMessage } from "@/lib/copyEngine";
import { getConfig } from "@/lib/featureFlags";
import { Trophy, Target, Clock, MapPin, Loader2, Zap } from "lucide-react";
import type { Gender } from '@/lib/copyEngine';

interface EntryData {
  id: string;
  competition: {
    id: string;
    name: string;
    prize_pool: number;
    hole_number: number;
    club_name: string;
  };
  player: {
    first_name: string;
    gender?: Gender;
  };
  entry_date: string;
  amount_minor: number;
}

const EntrySuccess: React.FC = () => {
  const { entryId } = useParams<{ entryId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [entryData, setEntryData] = useState<EntryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'win' | 'miss' | null>(null);

  useEffect(() => {
    const loadEntryData = async () => {
      if (!entryId) return;
      
      try {
        const { data, error } = await supabase
          .from('entries')
          .select(`
            id,
            entry_date,
            amount_minor,
            competition:competitions(
              id,
              name,
              prize_pool,
              hole_number,
              club_name:clubs(name)
            ),
            player:profiles(
              first_name,
              gender
            )
          `)
          .eq('id', entryId)
          .single();

        if (error || !data) {
          console.error('Failed to load entry data:', error);
          toast({ 
            title: "Entry not found", 
            description: "Unable to load entry details.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        // Transform the data to match our interface
        setEntryData({
          id: data.id,
          competition: {
            id: data.competition.id,
            name: data.competition.name,
            prize_pool: data.competition.prize_pool,
            hole_number: data.competition.hole_number,
            club_name: data.competition.club_name?.name || 'Unknown Club',
          },
          player: {
            first_name: data.player.first_name || 'Player',
            gender: data.player.gender as Gender,
          },
          entry_date: data.entry_date,
          amount_minor: data.amount_minor || 0,
        });

      } catch (error) {
        console.error('Error loading entry data:', error);
        toast({ title: "Loading failed", variant: "destructive" });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    loadEntryData();
  }, [entryId, navigate, toast]);

  const handleReportOutcome = async (outcome: 'win' | 'miss') => {
    if (!entryData) return;
    
    setActionLoading(outcome);
    
    try {
      // Update entry with outcome
      const { error: entryError } = await supabase
        .from('entries')
        .update({
          outcome_self: outcome,
          outcome_reported_at: new Date().toISOString(),
          status: outcome === 'win' ? 'pending_verification' : 'completed'
        })
        .eq('id', entryData.id);

      if (entryError) {
        console.error('Failed to update entry:', entryError);
        toast({ title: "Update failed", variant: "destructive" });
        return;
      }

      if (outcome === 'win') {
        // Create verification record for hole-in-one claims
        const autoMissAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now
        
        const { error: verificationError } = await supabase
          .from('verifications')
          .insert({
            entry_id: entryData.id,
            witnesses: {},
            status: 'pending',
            auto_miss_at: autoMissAt.toISOString(),
            auto_miss_applied: false,
          });

        if (verificationError) {
          console.error('Failed to create verification:', verificationError);
          toast({ title: "Verification setup failed", variant: "destructive" });
          return;
        }

        toast({ 
          title: "Congratulations!", 
          description: "Please provide evidence to verify your hole-in-one!"
        });

        // Navigate to win claim form
        navigate(`/win-claim/${entryData.id}`);
      } else {
        toast({ 
          title: "Thanks for playing!", 
          description: "Better luck next time!"
        });

        // Navigate back to competition or home
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }

    } catch (error) {
      console.error('Error reporting outcome:', error);
      toast({ title: "Report failed", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span>Loading your entry...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!entryData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Entry Not Found</h2>
            <p className="text-muted-foreground mb-6">We couldn't find your entry details.</p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const successMessage = getEntrySuccessMessage({
    firstName: entryData.player.first_name,
    gender: entryData.player.gender,
    competitionName: entryData.competition.name,
  });

  const { verificationTimeoutHours } = getConfig();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Success Message */}
        <Card className="text-center overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
            <Trophy className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Entry Confirmed!</h1>
            <p className="text-lg opacity-90">{successMessage}</p>
          </div>
          
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{entryData.competition.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Hole {entryData.competition.hole_number}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Prize Pool</p>
                  <p className="text-sm text-muted-foreground">
                    £{(entryData.competition.prize_pool / 100).toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Verification Window</p>
                  <p className="text-sm text-muted-foreground">
                    {verificationTimeoutHours} hours to submit verification
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{entryData.competition.club_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Entry ID: #{entryData.id.slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Take Your Shot!</CardTitle>
            <p className="text-center text-muted-foreground">
              Take your shot and report your result. If you score a hole-in-one, you'll have {verificationTimeoutHours} hours to upload your verification.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => handleReportOutcome('win')}
                disabled={actionLoading !== null}
                size="lg"
                className="h-16 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg"
              >
                {actionLoading === 'win' ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Trophy className="h-6 w-6 mr-2" />
                    HOLE-IN-ONE! 🎯
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => handleReportOutcome('miss')}
                disabled={actionLoading !== null}
                size="lg"
                variant="outline"
                className="h-16 font-bold text-lg border-2"
              >
                {actionLoading === 'miss' ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Target className="h-6 w-6 mr-2" />
                    I Missed
                  </>
                )}
              </Button>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              <Badge variant="outline" className="mr-2">
                <Clock className="h-3 w-3 mr-1" />
                Auto-miss in 15 min
              </Badge>
              <span>Remember: Hole-in-ones require witness verification!</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EntrySuccess;