import { useEffect, useRef } from 'react';
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
 * - Existing email: same flow, profiles are created/updated as needed
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

export default function AuthCallback() {
  const once = useRef(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const go = async () => {
      if (once.current) return;
      once.current = true;

      const full = window.location.href;
      const hash = window.location.hash || '';
      const cont = params.get('continue') || '/entry-success';

      console.log('[AuthCallback] Processing auth callback', { full, hash, cont });

      // Check for magic link token (custom secure links)
      const token = params.get('token');
      if (token) {
        console.log('[AuthCallback] Processing magic link token');
        try {
          const { data, error } = await supabase.functions.invoke('verify-magic-link', {
            body: { token }
          });

          if (error || !data?.success) {
            console.error('[AuthCallback] Magic link verification failed:', error || data);
            toast({
              title: 'Authentication failed',
              description: 'Magic link invalid or expired.',
              variant: 'destructive',
            });
            navigate('/auth');
            return;
          }

          console.log('[AuthCallback] Magic link verified successfully');
          toast({
            title: "Authentication successful",
            description: "You have been signed in successfully.",
          });
          navigate(data.redirectUrl || cont, { replace: true });
          return;
        } catch (err) {
          console.error('[AuthCallback] Magic link error:', err);
          toast({
            title: 'Authentication failed',
            description: 'Failed to verify magic link.',
            variant: 'destructive',
          });
          navigate('/auth');
          return;
        }
      }

      // Handle Supabase OTP/email auth (hash fragments)
      if (hash) {
        const qp = new URLSearchParams(hash.replace(/^#/, ''));
        const err = qp.get('error');
        const code = qp.get('error_code');
        const desc = qp.get('error_description');

        if (err || code) {
          console.warn('[AuthCallback] Hash error detected', { err, code, desc });
          toast({
            title: 'Authentication failed',
            description: desc || code || 'Email link invalid or expired.',
            variant: 'destructive',
          });
          navigate('/auth');
          return;
        }

        console.log('[AuthCallback] Processing Supabase OTP hash');
        const { error } = await supabase.auth.exchangeCodeForSession(hash);
        if (error) {
          console.error('[AuthCallback] exchangeCodeForSession error', error);
          toast({
            title: 'Authentication failed',
            description: error.message || 'Email link invalid or expired.',
            variant: 'destructive',
          });
          navigate('/auth');
          return;
        }
      }

      // Process pending entry form if exists
      const { SecureStorage } = await import('@/lib/secureStorage');
      const pendingFormData = SecureStorage.getAuthData('pending_entry_form');
      
      if (pendingFormData) {
        console.log('[AuthCallback] Processing pending entry form...');
        
        // Get current session after successful auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          toast({
            title: 'Authentication failed',
            description: 'Session not found after authentication.',
            variant: 'destructive',
          });
          navigate('/auth');
          return;
        }

        const formData: PendingEntryForm = pendingFormData;

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
          toast({
            title: 'Profile creation failed',
            description: profileError.message || 'Please try again.',
            variant: 'destructive',
          });
          navigate('/auth');
          return;
        }

        // Get competition details for entry amount
        const { data: competition, error: competitionError } = await supabase
          .from('competitions')
          .select('entry_fee')
          .eq('id', formData.competitionId)
          .single();

        if (competitionError || !competition) {
          console.error('[AuthCallback] Competition not found:', competitionError);
          toast({
            title: 'Competition not found',
            description: 'The competition may no longer be available.',
            variant: 'destructive',
          });
          navigate('/');
          return;
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
          toast({
            title: 'Entry creation failed',
            description: entryError?.message || 'Please try again.',
            variant: 'destructive',
          });
          navigate('/auth');
          return;
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
        SecureStorage.removeItem('auth_pending_entry_form');

        console.log('[AuthCallback] Entry created successfully:', entry.id);
        
        toast({
          title: "Entry confirmed!",
          description: "Your competition entry has been successfully created.",
        });

        // Navigate to entry success page
        navigate(`/entry-success/${entry.id}`);
        return;
      }

      // Clean up URL and navigate to continue path
      history.replaceState(null, '', window.location.pathname + window.location.search);
      navigate(cont, { replace: true });
    };
    go();
  }, [navigate, params]);

  return (
    <div className="mx-auto my-24 max-w-md rounded-2xl p-8 text-center shadow">
      <div className="mb-3 animate-pulse">⏳</div>
      <h1 className="text-xl font-semibold">Signing you in…</h1>
      <p className="text-muted-foreground">Please wait while we verify your secure entry link.</p>
    </div>
  );
}