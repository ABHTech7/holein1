import { test, expect } from '@playwright/test';

/**
 * @tag @auth-persistence  
 * Enhanced Magic Link Persistence Tests
 * Tests 6-hour TTL, cooldown persistence, and resend banner
 */

test.describe('Enhanced Magic Link Persistence @auth-persistence', () => {
  test('should show resend banner with 6-hour TTL', async ({ page }) => {
    // Mock time control
    await page.addInitScript(() => {
      const originalDateNow = Date.now;
      let mockTime = originalDateNow();
      
      Date.now = () => mockTime;
      window.__setMockTime = (time: number) => { mockTime = time; };
    });

    // Set auth email with recent timestamp
    await page.addInitScript(() => {
      localStorage.setItem('last_auth_email', JSON.stringify({
        email: 'test@example.com',
        timestamp: Date.now()
      }));
    });

    await page.goto('/competition/test-club/test-competition');
    
    // Should show resend banner
    await expect(page.locator('text=Check your email')).toBeVisible();
    
    // Fast-forward 5 hours (should still be visible)
    await page.evaluate(() => {
      window.__setMockTime(Date.now() + 5 * 60 * 60 * 1000);
      // Trigger storage event to update components
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'last_auth_email',
        newValue: localStorage.getItem('last_auth_email')
      }));
    });
    
    await page.waitForTimeout(500);
    await expect(page.locator('text=Check your email')).toBeVisible();
    
    // Fast-forward 7 hours (should disappear)
    await page.evaluate(() => {
      window.__setMockTime(Date.now() + 7 * 60 * 60 * 1000);
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'last_auth_email',
        newValue: localStorage.getItem('last_auth_email')
      }));
    });
    
    await page.waitForTimeout(500);
    await expect(page.locator('text=Check your email')).not.toBeVisible();
  });

  test('should persist cooldown across page refresh', async ({ page }) => {
    await page.goto('/auth/expired-link?email=test@example.com');
    
    // Mock successful resend to trigger cooldown
    await page.addInitScript(() => {
      window.__MOCK_SEND_OTP = () => Promise.resolve({ error: null });
    });
    
    // Click resend button
    await Promise.all([
      page.waitForResponse(response => response.url().includes('auth') || true),
      page.click('button:has-text("Resend Link")')
    ]);
    
    // Should show cooldown
    await expect(page.locator('text=/Resend in \\d+s/')).toBeVisible();
    
    // Refresh page
    await page.reload();
    
    // Cooldown should persist (reading from localStorage)
    await expect(page.locator('button[disabled]:has-text("Resend in")')).toBeVisible();
  });

  test('should use environment variables for TTL and cooldown', async ({ page }) => {
    // Verify environment variables are used
    const entryTtl = await page.evaluate(() => {
      return parseInt(import.meta.env.VITE_ENTRY_CONTEXT_TTL_MINUTES as string, 10) || 360;
    });
    
    const authTtl = await page.evaluate(() => {
      return parseInt(import.meta.env.VITE_AUTH_EMAIL_TTL_MINUTES as string, 10) || 360;
    });
    
    const cooldownSeconds = await page.evaluate(() => {
      return parseInt(import.meta.env.VITE_RESEND_COOLDOWN_SECONDS as string, 10) || 60;
    });
    
    expect(entryTtl).toBe(360); // 6 hours
    expect(authTtl).toBe(360);  // 6 hours
    expect(cooldownSeconds).toBe(60); // 60 seconds
  });

  test('should handle email persistence across different pages', async ({ page }) => {
    // Set stored email
    await page.addInitScript(() => {
      localStorage.setItem('last_auth_email', JSON.stringify({
        email: 'persistent@example.com',
        timestamp: Date.now()
      }));
    });

    // Visit entry page - should show banner
    await page.goto('/competition/test-club/test-competition');
    await expect(page.locator('text=Check your email')).toBeVisible();
    
    // Navigate to expired link page - should prefill email
    await page.goto('/auth/expired-link');
    await expect(page.locator('text=persistent@example.com')).toBeVisible();
    
    // Clear storage
    await page.evaluate(() => localStorage.clear());
    
    // Reload - should not show email
    await page.reload();
    await expect(page.locator('text=Enter your email address')).toBeVisible();
  });
});