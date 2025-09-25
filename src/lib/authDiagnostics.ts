import { supabase } from '@/integrations/supabase/client';

export interface SessionDiagnostics {
  hasSession: boolean;
  userId: string | null;
  userEmail: string | null;
  sessionValid: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  profileExists: boolean;
  userRole: string | null;
  isAdmin: boolean;
  jwtIssue: string | null;
}

export async function runSessionDiagnostics(): Promise<SessionDiagnostics> {
  console.log('🔍 Running comprehensive session diagnostics...');
  
  const diagnostics: SessionDiagnostics = {
    hasSession: false,
    userId: null,
    userEmail: null,
    sessionValid: false,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    profileExists: false,
    userRole: null,
    isAdmin: false,
    jwtIssue: null
  };

  try {
    // 1. Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session retrieval error:', sessionError);
      diagnostics.jwtIssue = `Session error: ${sessionError.message}`;
      return diagnostics;
    }

    if (!session) {
      console.log('❌ No active session found');
      diagnostics.jwtIssue = 'No active session';
      return diagnostics;
    }

    // 2. Session exists - populate basic info
    diagnostics.hasSession = true;
    diagnostics.userId = session.user.id;
    diagnostics.userEmail = session.user.email || null;
    diagnostics.accessToken = session.access_token.substring(0, 20) + '...'; // Truncated for security
    diagnostics.refreshToken = session.refresh_token ? 'present' : 'missing';
    diagnostics.expiresAt = session.expires_at || null;

    // 3. Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    const isExpired = diagnostics.expiresAt ? now >= diagnostics.expiresAt : false;
    diagnostics.sessionValid = !isExpired;
    
    if (isExpired) {
      console.log('❌ Access token is expired');
      diagnostics.jwtIssue = 'Access token expired';
      
      // Try to refresh the session
      console.log('🔄 Attempting to refresh expired session...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('❌ Session refresh failed:', refreshError);
        diagnostics.jwtIssue = `Refresh failed: ${refreshError.message}`;
        return diagnostics;
      }
      
      if (refreshData.session) {
        console.log('✅ Session refreshed successfully');
        diagnostics.sessionValid = true;
        diagnostics.jwtIssue = null;
      }
    }

    // 4. Check if profile exists and get role
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, email')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('❌ Profile fetch failed:', profileError);
        diagnostics.jwtIssue = `Profile fetch failed: ${profileError.message}`;
      } else if (profile) {
        diagnostics.profileExists = true;
        diagnostics.userRole = profile.role;
        diagnostics.isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(profile.role);
        console.log('✅ Profile found:', { role: profile.role, isAdmin: diagnostics.isAdmin });
      } else {
        console.log('❌ No profile found for user');
        diagnostics.jwtIssue = 'Profile not found';
      }
    } catch (profileErr) {
      console.error('❌ Profile check error:', profileErr);
      diagnostics.jwtIssue = `Profile check error: ${profileErr}`;
    }

    // 5. Test database permissions with a simple query
    try {
      const { data: permissionTest, error: permissionError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .limit(1);

      if (permissionError) {
        console.error('❌ Permission test failed:', permissionError);
        diagnostics.jwtIssue = `Permission denied: ${permissionError.message}`;
      } else {
        console.log('✅ Database permissions OK');
      }
    } catch (permErr) {
      console.error('❌ Permission test error:', permErr);
      diagnostics.jwtIssue = `Permission test error: ${permErr}`;
    }

  } catch (error) {
    console.error('❌ Diagnostics failed:', error);
    diagnostics.jwtIssue = `Diagnostics error: ${error}`;
  }

  // Log comprehensive results
  console.log('📊 Session Diagnostics Results:', diagnostics);
  
  return diagnostics;
}

export async function forceSessionRefresh(): Promise<boolean> {
  console.log('🔄 Forcing session refresh...');
  
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('❌ Force refresh failed:', error);
      return false;
    }
    
    if (data.session) {
      console.log('✅ Session force refreshed successfully');
      return true;
    }
    
    console.log('❌ No session returned from refresh');
    return false;
  } catch (error) {
    console.error('❌ Force refresh error:', error);
    return false;
  }
}

export function logEmailRedirectTo(redirectUrl: string) {
  console.log(`[Auth Diagnostics] Email redirect URL: ${redirectUrl}`);
}

export function logAuthDiagnostics() {
  console.log('🚀 Auth diagnostics initialized');
  
  // Run initial diagnostics
  setTimeout(() => {
    runSessionDiagnostics().then(results => {
      if (results.jwtIssue) {
        console.warn('⚠️ Authentication issue detected:', results.jwtIssue);
      } else {
        console.log('✅ Authentication appears healthy');
      }
    });
  }, 1000);
}