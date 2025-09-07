import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { NameCollectionModal } from "@/components/entry/NameCollectionModal";
import { fetchUserProfile, needsNameCollection } from "@/lib/profileService";
import type { Profile } from "@/hooks/useAuth";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [showNameCollection, setShowNameCollection] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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
          // Fetch user profile to check completeness
          const profile = await fetchUserProfile(session.user.id);
          setUserProfile(profile);
          setUserId(session.user.id);
          
          // Check if name collection is needed
          if (needsNameCollection(profile)) {
            setShowNameCollection(true);
            toast({
              title: "Welcome!",
              description: "Just one more step to personalize your experience"
            });
          } else {
            // Profile is complete, proceed with redirect
            const redirectUrl = localStorage.getItem('auth_redirect_url') || '/';
            localStorage.removeItem('auth_redirect_url');
            
            toast({
              title: `Welcome back, ${profile?.first_name}!`,
              description: "Successfully signed in"
            });
            
            navigate(redirectUrl);
          }
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

  const handleNameCollectionComplete = (firstName: string, lastName?: string) => {
    // Get redirect URL from localStorage or default to home
    const redirectUrl = localStorage.getItem('auth_redirect_url') || '/';
    localStorage.removeItem('auth_redirect_url');
    
    toast({
      title: `All set, ${firstName}!`,
      description: "Your profile is complete. Let's get started!"
    });
    
    navigate(redirectUrl);
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-xl font-semibold">
            {showNameCollection ? "Setting up your profile..." : "Completing sign in..."}
          </h2>
          <p className="text-muted-foreground">
            {showNameCollection ? "Just one more step to personalize your experience" : "Please wait while we redirect you"}
          </p>
        </div>
      </div>

      {/* Name Collection Modal */}
      {showNameCollection && userId && (
        <NameCollectionModal
          open={showNameCollection}
          onOpenChange={setShowNameCollection}
          onComplete={handleNameCollectionComplete}
          userId={userId}
        />
      )}
    </>
  );
};

export default AuthCallback;