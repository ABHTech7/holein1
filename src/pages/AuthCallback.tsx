import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Container from "@/components/layout/Container";
import { 
  getEntryContext, 
  clearEntryContext, 
  getEntryContinuationUrl,
  isEntryContextValid 
} from "@/lib/entryContext";

export default function AuthCallback() {
  const once = useRef(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const run = async () => {
      if (once.current) return;
      once.current = true;

      // Parse URL parameters for both query string and hash
      const code = params.get("code");
      const token_hash = params.get("token_hash");
      const type = params.get("type");
      const error = params.get("error") || params.get("error_code");
      const error_description = params.get("error_description");
      const emailFromUrl = params.get("email");
      const fullUrl = window.location.href;

      // Fallback email from localStorage if not in URL (6-hour TTL)
      let fallbackEmail = null;
      try {
        const stored = localStorage.getItem('last_auth_email');
        if (stored) {
          const { email, timestamp } = JSON.parse(stored);
          // Check if expired (6 hours)
          if (Date.now() - timestamp < 6 * 60 * 60 * 1000) {
            fallbackEmail = email;
          }
        }
      } catch (error) {
        console.warn('[AuthCallback] Error reading localStorage email:', error);
      }
      
      const email = emailFromUrl || fallbackEmail;

      // Determine authentication mode
      const mode = token_hash ? 'token_hash' : (code ? 'auth_code' : 'legacy_hash');
      console.log(`[AuthCallback] mode=${mode}`, { 
        hasTokenHash: !!token_hash,
        hasCode: !!code, 
        type,
        error, 
        hasEmail: !!email,
        emailSource: emailFromUrl ? 'url' : 'localStorage'
      });


      // Handle error parameters from the URL
      if (error) {
        console.warn("[AuthCallback] Error returned in params:", {
          error,
          error_description,
          fullUrl,
        });
        
        // Handle expired/invalid links with proper UI
        if (error === 'expired_token' || error === 'invalid_grant' || error_description?.includes('expired')) {
          const redirectUrl = email ? `/auth/expired-link?email=${encodeURIComponent(email)}&reason=expired` : '/auth/expired-link?reason=expired';
          navigate(redirectUrl, { replace: true });
          return;
        }
        
        toast({
          title: "Authentication failed",
          description: error_description || "Email link invalid or expired.",
          variant: "destructive",
        });
        navigate("/auth", { replace: true });
        return;
      }

      // Handle token_hash flow (direct verifyOtp)
      if (token_hash) {
        console.log('[AuthCallback] token_hash found, using verifyOtp directly');
        
        if (!email) {
          console.error('[AuthCallback] token_hash flow requires email');
          navigate('/auth/expired-link?reason=missing_email&auto_resend=1', { replace: true });
          return;
        }

        try {
          const otpType = (type as 'magiclink' | 'signup' | 'recovery' | 'invite') ?? 'magiclink';
          const { error: verifyError } = await supabase.auth.verifyOtp({
            type: otpType,
            token_hash,
            email
          });

          if (verifyError) {
            console.error('[AuthCallback] token_hash verifyOtp failed:', verifyError.message);
            const redirectUrl = `/auth/expired-link?email=${encodeURIComponent(email)}&reason=expired&auto_resend=1`;
            navigate(redirectUrl, { replace: true });
            return;
          }

          console.log('[AuthCallback] token_hash verifyOtp successful');
        } catch (error: any) {
          console.error('[AuthCallback] token_hash verifyOtp threw error:', error);
          const redirectUrl = `/auth/expired-link?email=${encodeURIComponent(email)}&reason=expired&auto_resend=1`;
          navigate(redirectUrl, { replace: true });
          return;
        }
      }
      
      // Handle code exchange (PKCE flow)  
      else if (code) {
        console.log('[AuthCallback] auth_code found, attempting PKCE exchange');
        
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(fullUrl);
          
          if (exchangeError) {
            console.error('[AuthCallback] Code exchange failed:', exchangeError.message);
            
            // Handle PKCE verifier missing error - redirect to auto-resend
            if (exchangeError.message?.includes('code verifier') || 
                exchangeError.message?.includes('both auth code and code verifier should be non-empty')) {
              console.warn('[AuthCallback] PKCE verifier missing - redirecting to auto-resend');
              const redirectUrl = email ? 
                `/auth/expired-link?email=${encodeURIComponent(email)}&reason=pkce_missing&auto_resend=1` : 
                '/auth/expired-link?reason=pkce_missing&auto_resend=1';
              navigate(redirectUrl, { replace: true });
              return;
            }
            
            // Handle other exchange errors - expired or invalid grant  
            else if (exchangeError.message?.includes('expired') || 
                     exchangeError.message?.includes('invalid_grant')) {
              console.warn('[AuthCallback] Token expired or invalid grant');
              const redirectUrl = email ? `/auth/expired-link?email=${encodeURIComponent(email)}&reason=expired&auto_resend=1` : '/auth/expired-link?reason=expired';
              navigate(redirectUrl, { replace: true });
              return;
            }
            
            // Other unexpected errors
            else {
              toast({
                title: "Authentication failed", 
                description: exchangeError.message || "Email link invalid or expired.",
                variant: "destructive",
              });
              navigate("/auth", { replace: true });
              return;
            }
          }
          
          console.log('[AuthCallback] auth_code exchange successful');
        } catch (error: any) {
          console.error('[AuthCallback] Exchange threw error:', error);
          navigate("/auth/expired-link", { replace: true });
          return;
        }
      } else {
        // Legacy hash-based flow (fallback)
        const hash = window.location.hash || "";
        console.log('[AuthCallback] legacy_hash mode, trying hash:', hash.substring(0, 50));
        
        if (!hash) {
          console.warn('[AuthCallback] No token_hash, code, or hash found');
          const redirectUrl = email ? 
            `/auth/expired-link?email=${encodeURIComponent(email)}&reason=missing&auto_resend=1` : 
            '/auth/expired-link?reason=missing&auto_resend=1';
          navigate(redirectUrl, { replace: true });
          return;
        }
        
        try {
          const { error: hashError } = await supabase.auth.exchangeCodeForSession(hash);
          
          if (hashError) {
            console.error('[AuthCallback] legacy_hash exchange failed:', hashError.message);
            const redirectUrl = email ? 
              `/auth/expired-link?email=${encodeURIComponent(email)}&reason=expired&auto_resend=1` : 
              '/auth/expired-link?reason=expired&auto_resend=1';
            navigate(redirectUrl, { replace: true });
            return;
          }
          
          console.log('[AuthCallback] legacy_hash exchange successful');
        } catch (error: any) {
          console.error('[AuthCallback] legacy_hash exchange threw error:', error);
          const redirectUrl = email ? 
            `/auth/expired-link?email=${encodeURIComponent(email)}&reason=expired&auto_resend=1` : 
            '/auth/expired-link?reason=expired&auto_resend=1';
          navigate(redirectUrl, { replace: true });
          return;
        }
      }

      // Clean URL (remove hash/params) then redirect
      history.replaceState(null, "", window.location.pathname);

      // Check for pending entry context and redirect appropriately
      const entryContext = getEntryContext();
      
      if (entryContext && isEntryContextValid(entryContext)) {
        console.info('[AuthCallback] Found valid entry context, redirecting to continuation URL');
        const continuationUrl = getEntryContinuationUrl(entryContext);
        
        toast({
          title: "Welcome back!",
          description: "Continuing with your competition entry...",
        });
        
        navigate(continuationUrl, { replace: true });
        return;
      }

      // Clear any expired entry context
      if (entryContext && !isEntryContextValid(entryContext)) {
        console.info('[AuthCallback] Clearing expired entry context');
        clearEntryContext();
      }

      // Default navigation after successful auth - redirect to player entries
      const cont = params.get("continue") || "/players/entries";
      navigate(cont, { replace: true });
    };

    run();
  }, [navigate, params]);

  return (
    <Container className="py-24 text-center">
      <div className="mx-auto max-w-md">
        <div className="animate-pulse text-sm text-muted-foreground">⏳ Signing you in…</div>
        <h1 className="mt-2 text-xl font-semibold">Verifying your secure link</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Please wait a moment while we finish the sign-in process.
        </p>
      </div>
    </Container>
  );
}