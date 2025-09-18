import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * Creates authenticated admin session state for tests that need admin privileges
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the app
    await page.goto(baseURL || 'http://localhost:5173');

    // Mock admin authentication by setting localStorage keys that our app uses
    // Based on the useAuth hook and console logs, the app checks for:
    // - Supabase session in localStorage (supabase.auth.token)
    // - User profile data
    
    const mockAdminUser = {
      id: 'mock-admin-user-id',
      email: 'admin@test.com',
      role: 'ADMIN',
      aud: 'authenticated',
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const mockAdminProfile = {
      id: 'mock-admin-user-id',
      email: 'admin@test.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'ADMIN',
      club_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const mockSession = {
      access_token: 'mock-admin-access-token',
      refresh_token: 'mock-admin-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: mockAdminUser
    };

    // Set Supabase auth session in localStorage (this is what @supabase/supabase-js checks)
    await page.evaluate((session) => {
      // Supabase stores session data with a key format like:
      // sb-<project-ref>-auth-token
      // We'll use a generic key that matches the pattern
      localStorage.setItem('sb-mock-auth-token', JSON.stringify(session));
      
      // Also set the user profile data that our useAuth hook might cache
      localStorage.setItem('auth-user-profile', JSON.stringify(session.user));
      
      // Set any other keys our app might check for admin status
      localStorage.setItem('user-role', 'ADMIN');
    }, { session: mockSession, user: mockAdminUser });

    // Save the storage state for use in tests
    await context.storageState({ path: 'tests/.auth/admin.json' });
    
    console.log('✅ Admin authentication state saved to tests/.auth/admin.json');
    
  } catch (error) {
    console.error('❌ Failed to setup admin authentication:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;