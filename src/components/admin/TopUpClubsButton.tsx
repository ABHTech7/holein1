import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Building2, Plus } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const TopUpClubsButton = () => {
  const [isCreating, setIsCreating] = useState(false);

  const handleTopUpClubs = async () => {
    if (!confirm("This will add 25 new demo clubs (12 with 1 competition, 13 with 2 competitions). Continue?")) {
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('top-up-clubs');
      
      if (error) throw error;

      if (data.success) {
        toast({
          title: "Clubs Added Successfully",
          description: `Created ${data.clubsCreated} clubs and ${data.competitionsCreated} competitions`
        });
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Top-up clubs error:', error);
      toast({
        title: "Failed to Add Clubs",
        description: error.message || "Failed to create demo clubs",
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
          <Building2 className="h-5 w-5" />
          Top-Up Demo Clubs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Add 25 new demo clubs. Half will have 1 competition, half will have 2 competitions each.
          Entry fees will be £10, £25, or £50 only.
        </p>
        <Button 
          onClick={handleTopUpClubs}
          disabled={isCreating}
          variant="outline"
          className="w-full"
        >
          {isCreating ? (
            <>
              <Plus className="mr-2 h-4 w-4 animate-spin" />
              Adding Clubs...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add 25 Demo Clubs
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};