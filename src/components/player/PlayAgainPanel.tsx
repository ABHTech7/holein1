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
    <Card className="p-6 mb-6 border-orange-200 bg-gradient-to-r from-orange-50/50 to-yellow-50/50">
      <div className="flex items-center space-x-2 mb-4">
        <RotateCcw className="h-5 w-5 text-orange-600" />
        <h3 className="text-lg font-semibold text-orange-900">Try Again</h3>
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          {recentMisses.length} Recent Miss{recentMisses.length > 1 ? 'es' : ''}
        </Badge>
      </div>
      
      <p className="text-sm text-orange-700 mb-4">
        Don't give up! Have another go at these competitions you just missed.
      </p>

      <div className="space-y-3">
        {recentMisses.slice(0, 3).map((entry) => (
          <div key={entry.id} className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-orange-100">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Trophy className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-900">{entry.competition_name}</span>
              </div>
              <div className="flex items-center space-x-4 text-xs text-orange-600">
                <span>{entry.club_name}</span>
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTimeAgo(entry.entry_date)}
                </span>
                <span>Attempt #{entry.attempt_number}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-orange-900">
                  {formatCurrency(7.50)} {/* Standard retry price for now */}
                </div>
                <div className="text-xs text-orange-600">Entry Fee</div>
              </div>
              
              <Button 
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => onPlayAgain(entry.competition_id)}
                data-testid={`player-play-again-btn-${entry.competition_id}`}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Have Another Go
              </Button>
            </div>
          </div>
        ))}
      </div>

      {recentMisses.length > 3 && (
        <div className="text-center mt-4">
          <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
            View All Recent Misses ({recentMisses.length - 3} more)
          </Button>
        </div>
      )}
    </Card>
  );
}