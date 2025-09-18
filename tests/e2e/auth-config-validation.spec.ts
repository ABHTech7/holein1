import { test, expect } from '@playwright/test';

test.describe('Auth Configuration Validation', () => {
  test('@auth-config: PKCE fallback triggers when code verifier missing', async ({ page, context }) => {
    // Navigate to entry form first
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Fill out entry form to establish context
    await page.click('[data-testid="enter-now-cta"]', { timeout: 10000 });
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="firstname-input"]', 'Test');
    await page.fill('[data-testid="lastname-input"]', 'User');
    await page.fill('[data-testid="phone-input"]', '+44 7700 900000');
    await page.fill('[data-testid="age-input"]', '25');
    await page.fill('[data-testid="handicap-input"]', '18');
    
    // Submit to trigger magic link
    await page.click('[data-testid="submit-entry"]');
    await expect(page.locator('text=Check your email')).toBeVisible();
    
    // Mock Supabase auth methods to simulate PKCE failure
    await page.addInitScript(() => {
      window.__mockSupabaseAuth = {
        exchangeCodeForSession: () => Promise.reject({
          message: 'both auth code and code verifier should be non-empty'
        }),
        verifyOtp: () => Promise.resolve({
          data: { user: { email: 'test@example.com' }, session: {} },
          error: null
        })
      };
    });
    
    // Simulate opening magic link in different browser context (no PKCE verifier)
    const newPage = await context.newPage();
    
    // Override supabase auth in new page
    await newPage.addInitScript(() => {
      // Mock the auth methods
      Object.defineProperty(window, 'supabase', {
        value: {
          auth: {
            exchangeCodeForSession: () => Promise.reject({
              message: 'both auth code and code verifier should be non-empty'
            }),
            verifyOtp: () => Promise.resolve({
              data: { user: { email: 'test@example.com' }, session: {} },
              error: null
            })
          }
        },
        writable: true
      });
    });
    
    // Navigate to auth callback with mock code
    await newPage.goto('/auth/callback?code=mock_code&email=test@example.com');
    
    // Should redirect to expired link page with auto-resend
    await expect(newPage.locator('text=We\'re sending a new one')).toBeVisible();
    await expect(newPage.locator('text=test@example.com')).toBeVisible();
    
    await newPage.close();
  });

  test('@auth-config: successful auth flow continues to entry', async ({ page }) => {
    // Navigate to entry form
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.click('[data-testid="enter-now-cta"]', { timeout: 10000 });
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="firstname-input"]', 'Test'); 
    await page.fill('[data-testid="lastname-input"]', 'User');
    await page.fill('[data-testid="phone-input"]', '+44 7700 900000');
    await page.fill('[data-testid="age-input"]', '25');
    await page.fill('[data-testid="handicap-input"]', '18');
    
    await page.click('[data-testid="submit-entry"]');
    await expect(page.locator('text=Check your email')).toBeVisible();
    
    // Mock successful auth
    await page.addInitScript(() => {
      Object.defineProperty(window, 'supabase', {
        value: {
          auth: {
            exchangeCodeForSession: () => Promise.resolve({
              data: { 
                user: { email: 'test@example.com', id: 'test-user-id' }, 
                session: { access_token: 'mock-token' } 
              },
              error: null
            })
          }
        },
        writable: true
      });
    });
    
    // Navigate to successful auth callback
    await page.goto('/auth/callback?code=valid_code&email=test@example.com');
    
    // Should continue to entry flow or player dashboard
    await page.waitForLoadState('networkidle');
    
    // Verify we don't see error messages
    await expect(page.locator('text=expired')).not.toBeVisible();
    await expect(page.locator('text=code verifier')).not.toBeVisible();
    await expect(page.locator('text=invalid request')).not.toBeVisible();
  });

  test('@auth-config: site URL mismatch logged in console', async ({ page }) => {
    const consoleLogs: string[] = [];
    
    // Capture console logs
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'warn') {
        consoleLogs.push(msg.text());
      }
    });
    
    // Navigate to trigger auth diagnostics
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that auth diagnostics logged origin
    const authDiagLogs = consoleLogs.filter(log => log.includes('[AuthDiag]'));
    expect(authDiagLogs.length).toBeGreaterThan(0);
    
    // Should log current origin
    const originLog = authDiagLogs.find(log => log.includes('origin='));
    expect(originLog).toBeTruthy();
    
    // If running on different domain than expected, should warn
    const currentOrigin = await page.evaluate(() => window.location.origin);
    const expectedSiteUrl = 'https://demo.holein1challenge.co.uk';
    
    if (currentOrigin !== expectedSiteUrl) {
      const warningLog = authDiagLogs.find(log => log.includes('WARNING'));
      expect(warningLog).toBeTruthy();
    }
  });
});