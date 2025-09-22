import { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import useAuth from '@/hooks/useAuth';
import useBankingStatus from '@/hooks/useBankingStatus';
import { ROUTES } from '@/routes';
import SiteHeader from '@/components/layout/SiteHeader';
import Section from '@/components/layout/Section';
import CompetitionWizard from '@/components/competitions/CompetitionWizard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface Profile {
  id: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CLUB' | 'PLAYER' | 'INSURANCE_PARTNER';
  club_id?: string;
}

const CompetitionWizardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: bankingLoading, complete: bankingComplete } = useBankingStatus();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for prefill data from state (for duplicate functionality)
  const prefillData = location.state?.prefillData;

  // Fetch user profile and check permissions
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, role, club_id')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user profile',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, toast]);

  // Hard guard the "create competition" route (defense in depth)
  useEffect(() => {
    if (!bankingLoading && !bankingComplete && profile?.role === 'CLUB') {
      toast({
        title: "Banking required",
        description: "Please complete banking details before creating a competition.",
        variant: "destructive",
      });
      navigate(ROUTES.CLUB.BANKING);
    }
  }, [bankingLoading, bankingComplete, profile?.role, navigate, toast]);

  // Loading states
  if (authLoading || loading || (profile?.role === 'CLUB' && (bankingLoading || !bankingComplete))) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Section spacing="lg">
            <div className="max-w-2xl mx-auto space-y-6">
              <Skeleton className="h-8 w-64" />
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          </Section>
        </main>
      </div>
    );
  }

  // ADMIN users don't need to be associated with a club - they can select one
  // Only check club association for non-ADMIN users (though CLUB users no longer have access anyway)
  if (profile.role !== 'ADMIN' && !profile.club_id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-2">Club Not Found</h1>
          <p className="text-muted-foreground">
            Your account is not associated with a club. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1 bg-muted/30">
        <Section spacing="lg">
          <div className="max-w-6xl mx-auto">
            {/* Back Button */}
            <div className="mb-8">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard/admin/competitions')}
                className="gap-2 hover:bg-background"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Competitions
              </Button>
            </div>

            <CompetitionWizard 
              clubId={profile.club_id}
              isAdmin={profile.role === 'ADMIN'}
              prefillData={prefillData}
            />
          </div>
        </Section>
      </main>
    </div>
  );
};

export default CompetitionWizardPage;