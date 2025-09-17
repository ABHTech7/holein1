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

      const fullUrl = window.location.href;
      const hash = window.location.hash || "";

      // Handle error parameters from the email link
      const qp = new URLSearchParams(hash.replace(/^#/, ""));
      const error = qp.get("error") || qp.get("error_code");
      const error_description = qp.get("error_description");

      const cont = params.get("continue") || "/";

      if (error) {
        console.warn("[AuthCallback] Error returned in hash:", {
          error,
          error_description,
          fullUrl,
        });
        
        // Handle expired/invalid links with proper UI
        if (error === 'expired_token' || error === 'invalid_grant' || error_description?.includes('expired')) {
          // Store the email if available for the expired link page
          const emailMatch = fullUrl.match(/[?&]email=([^&]*)/);
          const email = emailMatch ? decodeURIComponent(emailMatch[1]) : null;
          
          if (email) {
            localStorage.setItem('last_auth_email', JSON.stringify({
              email,
              timestamp: Date.now()
            }));
          }
          
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

      // Primary path: exchange the hash fragment for a session
      console.log('[AuthCallback] hash:', hash);
      const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(
        hash
      );
      console.log('[AuthCallback] exchange result:', { ok: !exchangeErr, msg: exchangeErr?.message });

      if (exchangeErr) {
        console.error("[AuthCallback] exchangeCodeForSession failed:", {
          message: exchangeErr.message,
          fullUrl,
        });
        
        // Handle expired/invalid tokens with proper UI
        if (exchangeErr.message?.includes('expired') || exchangeErr.message?.includes('invalid_grant')) {
          navigate("/auth/expired-link", { replace: true });
          return;
        }
        
        toast({
          title: "Authentication failed",
          description: exchangeErr.message || "Email link invalid or expired.",
          variant: "destructive",
        });
        navigate("/auth", { replace: true });
        return;
      }

      // Clean URL (remove hash) then send user to the intended location
      history.replaceState(null, "", window.location.pathname + window.location.search);

      // Check for pending entry context and redirect appropriately
      const entryContext = getEntryContext();
      
      if (entryContext && isEntryContextValid(entryContext)) {
        console.info('[AuthCallback] Found valid entry context, redirecting to continuation URL');
        const continuationUrl = getEntryContinuationUrl(entryContext);
        
        // Don't clear context immediately - let the target page handle it
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

      // Default navigation logic
      const target = cont || "/";
      navigate(target, { replace: true });
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