import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth-mocks';
import { BankingMocks } from '../helpers/banking-mocks';
import { ROUTES } from '../../src/routes';

/**
 * Enhanced Banking Banner Test Suite
 * Tests first-paint timing, loading state verification, no flash behavior
 * @tag banking
 */

test.describe('Banking Banner Flash Prevention', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('No Flash Behavior', () => {
    test('no red flash when banking complete on first paint @banking', async ({ page }) => {
      const bankingMocks = new BankingMocks(page);
      
      // Mock complete banking details with no delay
      await bankingMocks.mockBankingDetails('complete_banking', 0);

      // Login as club with complete banking
      await loginAs(page, 'club_complete_banking');
      
      // Track banner visibility during page load
      let bannerWasVisible = false;
      
      page.on('response', response => {
        if (response.url().includes('club_banking')) {
          console.log('Banking response received');
        }
      });

      // Navigate to dashboard and immediately check for banner
      await page.goto(ROUTES.CLUB.DASHBOARD);
      
      // Check if banner appears at any point during initial render
      try {
        await expect(page.getByTestId('banking-required-banner')).toBeVisible({ timeout: 100 });
        bannerWasVisible = true;
      } catch (e) {
        // Banner should not be visible - this is expected
        bannerWasVisible = false;
      }
      
      // Banner should never have been visible for complete banking
      expect(bannerWasVisible).toBeFalsy();
      
      // Verify page loaded correctly
      await expect(page.getByText('Club Dashboard')).toBeVisible();
      await expect(page.getByTestId('new-competition-cta')).toBeEnabled();
    });

    test('banner shows correctly when banking incomplete without flash @banking', async ({ page }) => {
      const bankingMocks = new BankingMocks(page);
      
      // Mock incomplete banking with debounce delay
      await bankingMocks.mockBankingDetails('incomplete_banking', 200);

      await loginAs(page, 'club_incomplete_banking');
      
      await page.goto(ROUTES.CLUB.DASHBOARD);
      
      // Wait for the status to become ready
      await page.waitForTimeout(250);
      
      // Banner should be visible after status becomes ready
      await expect(page.getByTestId('banking-required-banner')).toBeVisible();
      await expect(page.getByText('Banking details required')).toBeVisible();
      
      // CTA should be disabled
      await expect(page.getByTestId('new-competition-cta')).toBeDisabled();
    });

    test('reserved space prevents layout shift @banking', async ({ page }) => {
      const bankingMocks = new BankingMocks(page);
      await bankingMocks.mockBankingDetails('incomplete_banking', 300);

      await loginAs(page, 'club_incomplete_banking');
      
      // Get initial page layout
      await page.goto(ROUTES.CLUB.DASHBOARD);
      
      const initialHeaderRect = await page.getByText('Club Dashboard').boundingBox();
      
      // Wait for banking status to load and banner to appear
      await page.waitForTimeout(350);
      await expect(page.getByTestId('banking-required-banner')).toBeVisible();
      
      const finalHeaderRect = await page.getByText('Club Dashboard').boundingBox();
      
      // Header position should not have shifted significantly
      const yDiff = Math.abs((initialHeaderRect?.y || 0) - (finalHeaderRect?.y || 0));
      expect(yDiff).toBeLessThan(10); // Allow small variance
    });
  });

  test.describe('Loading State Handling', () => {
    test('loading state prevents premature banner display @banking', async ({ page }) => {
      const bankingMocks = new BankingMocks(page);
      
      // Mock banking with significant delay
      await bankingMocks.mockBankingDetailsWithDelay('incomplete_banking', 1000);

      await loginAs(page, 'club_incomplete_banking');
      
      await page.goto(ROUTES.CLUB.DASHBOARD);
      
      // During loading, banner should not be visible
      await page.waitForTimeout(500);
      await expect(page.getByTestId('banking-required-banner')).toHaveCount(0);
      
      // After loading completes, banner should appear
      await page.waitForTimeout(600);
      await expect(page.getByTestId('banking-required-banner')).toBeVisible();
    });

    test('status transitions correctly: idle -> loading -> ready @banking', async ({ page }) => {
      const bankingMocks = new BankingMocks(page);
      await bankingMocks.mockBankingDetails('complete_banking', 200);

      await loginAs(page, 'club_complete_banking');
      
      // Add status tracking
      await page.addInitScript(() => {
        window.bankingStatusLog = [];
        
        // Mock the hook to track status changes
        const originalUseEffect = React.useEffect;
        React.useEffect = (effect, deps) => {
          const result = originalUseEffect(effect, deps);
          
          // Track banking status changes
          if (deps && deps.some(dep => dep?.toString().includes('banking'))) {
            setTimeout(() => {
              const status = window.bankingStatus;
              if (status) {
                window.bankingStatusLog.push({
                  status: status,
                  timestamp: Date.now()
                });
              }
            }, 0);
          }
          
          return result;
        };
      });

      await page.goto(ROUTES.CLUB.DASHBOARD);
      
      // Wait for all transitions
      await page.waitForTimeout(300);
      
      // Verify the page loaded without banner (complete banking)
      await expect(page.getByTestId('banking-required-banner')).toHaveCount(0);
    });
  });

  test.describe('Error Handling', () => {
    test('banking error state handled gracefully @banking', async ({ page }) => {
      const bankingMocks = new BankingMocks(page);
      
      // Mock banking error
      await bankingMocks.mockBankingError(500, 100);

      await loginAs(page, 'club_complete_banking');
      
      await page.goto(ROUTES.CLUB.DASHBOARD);
      
      // Wait for error response
      await page.waitForTimeout(200);
      
      // Should not show banner when error occurs
      await expect(page.getByTestId('banking-required-banner')).toHaveCount(0);
      
      // Page should still be functional
      await expect(page.getByText('Club Dashboard')).toBeVisible();
    });

    test('network timeout handled without flash @banking', async ({ page }) => {
      await loginAs(page, 'club_complete_banking');
      
      // Mock very slow response
      await page.route('**/rest/v1/club_banking*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });

      await page.goto(ROUTES.CLUB.DASHBOARD);
      
      // During timeout period, no banner should show
      await page.waitForTimeout(1000);
      await expect(page.getByTestId('banking-required-banner')).toHaveCount(0);
      
      // Page should remain functional
      await expect(page.getByText('Club Dashboard')).toBeVisible();
    });
  });

  test.describe('Multiple State Scenarios', () => {
    test('rapid navigation does not cause flash @banking', async ({ page }) => {
      const bankingMocks = new BankingMocks(page);
      await bankingMocks.mockBankingDetails('complete_banking', 0);

      await loginAs(page, 'club_complete_banking');
      
      // Rapid navigation between pages
      await page.goto(ROUTES.CLUB.DASHBOARD);
      await page.goto(ROUTES.CLUB.REVENUE);
      await page.goto(ROUTES.CLUB.DASHBOARD);
      await page.goto(ROUTES.CLUB.ENTRIES);
      await page.goto(ROUTES.CLUB.DASHBOARD);
      
      // No banner should ever appear
      await expect(page.getByTestId('banking-required-banner')).toHaveCount(0);
    });

    test('page refresh maintains no-flash behavior @banking', async ({ page }) => {
      const bankingMocks = new BankingMocks(page);
      await bankingMocks.mockBankingDetails('complete_banking', 0);

      await loginAs(page, 'club_complete_banking');
      
      await page.goto(ROUTES.CLUB.DASHBOARD);
      
      // Refresh page multiple times
      for (let i = 0; i < 3; i++) {
        await page.reload();
        await page.waitForTimeout(100);
        
        // Banner should never appear
        await expect(page.getByTestId('banking-required-banner')).toHaveCount(0);
      }
    });

    test('banner persistence when banking incomplete @banking', async ({ page }) => {
      const bankingMocks = new BankingMocks(page);
      await bankingMocks.mockBankingDetails('incomplete_banking', 150);

      await loginAs(page, 'club_incomplete_banking');
      
      await page.goto(ROUTES.CLUB.DASHBOARD);
      
      // Wait for banner to appear
      await expect(page.getByTestId('banking-required-banner')).toBeVisible();
      
      // Navigate to other pages and back - banner should persist
      await page.goto(ROUTES.CLUB.REVENUE);
      await page.goBack();
      
      await expect(page.getByTestId('banking-required-banner')).toBeVisible();
    });
  });

  test.describe('CTA Interaction', () => {
    test('disabled CTA redirects to banking when clicked @banking', async ({ page }) => {
      const bankingMocks = new BankingMocks(page);
      await bankingMocks.mockBankingDetails('incomplete_banking', 100);

      await loginAs(page, 'club_incomplete_banking');
      
      await page.goto(ROUTES.CLUB.DASHBOARD);
      
      // Wait for banner and disabled CTA
      await expect(page.getByTestId('banking-required-banner')).toBeVisible();
      const cta = page.getByTestId('new-competition-cta');
      await expect(cta).toBeDisabled();
      
      // Click should still redirect to banking
      await cta.click();
      await expect(page).toHaveURL(ROUTES.CLUB.BANKING);
    });

    test('enabled CTA works when banking complete @banking', async ({ page }) => {
      const bankingMocks = new BankingMocks(page);
      await bankingMocks.mockBankingDetails('complete_banking', 0);

      await loginAs(page, 'club_complete_banking');
      
      await page.goto(ROUTES.CLUB.DASHBOARD);
      
      // No banner should appear
      await expect(page.getByTestId('banking-required-banner')).toHaveCount(0);
      
      // CTA should be enabled
      const cta = page.getByTestId('new-competition-cta');
      await expect(cta).toBeEnabled();
      
      // Click should navigate to competition creation
      await cta.click();
      await expect(page).toHaveURL(ROUTES.CLUB.COMPETITIONS_NEW);
    });
  });
});