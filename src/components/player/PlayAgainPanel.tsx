import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trophy, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface PlayAgainEntry {
  id: string;
  competition_id: string;
  competition_name: string;
  club_name: string;
  club_slug?: string;
  competition_slug?: string;
  attempt_number: number;
  outcome_self: string;
  entry_date: string;
  price_paid: number;
}

interface PlayAgainPanelProps {
  recentMisses: PlayAgainEntry[];
  onPlayAgain: (competitionId: string) => void;
}

export function PlayAgainPanel({ recentMisses, onPlayAgain }: PlayAgainPanelProps) {
  // All entries are available immediately (no cooldown)
  if (recentMisses.length === 0) {
    return null;
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <Card className="p-4 md:p-6 mb-6 border-orange-200 bg-gradient-to-r from-orange-50/50 to-yellow-50/50">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
        <h3 className="text-base sm:text-lg font-semibold text-orange-900">Try Again</h3>
        <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
          {recentMisses.length} Available
        </Badge>
      </div>
      
      <p className="text-xs sm:text-sm text-orange-700 mb-4">
        Don't give up! Have another go at these competitions you just missed.
      </p>

      <div className="space-y-3">
        {/* Show up to 5 recent misses, all available immediately */}
        {recentMisses.slice(0, 5).map((entry) => (
          <div key={entry.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white/60 rounded-lg border border-orange-100">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <Trophy className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <span className="font-medium text-orange-900 text-sm truncate">{entry.competition_name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-orange-600">
                <span className="truncate">{entry.club_name}</span>
                <span className="flex items-center flex-shrink-0">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTimeAgo(entry.entry_date)}
                </span>
                <span className="flex-shrink-0">Attempt #{entry.attempt_number}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-medium text-orange-900">
                  {formatCurrency(entry.price_paid || 7.50)}
                </div>
                <div className="text-xs text-orange-600">Entry Fee</div>
              </div>
              
              <Button 
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto text-xs sm:text-sm"
                onClick={() => onPlayAgain(entry.competition_id)}
                data-testid={`player-play-again-btn-${entry.competition_id}`}
              >
                <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Have Another Go</span>
                <span className="sm:hidden">Try Again</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {recentMisses.length > 5 && (
        <div className="text-center mt-4">
          <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50 w-full sm:w-auto text-xs sm:text-sm">
            View All Recent Misses ({recentMisses.length - 5} more)
          </Button>
        </div>
      )}
    </Card>
  );
}