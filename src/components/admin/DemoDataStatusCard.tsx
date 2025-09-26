import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, Trash2, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface DemoStats {
  demo_profiles: number;
  demo_clubs: number;
  demo_competitions: number;
  demo_entries: number;
  total_profiles: number;
  total_clubs: number;
  total_competitions: number;
  total_entries: number;
  latest_demo_session: string | null;
}

export function DemoDataStatusCard() {
  const [stats, setStats] = useState<DemoStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_demo_data_stats');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error: any) {
      console.error("Error fetching demo stats:", error);
      toast({
        title: "Failed to load demo statistics",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async (cleanupAll: boolean) => {
    setCleaning(true);
    try {
      const { data, error } = await supabase.rpc('cleanup_demo_data', { cleanup_all: cleanupAll });
      
      if (error) throw error;
      
      toast({
        title: "Demo data cleaned up",
        description: `Removed ${(data as any).deleted_profiles} profiles, ${(data as any).deleted_clubs} clubs, ${(data as any).deleted_competitions} competitions, and ${(data as any).deleted_entries} entries.`
      });
      
      // Refresh stats after cleanup
      fetchStats();
    } catch (error: any) {
      console.error("Error cleaning up demo data:", error);
      toast({
        title: "Cleanup failed", 
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCleaning(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Demo Data Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading statistics...</div>
        </CardContent>
      </Card>
    );
  }

  const hasDemoData = stats && (stats.demo_profiles > 0 || stats.demo_clubs > 0 || stats.demo_entries > 0);
  const demoPercentage = stats ? {
    profiles: stats.total_profiles > 0 ? Math.round((stats.demo_profiles / stats.total_profiles) * 100) : 0,
    clubs: stats.total_clubs > 0 ? Math.round((stats.demo_clubs / stats.total_clubs) * 100) : 0,
    entries: stats.total_entries > 0 ? Math.round((stats.demo_entries / stats.total_entries) * 100) : 0
  } : { profiles: 0, clubs: 0, entries: 0 };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Demo Data Status
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStats}
            disabled={loading}
          >
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Monitor and manage demo data in your database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Status Overview */}
        <div className="flex items-center gap-2">
          {hasDemoData ? (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <Badge variant="outline" className="text-amber-700 border-amber-300">
                Demo Data Present
              </Badge>
            </>
          ) : (
            <>
              <Database className="w-4 h-4 text-green-500" />
              <Badge variant="outline" className="text-green-700 border-green-300">
                Clean Database
              </Badge>
            </>
          )}
        </div>

        {/* Statistics Grid */}
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Profiles</span>
                <div className="text-right">
                  <div className="text-sm font-medium">{stats.demo_profiles}/{stats.total_profiles}</div>
                  {demoPercentage.profiles > 0 && (
                    <div className="text-xs text-amber-600">{demoPercentage.profiles}% demo</div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Clubs</span>
                <div className="text-right">
                  <div className="text-sm font-medium">{stats.demo_clubs}/{stats.total_clubs}</div>
                  {demoPercentage.clubs > 0 && (
                    <div className="text-xs text-amber-600">{demoPercentage.clubs}% demo</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Competitions</span>
                <div className="text-right">
                  <div className="text-sm font-medium">{stats.demo_competitions}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Entries</span>
                <div className="text-right">
                  <div className="text-sm font-medium">{stats.demo_entries}/{stats.total_entries}</div>
                  {demoPercentage.entries > 0 && (
                    <div className="text-xs text-amber-600">{demoPercentage.entries}% demo</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Last Demo Session */}
        {stats?.latest_demo_session && (
          <div className="text-xs text-muted-foreground">
            Last seeded: {formatDistanceToNow(new Date(stats.latest_demo_session), { addSuffix: true })}
          </div>
        )}

        {/* Cleanup Actions */}
        {hasDemoData && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCleanup(false)}
              disabled={cleaning}
              className="flex-1"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clean Recent
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleCleanup(true)}
              disabled={cleaning}
              className="flex-1"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clean All Demo
            </Button>
          </div>
        )}
        
      </CardContent>
    </Card>
  );
}