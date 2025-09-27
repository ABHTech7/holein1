import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Calendar, Target, PoundSterling } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface PlayerSummaryData {
  total_entries: number;
  competitions_played: number;
  total_spend: number;
  last_played_at: string | null;
}

interface PlayerSummaryCardsProps {
  data: PlayerSummaryData | null;
  loading: boolean;
}

export function PlayerSummaryCards({ data, loading }: PlayerSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  const formatLastPlayed = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString('en-GB', { timeZone: 'UTC' });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="p-6" data-testid="player-summary-total-entries">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Entries</p>
            <p className="text-2xl font-bold">{data?.total_entries || 0}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-secondary/10 rounded-lg">
            <Trophy className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Competitions Played</p>
            <p className="text-2xl font-bold">{data?.competitions_played || 0}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-accent/10 rounded-lg">
            <PoundSterling className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Spend</p>
            <p className="text-2xl font-bold">{formatCurrency(data?.total_spend || 0)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-muted/50 rounded-lg">
            <Calendar className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Last Played</p>
            <p className="text-lg font-semibold">{formatLastPlayed(data?.last_played_at)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}