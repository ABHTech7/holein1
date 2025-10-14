import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Target, Loader2 } from "lucide-react";

interface Club {
  id: string;
  name: string;
  is_demo_data: boolean;
}

export const TargetedClubDemoData = () => {
  const { toast } = useToast();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClubs, setLoadingClubs] = useState(true);
  
  const [competitionsPerClub, setCompetitionsPerClub] = useState(2);
  const [playersPerClub, setPlayersPerClub] = useState(100);
  const [entriesPerCompetition, setEntriesPerCompetition] = useState(50);
  const [winRate, setWinRate] = useState(0.2);
  const [markClubsAsDemo, setMarkClubsAsDemo] = useState(false);

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, is_demo_data')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setClubs(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading clubs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingClubs(false);
    }
  };

  const toggleClub = (clubId: string) => {
    setSelectedClubIds(prev => 
      prev.includes(clubId) 
        ? prev.filter(id => id !== clubId)
        : [...prev, clubId]
    );
  };

  const handleGenerate = async () => {
    if (selectedClubIds.length === 0) {
      toast({
        title: "No clubs selected",
        description: "Please select at least one club",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('targeted-club-demo-data', {
        body: {
          clubIds: selectedClubIds,
          competitionsPerClub,
          playersPerClub,
          entriesPerCompetition,
          winRate: winRate / 100,
          markClubsAsDemo,
        }
      });

      if (error) throw error;

      toast({
        title: "Demo data generated",
        description: `Created ${data.summary.competitions} competitions, ${data.summary.players} players, and ${data.summary.entries} entries`,
      });

      setSelectedClubIds([]);
      await loadClubs();
    } catch (error: any) {
      toast({
        title: "Error generating demo data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedClubs = clubs.filter(c => selectedClubIds.includes(c.id));
  const totalCompetitions = selectedClubIds.length * competitionsPerClub;
  const totalPlayers = selectedClubIds.length * playersPerClub;
  const totalEntries = totalCompetitions * entriesPerCompetition;
  const expectedWins = Math.round(totalEntries * (winRate / 100));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Targeted Club Demo Data
        </CardTitle>
        <CardDescription>
          Add demo data to specific clubs for realistic demonstrations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Club Selection */}
        <div className="space-y-3">
          <Label>Select Clubs ({selectedClubIds.length} selected)</Label>
          {loadingClubs ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading clubs...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {clubs.map(club => (
                <div key={club.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`club-${club.id}`}
                    checked={selectedClubIds.includes(club.id)}
                    onCheckedChange={() => toggleClub(club.id)}
                  />
                  <label 
                    htmlFor={`club-${club.id}`}
                    className="text-sm cursor-pointer flex items-center gap-1"
                  >
                    {club.name}
                    {club.is_demo_data && (
                      <span className="text-xs text-muted-foreground">(demo)</span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Competitions per club: {competitionsPerClub}</Label>
            <Slider
              value={[competitionsPerClub]}
              onValueChange={([v]) => setCompetitionsPerClub(v)}
              min={1}
              max={5}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Label>Players per club: {playersPerClub}</Label>
            <Slider
              value={[playersPerClub]}
              onValueChange={([v]) => setPlayersPerClub(v)}
              min={50}
              max={500}
              step={50}
            />
          </div>

          <div className="space-y-2">
            <Label>Entries per competition: {entriesPerCompetition}</Label>
            <Slider
              value={[entriesPerCompetition]}
              onValueChange={([v]) => setEntriesPerCompetition(v)}
              min={20}
              max={200}
              step={10}
            />
          </div>

          <div className="space-y-2">
            <Label>Win rate: {winRate}%</Label>
            <Slider
              value={[winRate]}
              onValueChange={([v]) => setWinRate(v)}
              min={0.1}
              max={1}
              step={0.1}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="mark-demo"
              checked={markClubsAsDemo}
              onCheckedChange={(checked) => setMarkClubsAsDemo(checked as boolean)}
            />
            <Label htmlFor="mark-demo" className="cursor-pointer">
              Mark selected clubs as demo data
            </Label>
          </div>
        </div>

        {/* Preview */}
        {selectedClubIds.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Preview</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Clubs: <span className="font-medium">{selectedClubIds.length}</span></div>
              <div>Competitions: <span className="font-medium">{totalCompetitions}</span></div>
              <div>Players: <span className="font-medium">{totalPlayers}</span></div>
              <div>Entries: <span className="font-medium">{totalEntries}</span></div>
              <div className="col-span-2">Expected wins: <span className="font-medium">{expectedWins}</span></div>
            </div>
            {selectedClubs.length > 0 && (
              <div className="text-xs text-muted-foreground mt-2">
                Selected: {selectedClubs.map(c => c.name).join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Action */}
        <Button 
          onClick={handleGenerate} 
          disabled={loading || selectedClubIds.length === 0}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Demo Data'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
