import { Page } from '@playwright/test';
import authUsers from '../fixtures/auth-users.json';

export interface MockAuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    user: any;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'CLUB' | 'PLAYER';
  first_name: string;
  last_name: string;
  club_id?: string;
  banking_complete?: boolean;
}

export type AuthUserType = keyof typeof authUsers;

/**
 * Mock Supabase auth responses for testing
 */
export class AuthMocks {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Mock successful OTP send
   */
  async mockOtpSend(success = true, delay = 100) {
    await this.page.route('**/auth/v1/otp', async (route) => {
      setTimeout(() => {
        if (success) {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({})
          });
        } else {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'invalid_request',
              error_description: 'Invalid email address'
            })
          });
        }
      }, delay);
    });
  }

  /**
   * Mock OTP resend with rate limiting
   */
  async mockOtpResend(attempts: number) {
    let callCount = 0;
    
    await this.page.route('**/functions/v1/send-magic-link*', async (route) => {
      callCount++;
      
      if (callCount <= attempts) {
        // Success for first few attempts
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        // Rate limit exceeded
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'rate_limit_exceeded',
            error_description: 'Too many requests'
          })
        });
      }
    });
  }

  /**
   * Mock auth state change events
   */
  async mockAuthStateChange(userType: AuthUserType | null) {
    const user = userType ? authUsers[userType] : null;
    
    await this.page.addInitScript((userData) => {
      // Mock supabase auth
      window.mockSupabaseAuth = {
        getSession: () => Promise.resolve({
          data: {
            session: userData ? {
              access_token: 'mock-token',
              refresh_token: 'mock-refresh',
              user: userData,
              expires_at: Date.now() + 3600000
            } : null
          },
          error: null
        }),
        onAuthStateChange: (callback: any) => {
          // Simulate auth event
          setTimeout(() => {
            callback('SIGNED_IN', userData ? {
              access_token: 'mock-token',
              user: userData
            } : null);
          }, 50);
          
          return { data: { subscription: { unsubscribe: () => {} } } };
        }
      };
    }, user);
  }

  /**
   * Mock exchange code for session (auth callback)
   */
  async mockExchangeCodeForSession(userType: AuthUserType | null, success = true) {
    const user = userType ? authUsers[userType] : null;
    
    await this.page.route('**/auth/v1/token*', async (route) => {
      if (success && user) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            user: user,
            session: {
              access_token: 'mock-access-token',
              refresh_token: 'mock-refresh-token',
              user: user,
              expires_at: Date.now() + 3600000
            }
          })
        });
      } else {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Invalid authorization code'
          })
        });
      }
    });
  }

  /**
   * Mock timeout errors
   */
  async mockTimeout() {
    await this.page.route('**/auth/v1/**', async (route) => {
      // Simulate network timeout
      await new Promise(resolve => setTimeout(resolve, 5000));
      route.abort('timeout');
    });
  }

  /**
   * Clear all auth mocks
   */
  async clearMocks() {
    await this.page.unroute('**/auth/v1/**');
    await this.page.unroute('**/functions/v1/send-magic-link*');
  }
}

/**
 * Helper to get test user data
 */
export function getTestUser(userType: AuthUserType): AuthUser {
  return authUsers[userType];
}

/**
 * Create a mock session for localStorage
 */
export function createMockSession(userType: AuthUserType) {
  const user = getTestUser(userType);
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    user: user,
    expires_at: Date.now() + 3600000
  };
}

/**
 * Login helper for E2E tests
 */
export async function loginAs(page: Page, userType: AuthUserType) {
  const user = getTestUser(userType);
  const authMocks = new AuthMocks(page);
  
  // Set up auth mocks
  await authMocks.mockAuthStateChange(userType);
  
  // Go to auth page and "login"
  await page.goto('/auth');
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  
  // Mock the login request
  await page.route('**/auth/v1/token*', async (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token',
        user: user,
        session: createMockSession(userType)
      })
    });
  });
  
  await page.click('[data-testid="login-button"]');
  
  // Wait for navigation to complete
  await page.waitForTimeout(500);
}