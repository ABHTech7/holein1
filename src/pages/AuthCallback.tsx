import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Container from "@/components/layout/Container";

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

      // Optional: if you store a temporary "continue" in local storage, prefer that.
      // const stored = localStorage.getItem("auth_continue");
      // const target = stored || cont || "/";
      // if (stored) localStorage.removeItem("auth_continue");

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