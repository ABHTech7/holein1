import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import useAuth from '@/hooks/useAuth';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import Section from '@/components/layout/Section';
import CompetitionWizard from '@/components/competitions/CompetitionWizard';
import { Skeleton } from '@/components/ui/skeleton';

interface Profile {
  id: string;
  role: 'ADMIN' | 'CLUB' | 'PLAYER';
  club_id?: string;
}

const CompetitionWizardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
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

  // Loading states
  if (authLoading || loading) {
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
        <SiteFooter />
      </div>
    );
  }

  // Auth guards
  if (!user) {
    return <Navigate to="/players/login" replace />;
  }

  if (!profile || profile.role !== 'CLUB') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            This page is only accessible to club administrators.
          </p>
        </div>
      </div>
    );
  }

  if (!profile.club_id) {
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
      
      <main className="flex-1">
        <Section spacing="lg">
          <div className="max-w-4xl mx-auto">
            {/* Breadcrumbs */}
            <nav className="mb-8">
              <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
                <li><a href="/dashboard/club" className="hover:text-foreground">Dashboard</a></li>
                <li>/</li>
                <li><a href="/dashboard/club" className="hover:text-foreground">Competitions</a></li>
                <li>/</li>
                <li className="text-foreground">New Competition</li>
              </ol>
            </nav>

            <CompetitionWizard 
              clubId={profile.club_id} 
              prefillData={prefillData}
            />
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default CompetitionWizardPage;