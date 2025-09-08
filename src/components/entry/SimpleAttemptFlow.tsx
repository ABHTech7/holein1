import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Trophy, Zap, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SimpleAttemptFlowProps {
  entryId: string;
  competitionName: string;
  holeNumber: number;
  venueName: string;
  timeRemaining: number;
  onOutcomeReported: (outcome: string) => void;
}

export const SimpleAttemptFlow = ({
  entryId,
  competitionName,
  holeNumber,
  venueName,
  timeRemaining,
  onOutcomeReported
}: SimpleAttemptFlowProps) => {
  const [step, setStep] = useState<'ready' | 'attempting' | 'reporting'>('ready');
  const [submitting, setSubmitting] = useState(false);

  const handleStartAttempt = () => {
    setStep('attempting');
    // Add some excitement with a brief delay
    setTimeout(() => {
      setStep('reporting');
    }, 2000);
  };

  const handleReportOutcome = async (outcome: 'win' | 'miss') => {
    setSubmitting(true);

    try {
      await supabase
        .from('entries')
        .update({
          outcome_self: outcome,
          outcome_reported_at: new Date().toISOString()
        })
        .eq('id', entryId);

      onOutcomeReported(outcome);
      
      toast({
        title: outcome === 'win' ? "🏆 Hole-in-One!" : "Thanks for playing!",
        description: outcome === 'win' ? 
          "Amazing shot! Your win is being verified." : 
          "Better luck next time - try again later!"
      });
    } catch (error) {
      console.error('Error reporting outcome:', error);
      toast({
        title: "Error",
        description: "Failed to report outcome. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (step === 'ready') {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <Target className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl font-['Montserrat']">
            Ready for Your Shot?
          </CardTitle>
          <p className="text-muted-foreground">
            Time to attempt hole {holeNumber} at {venueName}
          </p>
          <Badge variant="outline" className="mx-auto w-fit">
            {formatTime(timeRemaining)} remaining
          </Badge>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-background/50 rounded-lg space-y-2">
            <h4 className="font-semibold flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Remember the Rules
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Ball must go directly into the hole in one stroke</li>
              <li>• Have at least one witness ready</li>
              <li>• Get staff verification if you succeed</li>
            </ul>
          </div>
          
          <Button 
            size="lg" 
            className="w-full text-lg font-semibold py-6"
            onClick={handleStartAttempt}
          >
            <Target className="w-5 h-5 mr-2" />
            I'm Ready - Let's Do This! 🏌️‍♂️
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'attempting') {
    return (
      <Card className="bg-gradient-to-br from-primary/10 to-primary/20 border-primary/30">
        <CardContent className="text-center py-12">
          <div className="animate-pulse mb-6">
            <Target className="w-16 h-16 text-primary mx-auto mb-4" />
          </div>
          <h3 className="text-2xl font-bold mb-4">Take Your Shot!</h3>
          <p className="text-lg text-muted-foreground mb-2">
            Make it count... 🏌️‍♂️
          </p>
          <div className="w-32 h-1 bg-primary/30 mx-auto rounded-full overflow-hidden">
            <div className="w-full h-full bg-primary animate-pulse rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">How Did It Go?</CardTitle>
        <p className="text-muted-foreground">
          Report your result honestly - we'll verify hole-in-ones!
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            size="lg"
            variant="default"
            className="py-6 text-lg font-semibold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white border-0"
            onClick={() => handleReportOutcome('win')}
            disabled={submitting}
          >
            <Trophy className="w-6 h-6 mr-2" />
            🎉 HOLE-IN-ONE! 🎉
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            className="py-6 text-lg font-semibold"
            onClick={() => handleReportOutcome('miss')}
            disabled={submitting}
          >
            <Target className="w-5 h-5 mr-2" />
            I Missed This Time
          </Button>
        </div>

        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            💡 Remember: Hole-in-ones require witness verification
          </p>
        </div>
      </CardContent>
    </Card>
  );
};