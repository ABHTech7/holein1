import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, RotateCcw, Search, Filter, Target } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface PlayerEntry {
  id: string;
  created_at: string;
  competition_id: string;
  competition_name: string;
  club_name: string;
  attempt_number: number;
  outcome_self: string | null;
  price_paid: number;
  is_repeat_attempt: boolean;
  entry_date: string;
  status: string;
}

interface PlayerEntriesTableProps {
  entries: PlayerEntry[];
  loading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  onFilterChange: (filters: any) => void;
  onPlayAgain: (competitionId: string) => void;
}

export function PlayerEntriesTable({ 
  entries, 
  loading, 
  onLoadMore, 
  hasMore, 
  onFilterChange,
  onPlayAgain
}: PlayerEntriesTableProps) {
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const handleFilterChange = () => {
    const filters: any = {};
    if (search) filters.search = search;
    if (outcomeFilter) filters.outcome = outcomeFilter;
    if (dateFilter) {
      const now = new Date();
      const days = parseInt(dateFilter);
      const fromDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      filters.from = fromDate.toISOString();
    }
    onFilterChange(filters);
  };

  const getOutcomeBadge = (outcome: string | null, status: string) => {
    if (outcome === 'win') {
      return <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20">I Won</Badge>;
    }
    if (outcome === 'miss' || outcome === 'auto_miss') {
      return <Badge variant="secondary">Missed</Badge>;
    }
    if (status === 'verification_pending') {
      return <Badge className="bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20">Pending</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });
  };

  const getAttemptSuffix = (num: number) => {
    if (num === 1) return '1st';
    if (num === 2) return '2nd';
    if (num === 3) return '3rd';
    return `${num}th`;
  };

  if (loading && entries.length === 0) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-testid="player-entries-table">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">My Entries</h2>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search competitions..."
              className="pl-9 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFilterChange()}
            />
          </div>
          
          <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Outcome" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="win">Won</SelectItem>
              <SelectItem value="miss">Missed</SelectItem>
              <SelectItem value="auto_miss">Auto Miss</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Time</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleFilterChange}>
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No entries found</p>
          <p>Start playing competitions to see your entries here!</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Date & Time</th>
                  <th className="text-left py-3 px-2">Competition</th>
                  <th className="text-left py-3 px-2">Club</th>
                  <th className="text-left py-3 px-2">Attempt</th>
                  <th className="text-left py-3 px-2">Outcome</th>
                  <th className="text-left py-3 px-2">Price</th>
                  <th className="text-left py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-muted/20">
                    <td className="py-3 px-2">
                      <div className="text-sm">
                        <div className="font-medium">{formatDate(entry.entry_date)}</div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-medium">{entry.competition_name}</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="text-sm text-muted-foreground">{entry.club_name}</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-medium">{getAttemptSuffix(entry.attempt_number)}</span>
                        {entry.is_repeat_attempt && (
                          <RotateCcw className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      {getOutcomeBadge(entry.outcome_self, entry.status)}
                    </td>
                    <td className="py-3 px-2">
                      <span className="font-medium">{formatCurrency(entry.price_paid)}</span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        {/* Play Again button for misses - shown immediately without delay */}
                        {(entry?.outcome_self === 'miss' || entry?.outcome_self === 'auto_miss') && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => onPlayAgain(entry.competition_id)}
                            data-testid={`player-play-again-btn-${entry.competition_id}`}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Play Again
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="text-center mt-6">
              <Button 
                variant="outline" 
                onClick={onLoadMore}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}