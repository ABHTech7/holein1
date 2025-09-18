import { test, expect } from '@playwright/test';

test.describe('Magic Link 6-Hour Persistence', () => {
  test('@auth-persistence: banner visible after 5 hours, gone after 7 hours', async ({ page }) => {
    // Mock Date.now() to control time
    const mockTime = {
      current: Date.now()
    };
    
    await page.addInitScript((mockTimeObj) => {
      const originalDateNow = Date.now;
      window.__mockTime = mockTimeObj;
      Date.now = () => window.__mockTime.current;
      
      // Also mock Date constructor for consistency
      const OriginalDate = Date;
      window.Date = class extends OriginalDate {
        constructor(...args) {
          if (args.length === 0) {
            super(window.__mockTime.current);
          } else {
            super(...args);
          }
        }
        
        static now() {
          return window.__mockTime.current;
        }
      };
    }, mockTime);
    
    // Navigate to entry page and trigger magic link
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.click('[data-testid="enter-now-cta"]', { timeout: 10000 });
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="firstname-input"]', 'Test');
    await page.fill('[data-testid="lastname-input"]', 'User');
    await page.fill('[data-testid="phone-input"]', '+44 7700 900000');
    await page.fill('[data-testid="age-input"]', '25');
    await page.fill('[data-testid="handicap-input"]', '18');
    
    // Submit form to trigger magic link
    await page.click('[data-testid="submit-entry"]');
    await expect(page.locator('text=Check your email')).toBeVisible();
    
    // Go back to entry page and verify banner is visible
    await page.goBack();
    await expect(page.locator('text=We sent you a secure link')).toBeVisible();
    
    // Fast forward 5 hours (5 * 60 * 60 * 1000 = 18000000ms)
    mockTime.current += 18000000;
    await page.evaluate(() => {
      // Trigger a storage event to refresh components
      window.dispatchEvent(new Event('storage'));
    });
    
    // Refresh page and verify banner still visible
    await page.reload();
    await expect(page.locator('text=We sent you a secure link')).toBeVisible();
    
    // Fast forward 2.5 more hours (total 7.5 hours)
    mockTime.current += 9000000;
    await page.evaluate(() => {
      window.dispatchEvent(new Event('storage'));
    });
    
    // Refresh and verify banner is gone
    await page.reload();
    await expect(page.locator('text=We sent you a secure link')).not.toBeVisible();
  });

  test('@auth-persistence: cooldown persists across page refresh', async ({ page }) => {
    // Navigate to expired link page
    await page.goto('/auth/expired-link?email=test@example.com');
    
    // Click resend button
    await page.click('button', { hasText: 'Resend Link' });
    
    // Verify cooldown appears
    await expect(page.locator('text=Resend in')).toBeVisible();
    
    // Refresh page
    await page.reload();
    
    // Verify cooldown still active
    await expect(page.locator('text=Resend in')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Resend Link' })).toBeDisabled();
  });
});