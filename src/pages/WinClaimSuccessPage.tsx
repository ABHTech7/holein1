import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Trophy, Mail, Loader2, FileCheck } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getConfig } from "@/lib/featureFlags";

const WinClaimSuccessPage: React.FC = () => {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [competitionName, setCompetitionName] = useState<string>('');
  const [prizeAmount, setPrizeAmount] = useState<number>(0);

  useEffect(() => {
    const loadVerificationData = async () => {
      if (!entryId || authLoading) return;
      
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        // Get verification and competition data
        const { data: verification, error } = await supabase
          .from('verifications')
          .select(`
            id,
            entry:entries!inner(
              competition:competitions!inner(
                name,
                prize_pool
              )
            )
          `)
          .eq('entry_id', entryId)
          .maybeSingle();

        if (error || !verification) {
          console.error('Failed to load verification:', error);
          navigate('/player/dashboard');
          return;
        }

        setVerificationId(verification.id);
        setCompetitionName((verification.entry as any)?.competition?.name || '');
        setPrizeAmount((verification.entry as any)?.competition?.prize_pool || 0);
      } catch (error) {
        console.error('Error loading verification:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVerificationData();
  }, [entryId, user, authLoading, navigate]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      
      <main className="flex-1 py-8 sm:py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
          {/* Success Header */}
          <div className="text-center animate-fade-in">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              Verification Submitted! 🎉
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground px-4">
              Your hole-in-one claim is now under review
            </p>
          </div>

          {/* Main Info Card */}
          <Card className="shadow-soft animate-slide-up">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-4">
                <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-secondary mx-auto" />
                
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
                    What Happens Next?
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Our verification team will review your evidence
                  </p>
                </div>

                {verificationId && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Claim Reference</div>
                    <div className="font-mono text-lg font-semibold text-foreground">
                      #{verificationId.slice(-8).toUpperCase()}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 text-sm sm:text-base">Review Process</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      We'll review your evidence within {getConfig().verificationTimeoutHours} hours. 
                      If approved, your prize will be processed.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mail className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 text-sm sm:text-base">Email Confirmation</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      We've sent a confirmation email with your claim reference number
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2 pt-4">
                <Badge variant="outline" className="text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Evidence Received
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Under Review
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <div className="text-center">
            <Button 
              onClick={() => navigate('/player/dashboard')}
              size="lg"
              className="w-full sm:w-auto min-w-[200px]"
            >
              View My Dashboard
            </Button>
          </div>

          {/* Info Note */}
          <Card className="bg-muted/50">
            <CardContent className="p-4 sm:p-6 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">
                <strong className="text-foreground">Important:</strong> Keep your claim reference number safe. 
                You'll need it to track your verification status.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default WinClaimSuccessPage;
