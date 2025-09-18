import { test, expect } from '@playwright/test';

/**
 * @tag @auth-config
 * Enhanced Auth Configuration Validation Tests
 * Tests PKCE fallback, auto-resend, and diagnostics
 */

test.describe('Enhanced Auth Configuration @auth-config', () => {
  test('should show diagnostics on app load', async ({ page }) => {
    // Listen for console logs
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    await page.goto('/');
    
    // Wait for app to initialize
    await page.waitForTimeout(1000);
    
    // Check for diagnostic logs
    expect(logs.some(log => log.includes('[AuthDiag] origin='))).toBe(true);
    expect(logs.some(log => log.includes('✅ Magic link: PKCE fallback enabled'))).toBe(true);
    expect(logs.some(log => log.includes('✅ Resend banner: TTL=6h, cooldown persistence enabled'))).toBe(true);
    expect(logs.some(log => log.includes('✅ Expired link page: auto-resend active'))).toBe(true);
  });

  test('should handle PKCE missing and auto-resend', async ({ page }) => {
    // Mock Supabase client to simulate PKCE failure
    await page.addInitScript(() => {
      window.__MOCKED_SUPABASE = {
        auth: {
          exchangeCodeForSession: () => Promise.resolve({ 
            error: { message: 'both auth code and code verifier should be non-empty' }
          }),
          verifyOtp: () => Promise.resolve({ error: null }),
          signInWithOtp: () => Promise.resolve({ error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          getSession: () => Promise.resolve({ data: { session: null } })
        }
      };
    });

    // Navigate to auth callback with code but missing verifier
    await page.goto('/auth/callback?code=mock_code&email=test@example.com');
    
    // Should redirect to expired link page with auto-resend
    await expect(page).toHaveURL(/\/auth\/expired-link.*auto_resend=1/);
    
    // Should show PKCE-specific message
    await expect(page.locator('text=Link opened in different app')).toBeVisible();
  });

  test('should persist cooldown across refresh', async ({ page }) => {
    // Go to expired link page
    await page.goto('/auth/expired-link?email=test@example.com');
    
    // Click resend (will trigger cooldown)
    await page.click('button:has-text("Resend Link")');
    
    // Should show cooldown timer
    await expect(page.locator('text=/Resend in \\d+s/')).toBeVisible();
    
    // Refresh page
    await page.reload();
    
    // Cooldown should persist
    await expect(page.locator('text=/Resend in \\d+s/')).toBeVisible();
  });

  test('should auto-resend on expired link with auto_resend=1', async ({ page }) => {
    const resendCalls: string[] = [];
    
    // Mock sendOtp calls
    await page.addInitScript(() => {
      window.__MOCK_SEND_OTP = (email: string) => {
        window.__RESEND_CALLS = window.__RESEND_CALLS || [];
        window.__RESEND_CALLS.push(email);
        return Promise.resolve({ error: null });
      };
    });

    // Navigate with auto_resend=1
    await page.goto('/auth/expired-link?email=test@example.com&reason=pkce_missing&auto_resend=1');
    
    // Should show auto-resend message
    await expect(page.locator('text=New link sent!')).toBeVisible({ timeout: 3000 });
    
    // Should show PKCE-specific messaging
    await expect(page.locator('text=different app or browser')).toBeVisible();
  });
});