import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthState(prev => ({ ...prev, session, user: session?.user ?? null }));
        
        if (session?.user) {
          // Fetch profile data
          setTimeout(async () => {
            const profile = await fetchProfile(session.user.id);
            setAuthState(prev => ({ ...prev, profile, loading: false }));
          }, 0);
        } else {
          setAuthState(prev => ({ ...prev, profile: null, loading: false }));
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthState(prev => ({ ...prev, session, user: session.user }));
        fetchProfile(session.user.id).then(profile => {
          setAuthState(prev => ({ ...prev, profile, loading: false }));
        });
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: { first_name?: string; last_name?: string; phone?: string; role?: string }) => {
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
    const { error } = await supabase.auth.signOut();
    
    // If session not found, clear local state anyway (happens when demo data is refreshed)
    if (error && error.message.includes('Session not found')) {
      // Force clear local auth state
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
      
      return { error: null };
    }
    
    if (error) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive"
      });
    }
    
    return { error };
  };

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
  };
};

export default useAuth;