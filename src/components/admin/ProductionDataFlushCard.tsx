import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getDemoModeDisplayConfig } from "@/lib/demoMode";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const ProductionDataFlushCard = () => {
  const [flushing, setFlushing] = useState(false);
  const { toast } = useToast();
  const { environmentType, isDemoMode } = getDemoModeDisplayConfig();

  const handleFlushProduction = async () => {
    setFlushing(true);
    try {
      const { data, error } = await supabase.rpc('flush_production_data', {
        p_confirmation_text: 'FLUSH_PRODUCTION_DATA_CONFIRMED',
        p_keep_super_admin: true
      });

      if (error) throw error;

      toast({
        title: "Production data flushed",
        description: (data as any)?.message || "All non-demo data has been removed from production",
      });
    } catch (error) {
      console.error('Error flushing production data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to flush production data",
        variant: "destructive",
      });
    } finally {
      setFlushing(false);
    }
  };

  // Only show on production environment
  if (environmentType !== 'production') {
    return null;
  }

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Production Data Management
        </CardTitle>
        <CardDescription>
          Dangerous operation: Remove all non-demo data from production environment
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="destructive">Production Environment</Badge>
          <span className="text-sm text-muted-foreground">
            This operation is only available in production
          </span>
        </div>

        <div className="p-4 bg-red-100 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-2">⚠️ WARNING</h4>
          <p className="text-sm text-red-700 mb-2">
            This will permanently delete ALL non-demo data including:
          </p>
          <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
            <li>All real clubs, players, entries, and competitions</li>
            <li>All verifications and claims</li>
            <li>All uploaded files and user data</li>
          </ul>
          <p className="text-sm text-red-700 mt-2 font-semibold">
            Only the Super Admin account and demo data will remain.
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              disabled={flushing}
              className="w-full"
            >
              {flushing ? "Flushing Production Data..." : "Flush Production Data"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Confirm Production Data Flush
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>This is an irreversible action that will:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Delete all real customer data</li>
                  <li>Delete all real clubs and competitions</li>
                  <li>Delete all real entries and payments</li>
                  <li>Keep only demo data and the Super Admin</li>
                </ul>
                <p className="font-semibold text-red-600 mt-4">
                  Are you absolutely sure you want to proceed?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleFlushProduction}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, Flush Production Data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};