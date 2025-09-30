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
      const branded_token = params.get("token");
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

      // Attempt to capture slugs from any existing entry context for better redirects
      const entryContextForSlugs = getEntryContext();
      const ctxClubSlug = entryContextForSlugs?.clubSlug;
      const ctxCompetitionSlug = entryContextForSlugs?.competitionSlug;

      const buildExpiredUrl = (reason: string, autoResend = true) => {
        const paramsArr = [
          email ? `email=${encodeURIComponent(email)}` : null,
          `reason=${encodeURIComponent(reason)}`,
          autoResend ? 'auto_resend=1' : null,
          ctxClubSlug ? `club=${encodeURIComponent(ctxClubSlug)}` : null,
          ctxCompetitionSlug ? `competition=${encodeURIComponent(ctxCompetitionSlug)}` : null,
        ].filter(Boolean);
        return `/auth/expired-link?${paramsArr.join('&')}`;
      };

      // Determine authentication mode
      const mode = branded_token ? 'branded_token' : (token_hash ? 'token_hash' : (code ? 'auth_code' : 'legacy_hash'));
      console.log(`[AuthCallback] mode=${mode}`, { 
        hasBrandedToken: !!branded_token,
        hasTokenHash: !!token_hash,
        hasCode: !!code, 
        type,
        error, 
        hasEmail: !!email,
        emailSource: emailFromUrl ? 'url' : 'localStorage',
        ctxClubSlug,
        ctxCompetitionSlug
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
          const redirectUrl = buildExpiredUrl('expired', false);
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

      // Handle branded token flow (edge function verifies and returns a Supabase action link)
      if (branded_token) {
        console.log('[AuthCallback] branded token found, invoking verify-magic-link for token:', branded_token);

        try {
          const { data, error: invokeError } = await supabase.functions.invoke('verify-magic-link', {
            body: { token: branded_token }
          });

          if (invokeError || !data?.success) {
            console.error('[AuthCallback] verify-magic-link failed:', {
              invokeError: invokeError?.message,
              data,
              token: branded_token
            });
            
            // Handle "no active entry" case - show recovery UI
            if (data?.code === 'no_entry') {
              console.log('[AuthCallback] No active entry, will show recovery screen after auth');
              sessionStorage.setItem('no_active_entry', 'true');
              // Continue to let auth complete, then show recovery screen
            }
            
            // If it's a cooldown error, still proceed with authentication but show a message
            if (data?.cooldown_active && data?.action_link) {
              console.log('[AuthCallback] Cooldown active but auth link available, proceeding with sign-in');
              toast({
                title: "Already entered recently",
                description: data.message || "You've already entered this competition recently.",
                variant: "destructive",
              });
              window.location.replace(data.action_link);
              return;
            }
            
            // Only redirect to expired if truly failed (not "no_entry")
            if (data?.code !== 'no_entry') {
              const redirectUrl = buildExpiredUrl('expired', true);
              navigate(redirectUrl, { replace: true });
              return;
            }
          }

          // Store server redirect info for use after auth completes
          if (data.redirectTo && data.entryId) {
            console.log('[AuthCallback] Server provided redirect:', data.redirectTo, 'entryId:', data.entryId);
            sessionStorage.setItem('auth_server_redirect', JSON.stringify({
              redirectTo: data.redirectTo,
              entryId: data.entryId,
              timestamp: Date.now()
            }));
          }

          // If the function provided a Supabase action link, redirect there to establish the session
          if (data.action_link) {
            console.log('[AuthCallback] Redirecting to Supabase action_link to complete sign-in');
            
            // If cooldown is active, show message but still proceed with auth
            if (data.cooldown_active) {
              toast({
                title: "Already entered recently",
                description: data.message || "You've already entered this competition recently.",
                variant: "destructive"
              });
            }
            
            window.location.replace(data.action_link);
            return;
          }

          // Fallback: if no action_link, navigate to returned redirect_url or default
          const next = data.redirectTo || data.redirect_url || '/players/entries';
          navigate(next, { replace: true });
          return;
        } catch (e) {
          console.error('[AuthCallback] Error calling verify-magic-link:', e);
          const redirectUrl = buildExpiredUrl('expired', true);
          navigate(redirectUrl, { replace: true });
          return;
        }
      }

      // Handle legacy hash-based tokens FIRST (Supabase magic link returns access_token in URL hash)
      else if (window.location.hash) {
        const hash = window.location.hash || "";
        console.log('[AuthCallback] legacy_hash mode, trying hash:', hash.substring(0, 50));

        try {
          // Avoid redundant exchanges if we already have a session
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (!currentSession?.user) {
            const { error: hashError } = await supabase.auth.exchangeCodeForSession(hash);
            if (hashError) {
              console.error('[AuthCallback] legacy_hash exchange failed:', hashError.message);
              const redirectUrl = buildExpiredUrl('expired', true);
              navigate(redirectUrl, { replace: true });
              return;
            }
          }

          console.log('[AuthCallback] legacy_hash exchange successful or session already present');
        } catch (error: any) {
          console.error('[AuthCallback] legacy_hash exchange threw error:', error);
          const redirectUrl = email ?
            `/auth/expired-link?email=${encodeURIComponent(email)}&reason=expired&auto_resend=1` :
            '/auth/expired-link?reason=expired&auto_resend=1';
          navigate(redirectUrl, { replace: true });
          return;
        }
      }

      // Handle code exchange (PKCE flow)  
      else if (code) {
        console.log('[AuthCallback] auth_code found, attempting PKCE exchange');
        
        // First check if we already have a session to avoid unnecessary exchanges
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user) {
          console.log('[AuthCallback] Already have valid session, skipping exchange');
        } else {
          try {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(fullUrl);
          
          if (exchangeError) {
            console.error('[AuthCallback] Code exchange failed:', exchangeError.message);
            
            // Handle PKCE verifier missing error - redirect to auto-resend
            if (exchangeError.message?.includes('code verifier') || 
                exchangeError.message?.includes('both auth code and code verifier should be non-empty')) {
              console.warn('[AuthCallback] PKCE verifier missing - redirecting to auto-resend');
              const redirectUrl = buildExpiredUrl('pkce_missing', true);
              navigate(redirectUrl, { replace: true });
              return;
            }
            
            // Handle other exchange errors - expired or invalid grant  
            else if (exchangeError.message?.includes('expired') || 
                     exchangeError.message?.includes('invalid_grant')) {
              console.warn('[AuthCallback] Token expired or invalid grant');
              const redirectUrl = buildExpiredUrl('expired', true);
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
            const redirectUrl = buildExpiredUrl('expired', true);
            navigate(redirectUrl, { replace: true });
            return;
          }
        }
      } else {
        console.warn('[AuthCallback] No token_hash, code, or hash found');
        const redirectUrl = buildExpiredUrl('missing', true);
        navigate(redirectUrl, { replace: true });
        return;
      }

      // Clean URL (remove hash/params) then redirect
      history.replaceState(null, "", window.location.pathname);

      // Check for server-provided redirect first (from verify-magic-link)
      try {
        const serverRedirectStr = sessionStorage.getItem('auth_server_redirect');
        if (serverRedirectStr) {
          const serverRedirect = JSON.parse(serverRedirectStr);
          // Check if redirect is recent (within last 2 minutes)
          if (Date.now() - serverRedirect.timestamp < 2 * 60 * 1000) {
            console.log('[AuthCallback] Using server redirect:', serverRedirect.redirectTo, serverRedirect.entryId);
            sessionStorage.removeItem('auth_server_redirect');
            clearEntryContext(); // Clear local context since server handled it
            navigate(serverRedirect.redirectTo, { replace: true });
            return;
          } else {
            console.log('[AuthCallback] Server redirect expired, clearing');
            sessionStorage.removeItem('auth_server_redirect');
          }
        }
      } catch (error) {
        console.warn('[AuthCallback] Error processing server redirect:', error);
      }

      // Enhanced entry context handling with better validation
      const entryContext = getEntryContext();
      
      if (entryContext) {
        if (isEntryContextValid(entryContext)) {
          console.info('[AuthCallback] Found valid entry context, redirecting to continuation URL');
          const continuationUrl = getEntryContinuationUrl(entryContext);
          
          // Check if user has existing session to avoid auth loops
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            toast({
              title: "Welcome back!",
              description: "Continuing with your competition entry...",
            });
            
            navigate(continuationUrl, { replace: true });
            return;
          } else {
            console.warn('[AuthCallback] No valid session found despite entry context');
          }
        } else {
          console.info('[AuthCallback] Entry context expired, clearing');
          clearEntryContext();
        }
      }

      // Additional check for legacy entry data
      try {
        const legacyEntry = localStorage.getItem('pending_entry_form');
        if (legacyEntry) {
          const parsed = JSON.parse(legacyEntry);
          if (parsed.competitionId && email) {
            console.info('[AuthCallback] Found legacy entry data, redirecting to player entries');
            localStorage.removeItem('pending_entry_form');
            navigate('/players/entries', { replace: true });
            return;
          }
        }
      } catch (error) {
        console.warn('[AuthCallback] Error processing legacy entry data:', error);
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