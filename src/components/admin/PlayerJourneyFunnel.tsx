import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Trophy, CreditCard, Target, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";

interface FunnelStep {
  name: string;
  count: number;
  percentage: number;
  icon: any;
  color: string;
}

const PlayerJourneyFunnel = () => {
  const [loading, setLoading] = useState(true);
  const [funnelData, setFunnelData] = useState<FunnelStep[]>([]);

  useEffect(() => {
    fetchFunnelData();
  }, []);

  const fetchFunnelData = async () => {
    try {
      setLoading(true);

      // Get total registered players
      const { count: totalPlayers, error: playersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'PLAYER');

      if (playersError) throw playersError;

      // Get players who have made at least one entry
      const { data: playerEntries, error: entriesError } = await supabase
        .from('entries')
        .select('player_id');

      if (entriesError) throw entriesError;

      const playersWithEntries = new Set(playerEntries?.map(e => e.player_id) || []);
      const playersWhoEntered = playersWithEntries.size;

      // Get total entries
      const { count: totalEntries, error: totalEntriesError } = await supabase
        .from('entries')
        .select('*', { count: 'exact', head: true });

      if (totalEntriesError) throw totalEntriesError;

      // Get paid entries
      const { count: paidEntries, error: paidEntriesError } = await supabase
        .from('entries')
        .select('*', { count: 'exact', head: true })
        .eq('paid', true);

      if (paidEntriesError) throw paidEntriesError;

      // Get completed entries (those with outcomes)
      const { count: completedEntries, error: completedError } = await supabase
        .from('entries')
        .select('*', { count: 'exact', head: true })
        .not('outcome_self', 'is', null);

      if (completedError) throw completedError;

      // Get hole-in-one claims
      const { count: totalClaims, error: claimsError } = await supabase
        .from('claims')
        .select('*', { count: 'exact', head: true });

      if (claimsError) throw claimsError;

      // Calculate percentages based on the previous step
      const steps: FunnelStep[] = [
        {
          name: "Registered Players",
          count: totalPlayers || 0,
          percentage: 100,
          icon: Users,
          color: "bg-blue-500"
        },
        {
          name: "Made at least 1 Entry",
          count: playersWhoEntered,
          percentage: totalPlayers ? Math.round((playersWhoEntered / totalPlayers) * 100) : 0,
          icon: Trophy,
          color: "bg-green-500"
        },
        {
          name: "Completed Payment",
          count: paidEntries || 0,
          percentage: totalEntries ? Math.round(((paidEntries || 0) / totalEntries) * 100) : 0,
          icon: CreditCard,
          color: "bg-yellow-500"
        },
        {
          name: "Attempted Competition",
          count: completedEntries || 0,
          percentage: paidEntries ? Math.round(((completedEntries || 0) / paidEntries) * 100) : 0,
          icon: Target,
          color: "bg-orange-500"
        },
        {
          name: "Claimed Hole-in-One",
          count: totalClaims || 0,
          percentage: completedEntries ? Math.round(((totalClaims || 0) / completedEntries) * 100) : 0,
          icon: TrendingUp,
          color: "bg-purple-500"
        }
      ];

      setFunnelData(steps);

    } catch (error) {
      console.error('Error fetching funnel data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Player Journey Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-8 h-8 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-2 w-full" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Player Journey Funnel
          <span className="text-sm font-normal text-muted-foreground ml-auto">
            Conversion Analysis
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {funnelData.map((step, index) => {
            const Icon = step.icon;
            const isDropoff = index > 0 && step.percentage < 50;
            
            return (
              <div key={step.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${step.color} text-white`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{step.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {step.count.toLocaleString()} {index === 0 ? 'total' : 'converted'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isDropoff && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="font-semibold text-sm">
                      {step.percentage}%
                    </span>
                  </div>
                </div>
                
                <Progress 
                  value={step.percentage} 
                  className="h-2"
                />
                
                {isDropoff && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    High drop-off rate - needs attention
                  </p>
                )}
              </div>
            );
          })}
          
          {/* Summary Insights */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h5 className="font-semibold text-sm mb-2">Key Insights</h5>
            <div className="space-y-1 text-xs text-muted-foreground">
              {funnelData.length > 1 && (
                <>
                  <p>• {funnelData[1]?.percentage}% of players make at least one entry</p>
                  {funnelData[2] && (
                    <p>• {funnelData[2].percentage}% payment conversion rate</p>
                  )}
                  {funnelData[4] && funnelData[4].count > 0 && (
                    <p>• {funnelData[4].count} hole-in-one claims submitted</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerJourneyFunnel;