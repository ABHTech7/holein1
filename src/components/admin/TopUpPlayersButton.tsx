import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Users, Plus } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const TopUpPlayersButton = () => {
  const [isCreating, setIsCreating] = useState(false);

  const handleTopUpPlayers = async (playerCount: number) => {
    if (!confirm(`This will add ${playerCount} new demo players distributed across all demo clubs. Continue?`)) {
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('top-up-players', {
        body: { playerCount }
      });
      
      if (error) throw error;

      if (data.success) {
        toast({
          title: "Players Added Successfully",
          description: `Created ${data.playersCreated} players across ${data.distributedAcrossClubs} demo clubs`
        });
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Top-up players error:', error);
      toast({
        title: "Failed to Add Players",
        description: error.message || "Failed to create demo players",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Top-Up Demo Players
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Add new demo players distributed evenly across all existing demo clubs.
          Players will have realistic UK profiles and phone numbers.
        </p>
        <div className="space-y-2">
          <Button 
            onClick={() => handleTopUpPlayers(100)}
            disabled={isCreating}
            variant="outline"
            className="w-full"
          >
            {isCreating ? (
              <>
                <Plus className="mr-2 h-4 w-4 animate-spin" />
                Adding Players...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add 100 Players
              </>
            )}
          </Button>
          <Button 
            onClick={() => handleTopUpPlayers(250)}
            disabled={isCreating}
            variant="outline"
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add 250 Players
          </Button>
          <Button 
            onClick={() => handleTopUpPlayers(500)}
            disabled={isCreating}
            variant="outline"
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add 500 Players
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};