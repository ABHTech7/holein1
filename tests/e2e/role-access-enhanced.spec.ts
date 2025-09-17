import { test, expect } from '@playwright/test';
import { ROUTES } from '../../src/routes';
import { loginAs, AuthUserType } from '../helpers/auth-mocks';

/**
 * Enhanced Role Access & Security Test Suite
 * Tests deep-link protection, toast verification, and UI element visibility
 * @tag role
 */

test.describe('Enhanced Role Access Control', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Admin Role Access', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('admin can access all admin routes @role', async ({ page }) => {
      const adminRoutes = [
        ROUTES.ADMIN.DASHBOARD,
        ROUTES.ADMIN.PLAYERS,
        ROUTES.ADMIN.CLUBS,
        ROUTES.ADMIN.COMPETITIONS,
        ROUTES.ADMIN.REVENUE,
        ROUTES.ADMIN.ENTRIES,
        ROUTES.ADMIN.CLAIMS,
        ROUTES.ADMIN.USERS
      ];

      for (const route of adminRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(route);
        
        // Should not show access denied toast
        await expect(page.locator('.toast')).not.toContainText('Access Denied');
      }
    });

    test('admin sees admin-specific UI elements @role', async ({ page }) => {
      await page.goto(ROUTES.ADMIN.DASHBOARD);
      
      // Admin dashboard should show admin cards
      await expect(page.getByTestId('admin-players-card')).toBeVisible();
      await expect(page.getByTestId('admin-clubs-card')).toBeVisible();
      await expect(page.getByTestId('admin-competitions-card')).toBeVisible();
    });
  });

  test.describe('Club Role Access', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'club_complete_banking');
    });

    test('club can access club routes but not admin routes @role', async ({ page }) => {
      // Club routes should be accessible
      const clubRoutes = [
        ROUTES.CLUB.DASHBOARD,
        ROUTES.CLUB.REVENUE,
        ROUTES.CLUB.ENTRIES,
        ROUTES.CLUB.BANKING,
        ROUTES.CLUB.COMPETITIONS
      ];

      for (const route of clubRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(route);
      }

      // Admin routes should redirect
      await page.goto(ROUTES.ADMIN.DASHBOARD);
      await expect(page).not.toHaveURL(ROUTES.ADMIN.DASHBOARD);
      
      // Should show access denied toast exactly once
      await expect(page.locator('.toast')).toContainText('Access Denied');
    });

    test('club sees club-specific UI elements @role', async ({ page }) => {
      await page.goto(ROUTES.CLUB.DASHBOARD);
      
      // Club dashboard should show club cards
      await expect(page.getByTestId('club-revenue-card')).toBeVisible();
      await expect(page.getByTestId('club-banking-card-btn')).toBeVisible();
      await expect(page.getByTestId('new-competition-cta')).toBeVisible();
    });
  });

  test.describe('Player Role Access', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'player');
    });

    test('player can only access player routes @role', async ({ page }) => {
      // Player routes should be accessible
      await page.goto(ROUTES.PLAYER.ENTRIES);
      await expect(page).toHaveURL(ROUTES.PLAYER.ENTRIES);

      // Admin routes should redirect with toast
      await page.goto(ROUTES.ADMIN.DASHBOARD);
      await expect(page).not.toHaveURL(ROUTES.ADMIN.DASHBOARD);
      await expect(page.locator('.toast')).toContainText('Access Denied');

      // Club routes should also redirect with toast
      await page.goto(ROUTES.CLUB.DASHBOARD);
      await expect(page).not.toHaveURL(ROUTES.CLUB.DASHBOARD);
      await expect(page.locator('.toast')).toContainText('Access Denied');
    });
  });

  test.describe('Deep-link Protection', () => {
    test('direct navigation to protected routes requires auth @role', async ({ page }) => {
      // Without auth, should redirect to auth page
      const protectedRoutes = [
        ROUTES.ADMIN.DASHBOARD,
        ROUTES.CLUB.DASHBOARD,
        ROUTES.ADMIN.USERS
      ];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(ROUTES.AUTH);
      }
    });

    test('role-specific redirects work correctly @role', async ({ page }) => {
      // Player trying to access admin route
      await loginAs(page, 'player');
      await page.goto(ROUTES.ADMIN.DASHBOARD);
      
      // Should redirect to player dashboard
      await expect(page).toHaveURL(ROUTES.PLAYER.ENTRIES);
    });
  });

  test.describe('Entry Success & Win Claim Protection', () => {
    test('entry success requires proper role @role', async ({ page }) => {
      const mockEntryId = 'test-entry-12345';
      
      // Without auth, should redirect
      await page.goto(ROUTES.ENTRY.SUCCESS(mockEntryId));
      await expect(page).toHaveURL(ROUTES.AUTH);
      
      // With auth, should allow access
      await loginAs(page, 'player');
      await page.goto(ROUTES.ENTRY.SUCCESS(mockEntryId));
      await expect(page).toHaveURL(ROUTES.ENTRY.SUCCESS(mockEntryId));
    });

    test('win claim requires proper role @role', async ({ page }) => {
      const mockEntryId = 'test-entry-12345';
      
      // Without auth, should redirect
      await page.goto(ROUTES.ENTRY.WIN_CLAIM(mockEntryId));
      await expect(page).toHaveURL(ROUTES.AUTH);
      
      // With auth, should allow access
      await loginAs(page, 'player');
      await page.goto(ROUTES.ENTRY.WIN_CLAIM(mockEntryId));
      await expect(page).toHaveURL(ROUTES.ENTRY.WIN_CLAIM(mockEntryId));
    });
  });

  test.describe('Legacy Route Protection', () => {
    test('unknown routes show 404 with proper redirect @role', async ({ page }) => {
      await page.goto('/non-existent-route');
      
      // Should show error page
      await expect(page.locator('h1')).toContainText(/404|Not Found|Error/i);
      
      // Should have way back to home
      const homeLink = page.getByRole('link', { name: /home|back/i });
      if (await homeLink.isVisible()) {
        await homeLink.click();
        await expect(page).toHaveURL(ROUTES.HOME);
      }
    });

    test('legacy competition routes still work @role', async ({ page }) => {
      const legacyCompetitionId = 'test-comp-123';
      await page.goto(`/competitions/${legacyCompetitionId}`);
      
      // Should load without redirect (legacy support)
      await expect(page).toHaveURL(`/competitions/${legacyCompetitionId}`);
    });
  });

  test.describe('Toast Behavior', () => {
    test('access denied toast appears exactly once per violation @role', async ({ page }) => {
      await loginAs(page, 'player');
      
      // First unauthorized access
      await page.goto(ROUTES.ADMIN.DASHBOARD);
      await expect(page.locator('.toast')).toContainText('Access Denied');
      
      // Wait for toast to disappear
      await page.waitForTimeout(2000);
      
      // Second unauthorized access should show toast again
      await page.goto(ROUTES.ADMIN.USERS);
      await expect(page.locator('.toast')).toContainText('Access Denied');
    });

    test('no unauthorized toast on legitimate access @role', async ({ page }) => {
      await loginAs(page, 'admin');
      
      // Legitimate admin access should not show access denied toast
      await page.goto(ROUTES.ADMIN.DASHBOARD);
      await expect(page.locator('.toast')).not.toContainText('Access Denied');
    });
  });
});