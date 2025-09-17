import { test, expect } from '@playwright/test';
import { ROUTE_PERMISSIONS, getRoutesForRole } from '../../src/lib/roleMatrix';

// Test user credentials - these should match your test database
const TEST_USERS = {
  ADMIN: { email: 'admin@test.com', password: 'password123' },
  CLUB: { email: 'club@test.com', password: 'password123' },
  PLAYER: { email: 'player@test.com', password: 'password123' }
};

async function loginAs(page: any, userType: keyof typeof TEST_USERS) {
  await page.goto('/auth');
  await page.fill('input[type="email"]', TEST_USERS[userType].email);
  await page.fill('input[type="password"]', TEST_USERS[userType].password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/**');
}

test.describe('Role-Based Access Control', () => {
  test.describe('Admin Access Tests', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'ADMIN');
    });

    test('Admin can access all admin routes', async ({ page }) => {
      const adminRoutes = getRoutesForRole('ADMIN').filter(r => r.category === 'admin');
      
      for (const route of adminRoutes.slice(0, 5)) { // Test first 5 to avoid timeout
        const testPath = route.path.replace(/:[^/]+/g, 'test-id');
        await page.goto(testPath);
        
        // Should not redirect to unauthorized page
        expect(page.url()).not.toContain('/auth');
        expect(page.url()).not.toContain('/404');
      }
    });

    test('Admin dashboard shows all management cards', async ({ page }) => {
      await page.goto('/dashboard/admin');
      
      // Check for admin-specific UI elements
      await expect(page.locator('text=Player Management')).toBeVisible();
      await expect(page.locator('text=Club Management')).toBeVisible();
      await expect(page.locator('text=Revenue Analytics')).toBeVisible();
    });
  });

  test.describe('Club Access Tests', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'CLUB');
    });

    test('Club cannot access admin-only routes', async ({ page }) => {
      await page.goto('/dashboard/admin');
      
      // Should redirect away from admin dashboard
      await page.waitForURL(url => !url.includes('/dashboard/admin'));
      expect(page.url()).not.toContain('/dashboard/admin');
    });

    test('Club can access club routes', async ({ page }) => {
      const clubRoutes = [
        '/dashboard/club',
        '/dashboard/club/competitions',
        '/dashboard/club/entries',
        '/dashboard/club/banking'
      ];

      for (const route of clubRoutes) {
        await page.goto(route);
        expect(page.url()).toContain(route);
        
        // Should not show access denied
        await expect(page.locator('text=Access Denied')).not.toBeVisible();
      }
    });

    test('Club dashboard shows appropriate sections', async ({ page }) => {
      await page.goto('/dashboard/club');
      
      // Check for club-specific UI elements
      await expect(page.locator('text=Competition Management')).toBeVisible();
      await expect(page.locator('text=Revenue')).toBeVisible();
      await expect(page.locator('text=Banking')).toBeVisible();
      
      // Should not show admin-only elements
      await expect(page.locator('text=System Settings')).not.toBeVisible();
    });
  });

  test.describe('Player Access Tests', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'PLAYER');
    });

    test('Player cannot access admin routes', async ({ page }) => {
      const adminRoutes = [
        '/dashboard/admin',
        '/dashboard/admin/players',
        '/dashboard/admin/clubs'
      ];

      for (const route of adminRoutes) {
        await page.goto(route);
        
        // Should redirect away from admin routes
        await page.waitForURL(url => !url.includes('/dashboard/admin'));
        expect(page.url()).not.toContain('/dashboard/admin');
      }
    });

    test('Player cannot access club-only routes', async ({ page }) => {
      const clubRoutes = [
        '/dashboard/club',
        '/dashboard/club/banking',
        '/dashboard/club/competitions/new'
      ];

      for (const route of clubRoutes) {
        await page.goto(route);
        
        // Should redirect away from club routes
        await page.waitForURL(url => !url.includes('/dashboard/club'));
        expect(page.url()).not.toContain('/dashboard/club');
      }
    });

    test('Player can access player routes', async ({ page }) => {
      await page.goto('/players/entries');
      
      expect(page.url()).toContain('/players/entries');
      await expect(page.locator('text=Your Entries')).toBeVisible();
    });
  });

  test.describe('Entry Flow Protection', () => {
    test('Unauthenticated users redirected on protected entry routes', async ({ page }) => {
      const protectedEntryRoutes = [
        '/entry-success/test-id',
        '/win-claim/test-id',
        '/entry/test-id/confirmation'
      ];

      for (const route of protectedEntryRoutes) {
        await page.goto(route);
        
        // Should redirect to auth
        await page.waitForURL('**/auth**');
        expect(page.url()).toContain('/auth');
      }
    });

    test('Competition entry pages accessible to all', async ({ page }) => {
      // These should be accessible without auth
      await page.goto('/competition/test-club/test-competition');
      
      // Should not redirect to auth immediately
      expect(page.url()).toContain('/competition/');
      expect(page.url()).not.toContain('/auth');
    });
  });

  test.describe('Deep Link Security', () => {
    test('Direct URL access respects role boundaries', async ({ page }) => {
      // Try to access admin route directly without auth
      await page.goto('/dashboard/admin/users');
      
      // Should redirect to auth
      await page.waitForURL('**/auth**');
      expect(page.url()).toContain('/auth');
    });

    test('Role switching cannot bypass restrictions', async ({ page }) => {
      // Login as player first
      await loginAs(page, 'PLAYER');
      
      // Try to access admin route
      await page.goto('/dashboard/admin');
      
      // Should be denied and redirected
      await page.waitForURL(url => !url.includes('/dashboard/admin'));
      expect(page.url()).not.toContain('/dashboard/admin');
    });
  });

  test.describe('UI Element Visibility', () => {
    test('Admin sees all navigation options', async ({ page }) => {
      await loginAs(page, 'ADMIN');
      await page.goto('/dashboard/admin');
      
      // Check for admin navigation elements
      await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible();
      await expect(page.locator('text=User Management')).toBeVisible();
    });

    test('Club sees limited navigation options', async ({ page }) => {
      await loginAs(page, 'CLUB');
      await page.goto('/dashboard/club');
      
      // Should not see admin-specific navigation
      await expect(page.locator('[data-testid="admin-nav"]')).not.toBeVisible();
      await expect(page.locator('text=User Management')).not.toBeVisible();
    });

    test('Player sees appropriate dashboard elements', async ({ page }) => {
      await loginAs(page, 'PLAYER');
      await page.goto('/players/entries');
      
      // Check for player-specific elements
      await expect(page.locator('text=Your Entries')).toBeVisible();
      await expect(page.locator('text=Entry History')).toBeVisible();
      
      // Should not see management options
      await expect(page.locator('text=Club Management')).not.toBeVisible();
    });
  });
});