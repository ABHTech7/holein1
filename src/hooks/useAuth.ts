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

  const signUp = async (email: string, password: string, metadata?: { first_name?: string; last_name?: string; phone?: string; role?: string; dob?: string; handicap?: number; consent_marketing?: boolean }) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });
    
    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link to complete your registration."
      });
    }
    
    return { error };
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
    
    try {
      // Check if there's actually a session to sign out
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log('📋 Current session exists:', !!currentSession);
      
      // If no session exists, just clear local state
      if (!currentSession) {
        console.log('✅ No session found, clearing local state');
        setAuthState({
          user: null,
          session: null,
          profile: null,
          loading: false,
        });
        
        toast({
          title: "Signed out",
          description: "You have been signed out successfully."
        });
        
        navigate('/auth');
        return { error: null };
      }
      
      // Attempt to sign out
      const { error } = await supabase.auth.signOut();
      console.log('🔓 Supabase signOut result:', error ? `Error: ${error.message}` : 'Success');
      
      // If any error occurs during logout, just clear local state anyway
      if (error) {
        console.log('⚠️ SignOut error occurred, clearing local state anyway:', error.message);
        
        // Force clear local auth state regardless of error
        setAuthState({
          user: null,
          session: null,
          profile: null,
          loading: false,
        });
        
        // Always show success to user - logout should never "fail" from UX perspective
        toast({
          title: "Signed out",
          description: "You have been signed out successfully."
        });
        
        navigate('/auth');
        return { error: null };
      }
      
      // Success case - state will be cleared by onAuthStateChange listener
      toast({
        title: "Signed out",
        description: "You have been signed out successfully."
      });
      
      navigate('/auth');
      return { error: null };
      
    } catch (catchError: any) {
      console.error('💥 Unexpected error during logout:', catchError);
      
      // Even if something completely unexpected happens, clear state
      setAuthState({
        user: null,
        session: null,
        profile: null,
        loading: false,
      });
      
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
    signUp,
    signIn,
    signOut,
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