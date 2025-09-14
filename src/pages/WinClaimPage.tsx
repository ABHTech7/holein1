import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import EnhancedWinClaimForm from "@/components/entry/EnhancedWinClaimForm";
import WinClaimForm from "@/components/entry/WinClaimForm";
import { Loader2, AlertTriangle } from "lucide-react";
import type { Gender } from '@/lib/copyEngine';

interface EntryData {
  id: string;
  player_id: string;
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
  outcome_self: string | null;
  status: string;
}

const WinClaimPage: React.FC = () => {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [entryData, setEntryData] = useState<EntryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useEnhancedForm] = useState(true); // Feature flag - set to false for legacy form

  useEffect(() => {
    const loadEntryData = async () => {
      if (!entryId) {
        setError('Entry ID is required');
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('entries')
          .select(`
            id,
            player_id,
            outcome_self,
            status,
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

        if (fetchError || !data) {
          console.error('Failed to fetch entry:', fetchError);
          setError('Entry not found');
          return;
        }

        // Check if user is authorized to claim this entry
        if (user && data.player_id !== user.id) {
          setError('You are not authorized to access this entry');
          return;
        }

        // Check if entry is in correct state
        if (data.outcome_self !== 'win' && data.status !== 'pending_verification') {
          setError('This entry is not eligible for win verification');
          return;
        }

        // Transform data to match interface
        setEntryData({
          id: data.id,
          player_id: data.player_id,
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
          outcome_self: data.outcome_self,
          status: data.status,
        });

      } catch (error) {
        console.error('Error loading entry:', error);
        setError('Failed to load entry data');
      } finally {
        setIsLoading(false);
      }
    };

    loadEntryData();
  }, [entryId, user]);

  const handleSuccess = () => {
    toast({
      title: "Verification submitted!",
      description: "Your hole-in-one claim has been submitted for review",
    });
    
    // Navigate to success page or back to entry
    navigate(`/entry-success/${entryId}`);
  };

  const handleCancel = () => {
    navigate(`/entry-success/${entryId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span>Loading entry details...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Entry</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/')}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!entryData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <h2 className="text-xl font-semibold mb-2">Entry Not Found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find the entry you're looking for.
            </p>
            <Button onClick={() => navigate('/')}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render enhanced or legacy form based on feature flag
  if (useEnhancedForm) {
    return (
      <EnhancedWinClaimForm
        entryId={entryData.id}
        competition={entryData.competition}
        player={entryData.player}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    );
  }

  // Legacy form fallback
  return (
    <div className="min-h-screen p-4">
      <WinClaimForm
        entryId={entryData.id}
        competitionName={entryData.competition.name}
        holeNumber={entryData.competition.hole_number}
        venueName={entryData.competition.club_name}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default WinClaimPage;