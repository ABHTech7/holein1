import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          toast({
            title: "Authentication failed",
            description: error.message || "Failed to complete authentication",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        if (session?.user) {
          // Get redirect URL from localStorage or default to home
          const redirectUrl = localStorage.getItem('auth_redirect_url') || '/';
          localStorage.removeItem('auth_redirect_url');
          
          toast({
            title: "Welcome!",
            description: "Successfully signed in"
          });
          
          // Navigate to the stored redirect URL
          navigate(redirectUrl);
        } else {
          // No session found, redirect to home
          navigate('/');
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        toast({
          title: "Authentication failed",
          description: "Something went wrong during authentication",
          variant: "destructive"
        });
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <h2 className="text-xl font-semibold">Completing sign in...</h2>
        <p className="text-muted-foreground">Please wait while we redirect you</p>
      </div>
    </div>
  );
};

export default AuthCallback;