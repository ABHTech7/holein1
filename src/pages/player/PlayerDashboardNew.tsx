import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Container from "@/components/layout/Container";
import { PlayerSummaryCards } from "@/components/player/PlayerSummaryCards";
import { PlayerEntriesTable } from "@/components/player/PlayerEntriesTable";
import { PlayAgainPanel } from "@/components/player/PlayAgainPanel";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Target } from "lucide-react";
import { clearAllEntryContext } from "@/lib/entryContextPersistence";

interface PlayerEntry {
  id: string;
  created_at: string;
  competition_id: string;
  competition_name: string;
  club_name: string;
  club_slug?: string;
  competition_slug?: string;
  attempt_number: number;
  outcome_self: string | null;
  price_paid: number;
  is_repeat_attempt: boolean;
  entry_date: string;
  status: string;
}

interface PlayerSummary {
  total_entries: number;
  competitions_played: number;
  total_spend: number;
  last_played_at: string | null;
}

export default function PlayerDashboardNew() {
  const { user, session, loading: authLoading } = useAuth();
  
  const navigate = useNavigate();

  const [entries, setEntries] = useState<PlayerEntry[]>([]);
  const [summary, setSummary] = useState<PlayerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [currentFilters, setCurrentFilters] = useState({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/auth');
      return;
    }
  }, [session, authLoading, navigate]);

  // Load initial data
  useEffect(() => {
    if (session && user) {
      loadDashboardData();
    }
  }, [session, user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load summary stats
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_my_entry_totals');
      
      if (summaryError) {
        console.error('Error loading summary:', summaryError);
        toast({
          title: "Error loading summary",
          description: "Could not load your dashboard statistics",
          variant: "destructive"
        });
      } else if (summaryData && summaryData.length > 0) {
        setSummary(summaryData[0]);
      }

      // Load entries
      const { data: entriesData, error: entriesError } = await supabase.rpc('get_my_entries', {
        p_limit: 25,
        p_offset: 0,
        p_filters: currentFilters
      });

      if (entriesError) {
        console.error('Error loading entries:', entriesError);
        toast({
          title: "Error loading entries",
          description: "Could not load your entry history",
          variant: "destructive"
        });
      } else {
        setEntries(entriesData || []);
        setHasMore((entriesData || []).length === 25);
      }

    } catch (error) {
      console.error('Dashboard load error:', error);
      toast({
        title: "Dashboard Error",
        description: "An unexpected error occurred loading your dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMoreEntries = async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_entries', {
        p_limit: 25,
        p_offset: entries.length,
        p_filters: currentFilters
      });

      if (error) {
        console.error('Error loading more entries:', error);
        toast({
          title: "Error loading entries",
          description: "Could not load more entries",
          variant: "destructive"
        });
        return;
      }

      setEntries(prev => [...prev, ...(data || [])]);
      setHasMore((data || []).length === 25);
    } catch (error) {
      console.error('Load more error:', error);
    }
  };

  const handleFilterChange = async (filters: any) => {
    setCurrentFilters(filters);
    
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_my_entries', {
        p_limit: 25,
        p_offset: 0,
        p_filters: filters
      });

      if (error) {
        console.error('Error filtering entries:', error);
        toast({
          title: "Filter Error",
          description: "Could not apply filters",
          variant: "destructive"
        });
        return;
      }

      setEntries(data || []);
      setHasMore((data || []).length === 25);
    } catch (error) {
      console.error('Filter error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAgain = async (competitionId: string) => {
    try {
      // Call RPC to create new entry with cooldown check
      const { data, error } = await supabase
        .rpc('create_new_entry_for_current_email', {
          p_competition_id: competitionId
        });

      if (error) throw error;

      // Type cast the response
      const result = data as { 
        success?: boolean;
        code?: string;
        entry_id?: string; 
        duplicate_prevented?: boolean;
        message?: string;
      } | null;

      // Check for cooldown_active response
      if (result?.success === false && result?.code === 'cooldown_active') {
        clearAllEntryContext();
        toast({
          title: "Cooldown Active",
          description: result.message || "You've already played in the last 12 hours. Please try again later.",
          variant: "destructive"
        });
        return;
      }

      if (!result?.entry_id) {
        throw new Error('No entry ID returned');
      }

      // Clear entry context before navigating
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
    }
  };

  // Get recent misses for play again panel with slugs
  const recentMisses = entries
    .filter(entry => 
      ['miss', 'auto_miss'].includes(entry.outcome_self || '') &&
      new Date(entry.entry_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    )
    .slice(0, 5);

  if (authLoading || !session) {
    return (
      <Container className="py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8" data-testid="player-dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Golf Dashboard</h1>
        <p className="text-muted-foreground">
          Track your hole-in-one attempts and compete across different golf clubs
        </p>
      </div>

      <PlayerSummaryCards data={summary} loading={loading} />

      <PlayAgainPanel 
        recentMisses={recentMisses} 
        onPlayAgain={handlePlayAgain}
      />

      <PlayerEntriesTable
        entries={entries}
        loading={loading}
        onLoadMore={loadMoreEntries}
        hasMore={hasMore}
        onFilterChange={handleFilterChange}
        onPlayAgain={handlePlayAgain}
      />
    </Container>
  );
}