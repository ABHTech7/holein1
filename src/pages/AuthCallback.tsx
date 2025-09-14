import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import Container from '@/components/layout/Container';
import { getAvailablePaymentProviders } from '@/lib/paymentService';

/**
 * Test checklist for AuthCallback:
 * - New email: submit form → toast "secure entry link" → click email → AuthCallback creates profile + entry → routed to /entry-success/:id
 * - Existing email: same flow, no "User creation failed" popup
 * - No providers: entry status becomes `active` (not `completed`), UI shows "offline payment at clubhouse"
 * - Admin "Copy link" buttons copy to clipboard with success toast
 */

interface PendingEntryForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: number | null;
  gender: string;
  handicap: number | null;
  competitionId: string;
  termsAccepted: boolean;
}

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'loading' | 'processing' | 'error'>('loading');

  useEffect(() => {
    const handleAuth = async () => {
      console.warn('[AuthCallback] Starting auth callback process...');
      
      try {
        // Poll for session up to 5 seconds (250ms intervals)
        let session = null;
        let attempts = 0;
        const maxAttempts = 20; // 5 seconds / 250ms

        while (!session && attempts < maxAttempts) {
          const { data } = await supabase.auth.getSession();
          session = data.session;
          
          if (!session) {
            await new Promise(resolve => setTimeout(resolve, 250));
            attempts++;
          }
        }

        if (!session?.user) {
          console.error('[AuthCallback] No session found after polling');
          toast({
            title: "Authentication failed",
            description: "Please try clicking the link again or request a new one.",
            variant: "destructive"
          });
          navigate('/auth');
          return;
        }

        console.log('[AuthCallback] Session found, processing entry...');
        setStatus('processing');

        // Get continue URL or default
        const continueUrl = searchParams.get('continue') || '/';

        // Check for pending entry form
        const pendingFormData = localStorage.getItem('pending_entry_form');
        
        if (pendingFormData && session.user) {
          console.log('[AuthCallback] Processing pending entry form...');
          
          const formData: PendingEntryForm = JSON.parse(pendingFormData);

          // Upsert profile with stored form data
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              email: formData.email,
              first_name: formData.firstName,
              last_name: formData.lastName,
              phone: formData.phone,
              age_years: formData.age,
              gender: formData.gender,
              handicap: formData.handicap,
            });

          if (profileError) {
            console.error('[AuthCallback] Profile upsert failed:', profileError);
            throw profileError;
          }

          // Get competition details for entry amount
          const { data: competition, error: competitionError } = await supabase
            .from('competitions')
            .select('entry_fee')
            .eq('id', formData.competitionId)
            .single();

          if (competitionError || !competition) {
            console.error('[AuthCallback] Competition not found:', competitionError);
            throw new Error('Competition not found');
          }

          // Insert entry record
          const { data: entry, error: entryError } = await supabase
            .from('entries')
            .insert({
              player_id: session.user.id,
              competition_id: formData.competitionId,
              amount_minor: competition.entry_fee * 100,
              terms_accepted_at: formData.termsAccepted ? new Date().toISOString() : null,
              terms_version: '2.0',
              status: 'pending',
            })
            .select()
            .single();

          if (entryError || !entry) {
            console.error('[AuthCallback] Entry creation failed:', entryError);
            throw entryError;
          }

          // Check if payment providers are available
          const availableProviders = getAvailablePaymentProviders();
          
          if (availableProviders.length === 0) {
            // No payment providers - mark entry as active
            await supabase
              .from('entries')
              .update({
                payment_provider: null,
                paid: false,
                payment_date: null,
                status: 'active' // Mark as active (playable) but unpaid
              })
              .eq('id', entry.id);

            console.log('[AuthCallback] Entry marked as active (no payment providers)');
          }

          // Clear pending form data
          localStorage.removeItem('pending_entry_form');

          console.log('[AuthCallback] Entry created successfully:', entry.id);
          
          toast({
            title: "Entry confirmed!",
            description: "Your competition entry has been successfully created.",
          });

          // Navigate to entry success page
          navigate(`/entry-success/${entry.id}`);
          return;
        }

        // No pending form, just navigate to continue URL
        console.log('[AuthCallback] No pending form, navigating to:', continueUrl);
        navigate(continueUrl);

      } catch (error: any) {
        console.error('[AuthCallback] Error processing auth callback:', error);
        setStatus('error');
        
        toast({
          title: "Entry processing failed",
          description: error.message || "Please try again or contact support.",
          variant: "destructive"
        });
        
        // Navigate to appropriate fallback
        navigate('/auth');
      } finally {
        setLoading(false);
      }
    };

    handleAuth();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <Container>
          <Card className="w-full max-w-md mx-auto">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
              {status === 'loading' && (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <h3 className="text-lg font-semibold">Signing you in...</h3>
                  <p className="text-sm text-muted-foreground">
                    Please wait while we verify your secure entry link.
                  </p>
                </>
              )}
              
              {status === 'processing' && (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <h3 className="text-lg font-semibold">Finalizing your entry...</h3>
                  <p className="text-sm text-muted-foreground">
                    Creating your profile and competition entry.
                  </p>
                </>
              )}
              
              {status === 'error' && (
                <>
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                    <span className="text-destructive font-bold">!</span>
                  </div>
                  <h3 className="text-lg font-semibold">Something went wrong</h3>
                  <p className="text-sm text-muted-foreground">
                    Please try clicking the link again or request a new one.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Container>
      </main>
      
      <SiteFooter />
    </div>
  );
};

export default AuthCallback;