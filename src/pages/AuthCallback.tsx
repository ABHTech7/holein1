import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { NameCollectionModal } from "@/components/entry/NameCollectionModal";
import { fetchUserProfile, needsNameCollection } from "@/lib/profileService";
import type { Profile } from "@/hooks/useAuth";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/layout/Container";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [showNameCollection, setShowNameCollection] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if this is a secure entry link token verification
        const token = searchParams.get('token');
        
        if (token) {
          
          // Verify the custom secure entry link token
          const { data, error } = await supabase.functions.invoke('verify-magic-link', {
            body: { token }
          });

          if (error) {
            console.error('Secure link verification error:', error);
            throw new Error(error.message || 'Failed to verify secure link');
          }

          if (!data?.success) {
            const errorMessage = data?.error || 'Invalid secure link';
            console.error('Secure link verification failed:', errorMessage);
            throw new Error(errorMessage);
          }

          console.log('🔍 Secure link verification response:', data);

          // Set the session using the tokens from the response
          if (data.access_token && data.refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token
            });

            if (sessionError) {
              console.error('Session error:', sessionError);
              // Continue anyway - the user account was created successfully
            }
            
            // Wait for session to be fully established
            console.log('⏳ Waiting for session to be established...');
            let attempts = 0;
            const maxAttempts = 10;
            
            while (attempts < maxAttempts) {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                console.log('✅ Session established successfully');
                break;
              }
              attempts++;
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            if (attempts >= maxAttempts) {
              console.warn('⚠️ Session establishment timeout, proceeding anyway');
            }
          }

          console.log("Secure link verification successful:", data);
        
          // Check if we have a redirect URL for the new token-based flow
          if (data.redirect_url) {
            console.log("Redirecting to token-based confirmation:", data.redirect_url);
            window.location.href = data.redirect_url;
            return;
          }
          
          // Fallback to old flow if no redirect URL
          setStatus('success');
          setMessage(`Welcome ${data.user?.first_name}! Taking you to your golf challenge...`);
          
          console.log('🔍 Secure link verification response:', data);
          console.log('📝 Entry ID from response:', data.entry_id);
          console.log('🌐 Competition URL from response:', data.competition_url);
          
          // Store entry ID in localStorage as backup
          if (data.entry_id) {
            localStorage.setItem('pending_entry_id', data.entry_id);
          }
          
          // Redirect to entry confirmation page if we have an entry ID
          if (data.entry_id) {
            const redirectUrl = `/entry/${data.entry_id}/confirmation`;
            console.log("✅ Redirecting to entry confirmation:", redirectUrl);
            // Increased delay to ensure session is ready
            setTimeout(() => navigate(redirectUrl), 2500);
          } else {
            // Fallback to competition URL
            console.log("❌ No entry_id found, using fallback redirect");
            const redirectUrl = data.competition_url || searchParams.get('redirect') || '/';
            console.log("⚠️ Fallback redirect:", redirectUrl);
            setTimeout(() => navigate(redirectUrl), 2500);
          }

        } else {
          // Handle standard Supabase auth callback
          
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Auth callback error:', error);
            throw new Error(error.message);
          }

          if (session?.user) {
            // Fetch user profile to check completeness
            const profile = await fetchUserProfile(session.user.id);
            setUserProfile(profile);
            setUserId(session.user.id);
            
            // Check if name collection is needed
            if (needsNameCollection(profile)) {
              setShowNameCollection(true);
              setStatus('success');
              setMessage('Just one more step to personalize your experience');
              toast({
                title: "Welcome!",
                description: "Just one more step to personalize your experience"
              });
            } else {
              // Profile is complete, proceed with redirect
              const redirectUrl = localStorage.getItem('auth_redirect_url') || '/';
              localStorage.removeItem('auth_redirect_url');
              
              setStatus('success');
              setMessage(`Welcome back, ${profile?.first_name}! Redirecting...`);
              
              toast({
                title: `Welcome back, ${profile?.first_name}!`,
                description: "Successfully signed in"
              });
              
              setTimeout(() => navigate(redirectUrl), 1500);
            }
          } else {
            throw new Error('No valid session found');
          }
        }

      } catch (error: any) {
        console.error('Auth callback error:', error);
        setStatus('error');
        
        // Handle specific error types with better messaging
        if (error.message?.includes("12 hours")) {
          setMessage('You must wait 12 hours between entries for the same competition.');
        } else if (error.message?.includes("already been used")) {
          setMessage('This secure link has already been used. Please request a new one.');
        } else if (error.message?.includes("expired")) {
          setMessage('This secure link has expired. Please request a new one.');
        } else {
          setMessage(error.message || 'Authentication failed');
        }
        
        toast({
          title: "Authentication failed",
          description: error.message || "Please try again",
          variant: "destructive"
        });

        // Redirect to home page after a delay
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

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
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      
      <main className="flex-1 flex items-center justify-center py-12">
        <Container>
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-6">
                  {status === 'loading' && (
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  )}
                  {status === 'success' && (
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                  )}
                  {status === 'error' && (
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                  )}
                </div>

                <h2 className="text-2xl font-semibold font-['Montserrat'] mb-4">
                  {status === 'loading' && 'Verifying...'}
                  {status === 'success' && 'Success!'}
                  {status === 'error' && 'Authentication Failed'}
                </h2>

                <p className="text-muted-foreground mb-6">
                  {message || 'Processing your authentication...'}
                </p>

                {status === 'loading' && (
                  <div className="animate-pulse">
                    <div className="h-2 bg-muted rounded-full">
                      <div className="h-2 bg-primary rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>

      <SiteFooter />

      {/* Name Collection Modal for legacy auth flow */}
      {showNameCollection && userId && (
        <NameCollectionModal
          open={showNameCollection}
          onOpenChange={setShowNameCollection}
          onComplete={handleNameCollectionComplete}
          userId={userId}
        />
      )}
    </div>
  );
};

export default AuthCallback;