import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { showSupabaseError } from '@/lib/showSupabaseError';
import { RateLimiter } from '@/lib/rateLimiter';
import { getCooldownState, startCooldown, isCooldownActive, getRemainingSeconds } from '@/lib/cooldownPersistence';

interface ResendMagicLinkProps {
  email: string;
  redirectUrl?: string;
  onResendSuccess?: () => void;
  onResendError?: (error: string) => void;
  showAsCard?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
}

const RESEND_COOLDOWN_SECONDS = parseInt(import.meta.env.VITE_RESEND_COOLDOWN_SECONDS as string, 10) || 60;
const MAX_RESEND_ATTEMPTS = 5;

export const ResendMagicLink = ({
  email,
  redirectUrl,
  onResendSuccess,
  onResendError,
  showAsCard = false,
  size = 'default',
  variant = 'outline'
}: ResendMagicLinkProps) => {
  const { sendOtp } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);

  // Get identifier for rate limiting (email + IP simulation)
  const rateLimitId = `resend_${email}`;
  const cooldownKey = `resend_${email}`;

  useEffect(() => {
    // Check initial rate limit status
    const remaining = RateLimiter.getRemainingAttempts(rateLimitId, MAX_RESEND_ATTEMPTS);
    setAttemptCount(MAX_RESEND_ATTEMPTS - remaining);
    
    // Check for persistent cooldown
    const cooldownState = getCooldownState(cooldownKey);
    if (cooldownState.isActive) {
      setCooldownSeconds(cooldownState.remainingSeconds);
    }
  }, [rateLimitId, cooldownKey]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const handleResend = async () => {
    // Check rate limiting
    if (RateLimiter.isRateLimited(rateLimitId, MAX_RESEND_ATTEMPTS, 5 * 60 * 1000)) {
      const timeUntilReset = RateLimiter.getTimeUntilReset(rateLimitId);
      const minutesLeft = Math.ceil(timeUntilReset / (60 * 1000));
      toast({ title: "Too many attempts", description: `Please wait ${minutesLeft} minutes before trying again.`, variant: "destructive" });
      onResendError?.("Rate limit exceeded");
      return;
    }

    // Check for active persistent cooldown
    if (isCooldownActive(cooldownKey)) {
      const remaining = getRemainingSeconds(cooldownKey);
      toast({ title: "Please wait", description: `You can resend in ${remaining} seconds.`, variant: "destructive" });
      return;
    }

    setIsResending(true);

    try {
      console.info('[ResendMagicLink] Resending branded link for:', email);

      // Try to derive competition context for branding
      const { getPendingEntryContext } = await import('@/lib/entryContextPersistence');
      const entryContext = getPendingEntryContext();

      // Derive slugs from entry context or current URL/search params
      let clubSlug: string | undefined = entryContext?.clubSlug;
      let competitionSlug: string | undefined = entryContext?.competitionSlug;

      if (!clubSlug || !competitionSlug) {
        try {
          const url = new URL(window.location.href);
          const qpClub = url.searchParams.get('club') || url.searchParams.get('clubSlug') || undefined;
          const qpComp = url.searchParams.get('competition') || url.searchParams.get('competitionSlug') || undefined;
          const pathParts = window.location.pathname.split('/').filter(Boolean);
          // Expect: /competition/{clubSlug}/{competitionSlug}/enter
          if (!qpClub && !qpComp && pathParts[0] === 'competition') {
            clubSlug = clubSlug || pathParts[1];
            competitionSlug = competitionSlug || pathParts[2];
          } else {
            clubSlug = clubSlug || qpClub;
            competitionSlug = competitionSlug || qpComp;
          }
        } catch {}
      }

      // Build competition URL fallback-safe
      const competitionUrl = (clubSlug && competitionSlug)
        ? `${window.location.origin}/competition/${clubSlug}/${competitionSlug}/enter`
        : `${window.location.origin}`;

      // Prepare minimal branding
      const firstName = entryContext?.formData?.firstName || 'Golfer';
      const lastName = entryContext?.formData?.lastName || '';
      const phone = entryContext?.formData?.phone || '';
      const ageYears = entryContext?.formData?.age ?? 18;
      const handicap = entryContext?.formData?.handicap ?? null;

      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('send-branded-magic-link', {
        body: {
          email,
          firstName,
          lastName,
          phone,
          ageYears,
          handicap,
          competitionUrl,
        }
      });

      if (error || !data?.success) {
        const errMsg = (data?.error as string) || error?.message || 'Failed to send entry link';
        throw new Error(errMsg);
      }

      // Clear rate limit on successful send
      RateLimiter.clearLimit(rateLimitId);
      setAttemptCount(0);

      // Start persistent cooldown
      startCooldown(cooldownKey, RESEND_COOLDOWN_SECONDS);
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);

      toast({ title: "Link sent!", description: "Check your inbox for the new secure link." });
      onResendSuccess?.();
    } catch (error: any) {
      console.error('[ResendMagicLink] Resend failed:', error);
      setAttemptCount(prev => prev + 1);
      const errorMessage = showSupabaseError(error, 'Magic Link Resend');
      toast({ title: "Failed to resend link", description: errorMessage, variant: "destructive" });
      onResendError?.(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const isDisabled = isResending || cooldownSeconds > 0 || attemptCount >= MAX_RESEND_ATTEMPTS;
  const remaining = RateLimiter.getRemainingAttempts(rateLimitId, MAX_RESEND_ATTEMPTS);

  const buttonContent = (
    <>
      {isResending ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
          Resending...
        </>
      ) : cooldownSeconds > 0 ? (
        <>
          <Clock className="w-4 h-4 mr-2" />
          <span data-testid="resend-cooldown">Resend in {cooldownSeconds}s</span>
        </>
      ) : (
        <>
          <Mail className="w-4 h-4 mr-2" />
          Resend Link
        </>
      )}
    </>
  );

  const resendButton = (
    <Button
      onClick={handleResend}
      disabled={isDisabled}
      variant={variant}
      size={size}
      className="w-full"
      aria-label={`Resend magic link to ${email}`}
      data-testid="resend-magic-link-btn"
    >
      {buttonContent}
    </Button>
  );

  if (showAsCard) {
    return (
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-1 flex-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Didn't receive the email?
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Check your spam folder or request a new link. Link valid for 6 hours.
              </p>
              {attemptCount > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {remaining} attempts remaining
                </p>
              )}
            </div>
          </div>
          
          {resendButton}
          
          {attemptCount >= MAX_RESEND_ATTEMPTS && (
            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Maximum attempts reached. Please try again later or contact support.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {resendButton}
      {attemptCount > 0 && remaining > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          {remaining} attempts remaining
        </p>
      )}
      {attemptCount >= MAX_RESEND_ATTEMPTS && (
        <p className="text-xs text-center text-destructive">
          Maximum attempts reached. Please try again later.
        </p>
      )}
    </div>
  );
};