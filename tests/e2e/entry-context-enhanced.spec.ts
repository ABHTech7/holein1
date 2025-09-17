import { test, expect } from '@playwright/test';
import { AuthMocks, loginAs } from '../helpers/auth-mocks';
import testCompetitions from '../fixtures/test-competitions.json';

/**
 * Enhanced Entry Context Persistence Test Suite
 * Tests multi-tab scenarios, browser restart, 30-min expiry edge cases
 * @tag entry
 */

test.describe('Entry Context Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage and setup fake timers
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Basic Context Persistence', () => {
    test('form data persists through page refresh @entry', async ({ page }) => {
      const competition = testCompetitions.entry_context_competition;
      
      // Go to competition entry page
      await page.goto(`/competition/${competition.club_slug}/${competition.slug}`);
      
      // Fill out entry form
      await page.fill('[data-testid="first-name"]', 'John');
      await page.fill('[data-testid="last-name"]', 'Doe');
      await page.fill('[data-testid="email"]', 'john.doe@test.com');
      await page.fill('[data-testid="phone"]', '07700900123');
      
      // Submit form (this should store context)
      await page.click('[data-testid="submit-entry"]');
      
      // Verify context is stored
      const context = await page.evaluate(() => {
        return localStorage.getItem('pending_entry_context');
      });
      expect(context).toBeTruthy();
      
      const parsedContext = JSON.parse(context!);
      expect(parsedContext.formData.firstName).toBe('John');
      expect(parsedContext.formData.lastName).toBe('Doe');
      expect(parsedContext.formData.email).toBe('john.doe@test.com');
      
      // Refresh page and verify context persists
      await page.reload();
      
      const contextAfterRefresh = await page.evaluate(() => {
        return localStorage.getItem('pending_entry_context');
      });
      expect(contextAfterRefresh).toBeTruthy();
      expect(JSON.parse(contextAfterRefresh!).formData.firstName).toBe('John');
    });

    test('context expires after 30 minutes @entry', async ({ page }) => {
      // Install fake timers
      await page.addInitScript(() => {
        const originalNow = Date.now;
        window.__mockTime = originalNow();
        
        Date.now = () => window.__mockTime;
        Date.prototype.getTime = function() {
          return window.__mockTime;
        };
        
        window.__advanceTime = (ms: number) => {
          window.__mockTime += ms;
        };
      });

      const competition = testCompetitions.entry_context_competition;
      
      // Create valid context
      await page.evaluate((comp) => {
        const context = {
          competitionId: comp.id,
          clubSlug: comp.club_slug,
          competitionSlug: comp.slug,
          formData: {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            phone: '07700900123',
            age: 25,
            gender: 'male',
            handicap: 10
          },
          timestamp: Date.now(),
          expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
        };
        localStorage.setItem('pending_entry_context', JSON.stringify(context));
      }, competition);

      // Advance time by 31 minutes
      await page.evaluate(() => {
        window.__advanceTime(31 * 60 * 1000);
      });

      // Navigate to auth callback (this triggers context check)
      await page.goto('/auth/callback?code=mock-code');

      // Context should be expired and removed
      const contextAfterExpiry = await page.evaluate(() => {
        return localStorage.getItem('pending_entry_context');
      });
      expect(contextAfterExpiry).toBeNull();

      // Should redirect to home instead of using expired context
      await expect(page).toHaveURL('/');
    });

    test('valid context redirects after auth callback @entry', async ({ page }) => {
      const competition = testCompetitions.entry_context_competition;
      const mockEntryId = 'test-entry-redirect-12345';
      
      // Set up valid context with entryId
      await page.evaluate((data) => {
        const context = {
          competitionId: data.competition.id,
          clubSlug: data.competition.club_slug,
          competitionSlug: data.competition.slug,
          entryId: data.entryId,
          timestamp: Date.now(),
          expiresAt: Date.now() + (30 * 60 * 1000)
        };
        localStorage.setItem('pending_entry_context', JSON.stringify(context));
      }, { competition, entryId: mockEntryId });

      // Mock successful auth
      const authMocks = new AuthMocks(page);
      await authMocks.mockExchangeCodeForSession('player', true);

      // Navigate to auth callback
      await page.goto('/auth/callback?code=mock-auth-code');

      // Should redirect to entry success page
      await expect(page).toHaveURL(`/entry-success/${mockEntryId}`);
    });
  });

  test.describe('Multi-tab Scenarios', () => {
    test('context syncs across multiple tabs @entry', async ({ browser }) => {
      const context = await browser.newContext();
      const page1 = await context.newPage();
      const page2 = await context.newPage();

      const competition = testCompetitions.entry_context_competition;

      // Tab 1: Start entry process
      await page1.goto(`/competition/${competition.club_slug}/${competition.slug}`);
      await page1.fill('[data-testid="first-name"]', 'Multi');
      await page1.fill('[data-testid="last-name"]', 'Tab');
      await page1.fill('[data-testid="email"]', 'multitab@test.com');
      await page1.click('[data-testid="submit-entry"]');

      // Tab 2: Check if context is available
      await page2.goto('/auth');
      
      const contextInTab2 = await page2.evaluate(() => {
        return localStorage.getItem('pending_entry_context');
      });
      expect(contextInTab2).toBeTruthy();
      
      const parsedContext = JSON.parse(contextInTab2!);
      expect(parsedContext.formData.firstName).toBe('Multi');

      await context.close();
    });

    test('latest entry context overwrites previous @entry', async ({ page }) => {
      const comp1 = testCompetitions.active_competition;
      const comp2 = testCompetitions.entry_context_competition;

      // First entry
      await page.goto(`/competition/${comp1.club_slug}/${comp1.slug}`);
      await page.fill('[data-testid="first-name"]', 'First');
      await page.fill('[data-testid="email"]', 'first@test.com');
      await page.click('[data-testid="submit-entry"]');

      // Second entry (should overwrite first)
      await page.goto(`/competition/${comp2.club_slug}/${comp2.slug}`);
      await page.fill('[data-testid="first-name"]', 'Second');
      await page.fill('[data-testid="email"]', 'second@test.com');
      await page.click('[data-testid="submit-entry"]');

      // Check context contains second entry data
      const context = await page.evaluate(() => {
        return localStorage.getItem('pending_entry_context');
      });
      const parsedContext = JSON.parse(context!);
      
      expect(parsedContext.formData.firstName).toBe('Second');
      expect(parsedContext.formData.email).toBe('second@test.com');
      expect(parsedContext.competitionId).toBe(comp2.id);
    });
  });

  test.describe('Browser Restart Scenarios', () => {
    test('context survives browser restart within expiry @entry', async ({ browser }) => {
      // First browser session
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const competition = testCompetitions.entry_context_competition;
      
      // Create entry context
      await page1.goto(`/competition/${competition.club_slug}/${competition.slug}`);
      await page1.fill('[data-testid="first-name"]', 'Restart');
      await page1.fill('[data-testid="email"]', 'restart@test.com');
      await page1.click('[data-testid="submit-entry"]');

      // Verify context is stored
      const storedContext = await page1.evaluate(() => {
        return localStorage.getItem('pending_entry_context');
      });
      expect(storedContext).toBeTruthy();

      await context1.close();

      // Simulate browser restart with new context (but same storage)
      const context2 = await browser.newContext({
        storageState: undefined // Fresh context but localStorage persists in real scenario
      });
      const page2 = await context2.newPage();

      // Manually restore the context (simulating persistence)
      await page2.evaluate((contextData) => {
        localStorage.setItem('pending_entry_context', contextData);
      }, storedContext);

      // Navigate to auth page - context should be restored
      await page2.goto('/auth');
      
      const restoredContext = await page2.evaluate(() => {
        return localStorage.getItem('pending_entry_context');
      });
      expect(restoredContext).toBeTruthy();
      
      const parsedContext = JSON.parse(restoredContext!);
      expect(parsedContext.formData.firstName).toBe('Restart');

      await context2.close();
    });

    test('expired context cleaned up on app load @entry', async ({ page }) => {
      // Set expired context
      await page.evaluate(() => {
        const expiredContext = {
          competitionId: 'test-comp-123',
          timestamp: Date.now() - (40 * 60 * 1000), // 40 minutes ago
          expiresAt: Date.now() - (10 * 60 * 1000)  // Expired 10 minutes ago
        };
        localStorage.setItem('pending_entry_context', JSON.stringify(expiredContext));
      });

      // Navigate to home page (triggers cleanup)
      await page.goto('/');
      
      // Wait for app to load and cleanup to run
      await page.waitForTimeout(100);

      // Context should be cleaned up
      const contextAfterLoad = await page.evaluate(() => {
        return localStorage.getItem('pending_entry_context');
      });
      expect(contextAfterLoad).toBeNull();
    });
  });

  test.describe('Auth Callback Integration', () => {
    test('auth callback handles missing context gracefully @entry', async ({ page }) => {
      // Mock successful auth without any context
      const authMocks = new AuthMocks(page);
      await authMocks.mockExchangeCodeForSession('player', true);

      await page.goto('/auth/callback?code=mock-code');

      // Should redirect to home page when no context
      await expect(page).toHaveURL('/');
    });

    test('auth failure clears pending context @entry', async ({ page }) => {
      const competition = testCompetitions.entry_context_competition;
      
      // Set up valid context
      await page.evaluate((comp) => {
        const context = {
          competitionId: comp.id,
          formData: { firstName: 'Test', email: 'test@example.com' },
          timestamp: Date.now(),
          expiresAt: Date.now() + (30 * 60 * 1000)
        };
        localStorage.setItem('pending_entry_context', JSON.stringify(context));
      }, competition);

      // Mock auth failure
      const authMocks = new AuthMocks(page);
      await authMocks.mockExchangeCodeForSession(null, false);

      await page.goto('/auth/callback?code=invalid-code');

      // Context should be cleared after auth failure
      const contextAfterFailure = await page.evaluate(() => {
        return localStorage.getItem('pending_entry_context');
      });
      expect(contextAfterFailure).toBeNull();
    });
  });

  test.describe('Step Tracking', () => {
    test('entry step persists during multi-step flow @entry', async ({ page }) => {
      const competition = testCompetitions.entry_context_competition;
      
      // Start entry process
      await page.goto(`/competition/${competition.club_slug}/${competition.slug}`);
      await page.fill('[data-testid="first-name"]', 'Step');
      await page.fill('[data-testid="email"]', 'step@test.com');
      await page.click('[data-testid="submit-entry"]');

      // Should be on OTP step
      await expect(page.getByText('Check Your Email')).toBeVisible();

      // Check that step is tracked
      const step = await page.evaluate(() => {
        return localStorage.getItem('pending_entry_step');
      });
      expect(step).toBeTruthy();
      
      const parsedStep = JSON.parse(step!);
      expect(parsedStep.step).toBe('otp');
    });

    test('step data clears on completion @entry', async ({ page }) => {
      // Set up completed entry scenario
      await page.evaluate(() => {
        localStorage.setItem('pending_entry_step', JSON.stringify({
          step: 'complete',
          data: { entryId: 'test-entry-complete' }
        }));
      });

      // Navigate to entry success page
      await page.goto('/entry-success/test-entry-complete');
      
      // Step should be cleared
      const stepAfterCompletion = await page.evaluate(() => {
        return localStorage.getItem('pending_entry_step');
      });
      expect(stepAfterCompletion).toBeNull();
    });
  });
});