import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { TrendingUp, Plus } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const TopUpEntriesButton = () => {
  const [isCreating, setIsCreating] = useState(false);

  const handleTopUpEntries = async (entryCount: number) => {
    if (!confirm(`This will add ${entryCount} new demo entries spread across current and 2 previous months. Continue?`)) {
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('top-up-entries', {
        body: { entryCount }
      });
      
      if (error) {
        console.error('Function error:', error);
        throw new Error(error.message || 'Failed to invoke function');
      }

      if (data?.success) {
        if (data.entriesCreated === 0) {
          toast({
            title: "No Entries Created",
            description: "All player-competition combinations already exist or database constraints prevented creation.",
            variant: "destructive",
          });
        } else {
          const { monthlyBreakdown } = data;
          toast({
            title: "Entries Added Successfully",
            description: `Created ${data.entriesCreated} entries. Current month: ${monthlyBreakdown.current}, Last month: ${monthlyBreakdown.lastMonth}, Two months ago: ${monthlyBreakdown.twoMonthsAgo}`
          });
        }
      } else {
        throw new Error(data?.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Top-up entries error:', error);
      const errorMessage = error.message || 'Failed to create demo entries';
      
      if (errorMessage.includes('No demo players found')) {
        toast({
          title: "No Demo Players Found",
          description: "Please run 'Top-Up Demo Players' first to create players for entries.",
          variant: "destructive"
        });
      } else if (errorMessage.includes('No active demo competitions found')) {
        toast({
          title: "No Demo Competitions Found",
          description: "Please run 'Top-Up Demo Clubs' first to create competitions for entries.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Failed to Add Entries",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Top-Up Demo Entries
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Add new demo entries distributed across current and 2 previous months.
          25% win rate, 75% miss rate. No future dates allowed.
        </p>
        <div className="space-y-2">
          <Button 
            onClick={() => handleTopUpEntries(100)}
            disabled={isCreating}
            variant="outline"
            className="w-full"
          >
            {isCreating ? (
              <>
                <Plus className="mr-2 h-4 w-4 animate-spin" />
                Adding Entries...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add 100 Entries
              </>
            )}
          </Button>
          <Button 
            onClick={() => handleTopUpEntries(250)}
            disabled={isCreating}
            variant="outline"
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add 250 Entries
          </Button>
          <Button 
            onClick={() => handleTopUpEntries(500)}
            disabled={isCreating}
            variant="outline"
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add 500 Entries
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};