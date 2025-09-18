import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'ADMIN' | 'CLUB' | 'PLAYER';
  club_id?: string;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

export const useAuth = () => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  });

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    return data as Profile;
  };

  const forceRefresh = async () => {
    console.log('🔄 useAuth: Force refreshing auth state...');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('🔍 useAuth: Force refresh result', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        error: error?.message 
      });
      
      if (session?.user) {
        setAuthState(prev => ({ 
          ...prev, 
          session, 
          user: session.user 
        }));
        
        const profile = await fetchProfile(session.user.id);
        setAuthState(prev => ({ ...prev, profile, loading: false }));
        return true;
      } else {
        setAuthState(prev => ({ 
          ...prev, 
          session: null, 
          user: null, 
          profile: null, 
          loading: false 
        }));
        return false;
      }
    } catch (error) {
      console.error('💥 useAuth: Force refresh failed', error);
      setAuthState(prev => ({ ...prev, loading: false }));
      return false;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        // Always update session and user state immediately
        setAuthState(prev => ({ 
          ...prev, 
          session, 
          user: session?.user ?? null 
        }));
        
        if (session?.user) {
          // Defer profile fetching to avoid blocking auth state changes
          setTimeout(() => {
            fetchProfile(session.user.id).then(profile => {
              setAuthState(prev => ({ ...prev, profile, loading: false }));
            }).catch(error => {
              console.error('Error fetching profile in auth callback:', error);
              setAuthState(prev => ({ ...prev, loading: false }));
            });
          }, 0);
        } else {
          // Clear profile immediately when session is null
          setAuthState(prev => ({ 
            ...prev, 
            profile: null, 
            loading: false 
          }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      
      if (session?.user) {
        setAuthState(prev => ({ ...prev, session, user: session.user }));
        fetchProfile(session.user.id).then(profile => {
          setAuthState(prev => ({ ...prev, profile, loading: false }));
        }).catch(error => {
          console.error('Error fetching profile in initial check:', error);
          setAuthState(prev => ({ ...prev, loading: false }));
        });
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendOtp = async (email: string, persistContext?: boolean): Promise<{ error?: string }> => {
    try {
      // Enhanced email validation with security checks
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { error: 'Please enter a valid email address' };
      }

      const cleanEmail = email.toLowerCase().trim();
      // Include email in redirect URL for PKCE fallback recovery
      const redirectUrl = `${window.location.origin}/auth/callback?email=${encodeURIComponent(cleanEmail)}`;
      
      // Always persist auth email for 6-hour TTL (not just when persistContext=true)
      try {
        // Store last auth email with 6-hour timestamp
        localStorage.setItem('last_auth_email', JSON.stringify({
          email: cleanEmail,
          timestamp: Date.now()
        }));
        
        console.log('[Auth] Persisted auth email for 6-hour resend functionality');
        
        // Also persist entry context if requested
        if (persistContext) {
          const { storePendingEntryContext } = await import('@/lib/entryContextPersistence');
          // Entry context logic handled elsewhere - this just ensures email is stored
        }
      } catch (error) {
        console.warn('[Auth] Failed to persist auth email:', error);
      }

      // Log the exact redirect URL and request details
      console.log(`[Auth] email link redirect → ${redirectUrl}`);
      
      // Import and log diagnostics
      try {
        const { logEmailRedirectTo } = await import('@/lib/authDiagnostics');
        logEmailRedirectTo(redirectUrl);
      } catch (error) {
        console.warn('[Auth] Failed to log diagnostics:', error);
      }
      
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true, // Allow sign up through magic link
          emailRedirectTo: redirectUrl,
          data: {
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent.substring(0, 500) // Truncate for security
          }
        }
      });
      
      if (error) {
        // Log failed OTP attempts for security monitoring
        try {
          await supabase.rpc('log_security_event', {
            event_type: 'OTP_SEND_FAILURE',
            details: {
              email: email,
              error_message: error.message,
              user_agent: navigator.userAgent.substring(0, 500)
            }
          });
        } catch (logError) {
          console.warn('Failed to log security event:', logError);
        }
        
        return { error: error.message };
      }
      
      // Log successful OTP sends for security monitoring
      try {
        await supabase.rpc('log_security_event', {
          event_type: 'OTP_SEND_SUCCESS',
          details: {
            email: email,
            user_agent: navigator.userAgent.substring(0, 500)
          }
        });
      } catch (logError) {
        console.warn('Failed to log security event:', logError);
      }
      
      return {};
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      return { error: error.message };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive"
      });
    }
    
    return { error };
  };

  const signOut = async () => {
    console.log('🚪 Starting logout process...');
    
    // Immediately clear local state to prevent UI issues
    const clearLocalState = () => {
      setAuthState({
        user: null,
        session: null,
        profile: null,
        loading: false,
      });
      
      // Force clear all auth-related storage as additional safety measure
      try {
        // Clear Supabase auth tokens (remove hardcoded project ID)
        const storageKeys = Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('auth-token')
        );
        storageKeys.forEach(key => localStorage.removeItem(key));
        
        sessionStorage.clear();
        
        // Clear our secure auth storage (async import)
        import('@/lib/secureStorage').then(({ SecureStorage }) => {
          SecureStorage.clearAuthData();
        }).catch(console.warn);
      } catch (storageError) {
        console.log('Storage clear error (non-critical):', storageError);
      }
    };
    
    try {
      // Always attempt Supabase signOut, but don't wait for validation
      const signOutPromise = supabase.auth.signOut();
      
      // Clear local state immediately
      clearLocalState();
      
      // Show success message immediately
      toast({
        title: "Signed out", 
        description: "You have been signed out successfully."
      });
      
      // Navigate immediately
      navigate('/auth');
      
      // Wait for Supabase signOut to complete in background
      try {
        const { error } = await signOutPromise;
        if (error) {
          console.log('⚠️ Supabase signOut error (already handled):', error.message);
        } else {
          console.log('✅ Supabase signOut completed successfully');
        }
      } catch (signOutError) {
        console.log('⚠️ Supabase signOut failed (already handled):', signOutError);
      }
      
      return { error: null };
      
    } catch (catchError: any) {
      console.error('💥 Unexpected error during logout:', catchError);
      
      // Ensure state is cleared even in unexpected errors
      clearLocalState();
      
      toast({
        title: "Signed out",
        description: "You have been signed out successfully."
      });
      
      navigate('/auth');
      return { error: null };
    }
  };

  return {
    ...authState,
    sendOtp,
    signIn,
    signOut,
    forceRefresh,
    refreshProfile: () => {
      if (authState.user?.id) {
        fetchProfile(authState.user.id).then(profile => {
          setAuthState(prev => ({ ...prev, profile }));
        });
      }
    }
  };
};

export default useAuth;