import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const SimpleResetDemoButton = () => {
  const [isResetting, setIsResetting] = useState(false);

  const handleResetDemo = async () => {
    if (!confirm("This will delete all demo data and create fresh demo content. Are you sure?")) {
      return;
    }

    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-demo-data');
      
      if (error) throw error;

      toast({
        title: "Demo Reset Complete",
        description: "Fresh demo data has been loaded successfully."
      });
      
      // Refresh the page to show new demo data
      window.location.reload();
    } catch (error: any) {
      console.error('Demo reset error:', error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset demo data",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Demo Data Reset
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Reset all demo data to a fresh state with new clubs, players, and competitions.
        </p>
        <Button 
          onClick={handleResetDemo}
          disabled={isResetting}
          variant="outline"
          className="w-full"
        >
          {isResetting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Resetting Demo Data...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Demo Data
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};