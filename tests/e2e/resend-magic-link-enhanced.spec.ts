import { test, expect } from '@playwright/test';
import { AuthMocks } from '../helpers/auth-mocks';
import testCompetitions from '../fixtures/test-competitions.json';

/**
 * Enhanced Resend Magic Link Test Suite
 * Tests real button interaction, precise cooldown timing, rate limit verification
 * @tag resend
 */

test.describe('Resend Magic Link', () => {
  test.beforeEach(async ({ page }) => {
    // Setup fake timers for precise cooldown testing
    await page.addInitScript(() => {
      const originalSetTimeout = window.setTimeout;
      const originalSetInterval = window.setInterval;
      const originalClearTimeout = window.clearTimeout;
      const originalClearInterval = window.clearInterval;
      const originalDate = Date;
      
      let mockTime = Date.now();
      let timeoutId = 1;
      const timeouts = new Map();
      const intervals = new Map();
      
      window.__mockTime = mockTime;
      window.__timeouts = timeouts;
      window.__intervals = intervals;
      
      // Mock Date
      window.Date = class extends originalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(mockTime);
          } else {
            super(...args);
          }
        }
        
        static now() {
          return mockTime;
        }
      } as any;
      
      // Mock setTimeout
      window.setTimeout = (callback: any, delay: number = 0) => {
        const id = timeoutId++;
        timeouts.set(id, { callback, executeAt: mockTime + delay });
        return id;
      };
      
      // Mock clearTimeout
      window.clearTimeout = (id: any) => {
        timeouts.delete(id);
      };
      
      // Mock setInterval
      window.setInterval = (callback: any, delay: number) => {
        const id = timeoutId++;
        intervals.set(id, { callback, interval: delay, nextExecute: mockTime + delay });
        return id;
      };
      
      // Mock clearInterval
      window.clearInterval = (id: any) => {
        intervals.delete(id);
      };
      
      // Advance time function
      window.__advanceTime = (ms: number) => {
        const targetTime = mockTime + ms;
        
        while (mockTime < targetTime) {
          mockTime += 1;
          
          // Execute timeouts
          for (const [id, timeout] of timeouts.entries()) {
            if (timeout.executeAt <= mockTime) {
              timeout.callback();
              timeouts.delete(id);
            }
          }
          
          // Execute intervals
          for (const [id, interval] of intervals.entries()) {
            if (interval.nextExecute <= mockTime) {
              interval.callback();
              interval.nextExecute = mockTime + interval.interval;
            }
          }
        }
      };
    });

    // Clear storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Button Visibility & State', () => {
    test('resend button appears after initial OTP send @resend', async ({ page }) => {
      const competition = testCompetitions.active_competition;
      const authMocks = new AuthMocks(page);

      // Mock successful OTP send
      await authMocks.mockOtpSend(true, 100);

      // Go to competition entry
      await page.goto(`/competition/${competition.club_slug}/${competition.slug}`);

      // Fill and submit form
      await page.fill('[data-testid="first-name"]', 'Test');
      await page.fill('[data-testid="last-name"]', 'User');
      await page.fill('[data-testid="email"]', 'test@example.com');
      await page.click('[data-testid="submit-entry"]');

      // Should show OTP screen
      await expect(page.getByText('Check Your Email')).toBeVisible();
      
      // Resend button should be visible
      await expect(page.getByTestId('resend-link-btn')).toBeVisible();
    });

    test('resend button disabled during cooldown @resend', async ({ page }) => {
      // Go to auth page and trigger email sent state
      await page.goto('/auth');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      
      // Simulate email sent state
      await page.evaluate(() => {
        window.postMessage({ type: 'EMAIL_SENT', email: 'test@example.com' }, '*');
      });

      const resendBtn = page.getByTestId('resend-link-btn');
      await expect(resendBtn).toBeVisible();

      // Click resend button
      await resendBtn.click();

      // Button should be disabled and show countdown
      await expect(resendBtn).toBeDisabled();
      await expect(resendBtn).toContainText(/Resend in \d+s/);
    });

    test('cooldown timer counts down correctly @resend', async ({ page }) => {
      await page.goto('/auth');
      await page.evaluate(() => {
        window.postMessage({ type: 'EMAIL_SENT', email: 'test@example.com' }, '*');
      });

      const resendBtn = page.getByTestId('resend-link-btn');
      await resendBtn.click();

      // Should start at 60 seconds
      await expect(resendBtn).toContainText('Resend in 60s');

      // Advance time by 30 seconds
      await page.evaluate(() => {
        window.__advanceTime(30000);
      });
      await page.waitForTimeout(100); // Allow React to update

      // Should show 30 seconds remaining
      await expect(resendBtn).toContainText('Resend in 30s');

      // Advance to end of cooldown
      await page.evaluate(() => {
        window.__advanceTime(30000);
      });
      await page.waitForTimeout(100);

      // Button should be enabled again
      await expect(resendBtn).not.toBeDisabled();
      await expect(resendBtn).toContainText('Resend Link');
    });
  });

  test.describe('Rate Limiting', () => {
    test('rate limiting prevents excessive requests @resend', async ({ page }) => {
      const authMocks = new AuthMocks(page);
      
      // Mock resend with rate limiting after 3 attempts
      await authMocks.mockOtpResend(3);

      await page.goto('/auth');
      await page.evaluate(() => {
        window.postMessage({ type: 'EMAIL_SENT', email: 'test@example.com' }, '*');
      });

      const resendBtn = page.getByTestId('resend-link-btn');

      // First 3 attempts should work
      for (let i = 0; i < 3; i++) {
        await resendBtn.click();
        
        // Skip cooldown for testing
        await page.evaluate(() => {
          window.__advanceTime(60000);
        });
        await page.waitForTimeout(100);
      }

      // 4th attempt should show rate limit message
      await resendBtn.click();
      await expect(page.locator('.toast')).toContainText(/Too many attempts|rate limit/i);

      // Button should be disabled
      await expect(resendBtn).toBeDisabled();
      await expect(page.getByText(/Maximum attempts reached/i)).toBeVisible();
    });

    test('attempt counter displays correctly @resend', async ({ page }) => {
      // Set localStorage to simulate previous attempts
      await page.evaluate(() => {
        localStorage.setItem('resend_attempts', JSON.stringify({
          count: 2,
          timestamp: Date.now()
        }));
      });

      await page.goto('/auth');
      await page.evaluate(() => {
        window.postMessage({ type: 'EMAIL_SENT', email: 'test@example.com' }, '*');
      });

      // Should show remaining attempts
      await expect(page.getByText(/3 attempts remaining/i)).toBeVisible();
    });

    test('rate limit resets after time window @resend', async ({ page }) => {
      // Set old attempts (outside time window)
      await page.evaluate(() => {
        const oldTimestamp = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
        localStorage.setItem('resend_attempts', JSON.stringify({
          count: 5,
          timestamp: oldTimestamp
        }));
      });

      await page.goto('/auth');
      await page.evaluate(() => {
        window.postMessage({ type: 'EMAIL_SENT', email: 'test@example.com' }, '*');
      });

      // Should reset and allow resend
      const resendBtn = page.getByTestId('resend-link-btn');
      await expect(resendBtn).not.toBeDisabled();
      await expect(resendBtn).toContainText('Resend Link');
    });
  });

  test.describe('Success & Error Handling', () => {
    test('successful resend shows success toast @resend', async ({ page }) => {
      const competition = testCompetitions.active_competition;
      const authMocks = new AuthMocks(page);

      // Mock successful initial and resend
      await authMocks.mockOtpSend(true);
      
      await page.route('**/functions/v1/send-magic-link*', async (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      // Start entry flow
      await page.goto(`/competition/${competition.club_slug}/${competition.slug}`);
      await page.fill('[data-testid="first-name"]', 'Test');
      await page.fill('[data-testid="email"]', 'test@example.com');
      await page.click('[data-testid="submit-entry"]');

      // Wait for OTP screen
      await expect(page.getByText('Check Your Email')).toBeVisible();

      // Click resend
      const resendBtn = page.getByTestId('resend-link-btn');
      await resendBtn.click();

      // Should show success toast
      await expect(page.locator('.toast')).toContainText(/Link resent|sent successfully/i);
    });

    test('failed resend shows error toast @resend', async ({ page }) => {
      const competition = testCompetitions.active_competition;
      const authMocks = new AuthMocks(page);

      // Mock successful initial send
      await authMocks.mockOtpSend(true);
      
      // Mock failed resend
      await page.route('**/functions/v1/send-magic-link*', async (route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_email',
            message: 'Failed to send email'
          })
        });
      });

      // Start entry flow  
      await page.goto(`/competition/${competition.club_slug}/${competition.slug}`);
      await page.fill('[data-testid="first-name"]', 'Test');
      await page.fill('[data-testid="email"]', 'invalid@example.com');
      await page.click('[data-testid="submit-entry"]');

      // Wait for OTP screen
      await expect(page.getByText('Check Your Email')).toBeVisible();

      // Click resend
      const resendBtn = page.getByTestId('resend-link-btn');
      await resendBtn.click();

      // Should show error toast
      await expect(page.locator('.toast')).toContainText(/Failed to resend|error/i);
    });

    test('network timeout handled gracefully @resend', async ({ page }) => {
      const authMocks = new AuthMocks(page);
      await authMocks.mockOtpSend(true);

      // Mock timeout on resend
      await page.route('**/functions/v1/send-magic-link*', async (route) => {
        // Simulate timeout
        await new Promise(resolve => setTimeout(resolve, 5000));
        route.abort('timeout');
      });

      await page.goto('/auth');
      await page.evaluate(() => {
        window.postMessage({ type: 'EMAIL_SENT', email: 'test@example.com' }, '*');
      });

      const resendBtn = page.getByTestId('resend-link-btn');
      await resendBtn.click();

      // Should handle timeout and show appropriate message
      await expect(page.locator('.toast')).toContainText(/timeout|network error/i);
    });
  });

  test.describe('UI/UX Behavior', () => {
    test('button shows loading state during request @resend', async ({ page }) => {
      const authMocks = new AuthMocks(page);
      await authMocks.mockOtpSend(true);

      // Mock slow resend
      await page.route('**/functions/v1/send-magic-link*', async (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        }, 1000);
      });

      await page.goto('/auth');
      await page.evaluate(() => {
        window.postMessage({ type: 'EMAIL_SENT', email: 'test@example.com' }, '*');
      });

      const resendBtn = page.getByTestId('resend-link-btn');
      await resendBtn.click();

      // Should show loading state
      await expect(resendBtn).toContainText(/Resending|Sending/i);
      await expect(resendBtn).toBeDisabled();
    });

    test('email address displayed correctly in resend context @resend', async ({ page }) => {
      const testEmail = 'user@example.com';
      
      await page.goto('/auth');
      await page.evaluate((email) => {
        window.postMessage({ type: 'EMAIL_SENT', email }, '*');
      }, testEmail);

      // Should show the email address in the resend context
      await expect(page.getByText(testEmail)).toBeVisible();
      
      const resendBtn = page.getByTestId('resend-link-btn');
      await expect(resendBtn).toBeVisible();
    });

    test('resend preserves original email context @resend', async ({ page }) => {
      const originalEmail = 'original@example.com';
      
      await page.route('**/functions/v1/send-magic-link*', async (route) => {
        const body = route.request().postDataJSON();
        
        // Verify resend uses original email
        expect(body.email).toBe(originalEmail);
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/auth');
      await page.evaluate((email) => {
        window.postMessage({ type: 'EMAIL_SENT', email }, '*');
      }, originalEmail);

      const resendBtn = page.getByTestId('resend-link-btn');
      await resendBtn.click();

      // Toast should confirm resend to correct email
      await expect(page.locator('.toast')).toContainText(originalEmail);
    });
  });
});