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
      const error = params.get("error") || params.get("error_code");
      const error_description = params.get("error_description");
      const fullUrl = window.location.href;

      console.log('[AuthCallback] Processing callback with:', { code: !!code, error, fullUrl });

      // Handle error parameters from the URL
      if (error) {
        console.warn("[AuthCallback] Error returned in params:", {
          error,
          error_description,
          fullUrl,
        });
        
        // Handle expired/invalid links with proper UI
        if (error === 'expired_token' || error === 'invalid_grant' || error_description?.includes('expired')) {
          navigate("/auth/expired-link", { replace: true });
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

      // Handle code exchange (modern PKCE flow)
      if (code) {
        console.log('[AuthCallback] Code found, attempting exchange');
        
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(fullUrl);
          
          if (exchangeError) {
            console.error('[AuthCallback] Code exchange failed:', exchangeError.message);
            
            // Handle PKCE verifier missing error gracefully
            if (exchangeError.message?.includes('code verifier') || exchangeError.message?.includes('both auth code and code verifier should be non-empty')) {
              console.warn('[AuthCallback] PKCE verifier missing - link opened in different browser/tab');
              
              toast({
                title: "Link can't complete sign-in",
                description: "This link was opened in a different tab or browser. Please use the Resend option.",
                variant: "destructive",
              });
              
              navigate("/auth/expired-link", { replace: true });
              return;
            }
            
            // Handle other exchange errors
            if (exchangeError.message?.includes('expired') || exchangeError.message?.includes('invalid_grant')) {
              navigate("/auth/expired-link", { replace: true });
              return;
            }
            
            toast({
              title: "Authentication failed",
              description: exchangeError.message || "Email link invalid or expired.",
              variant: "destructive",
            });
            navigate("/auth", { replace: true });
            return;
          }
          
          console.log('[AuthCallback] Code exchange successful');
        } catch (error: any) {
          console.error('[AuthCallback] Exchange threw error:', error);
          navigate("/auth/expired-link", { replace: true });
          return;
        }
      } else {
        // Legacy hash-based flow (fallback)
        const hash = window.location.hash || "";
        console.log('[AuthCallback] No code found, trying hash:', hash.substring(0, 50));
        
        if (!hash) {
          console.warn('[AuthCallback] No code or hash found');
          navigate("/auth/expired-link", { replace: true });
          return;
        }
        
        try {
          const { error: hashError } = await supabase.auth.exchangeCodeForSession(hash);
          
          if (hashError) {
            console.error('[AuthCallback] Hash exchange failed:', hashError.message);
            navigate("/auth/expired-link", { replace: true });
            return;
          }
          
          console.log('[AuthCallback] Hash exchange successful');
        } catch (error: any) {
          console.error('[AuthCallback] Hash exchange threw error:', error);
          navigate("/auth/expired-link", { replace: true });
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

      // Default navigation
      const cont = params.get("continue") || "/";
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