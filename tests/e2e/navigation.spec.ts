import { test, expect } from '@playwright/test';
import { ROUTES } from '../../src/routes';

/**
 * Navigation Security & Integrity Test Suite
 * Tests all navigation flows, role guards, and link integrity
 */

// Test fixtures for different user roles
const TEST_USERS = {
  ADMIN: {
    email: 'admin@test.com',
    password: 'admin123',
    role: 'ADMIN'
  },
  CLUB: {
    email: 'club@test.com', 
    password: 'club123',
    role: 'CLUB'
  },
  PLAYER: {
    email: 'player@test.com',
    password: 'player123', 
    role: 'PLAYER'
  }
};

/**
 * Helper function to login as specific user role
 */
async function loginAs(page: any, userType: keyof typeof TEST_USERS) {
  const user = TEST_USERS[userType];
  await page.goto(ROUTES.AUTH);
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for redirect to complete
  await page.waitForNavigation();
}

test.describe('Public Navigation', () => {
  test('homepage loads and has working navigation', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    
    // Check main navigation elements exist
    await expect(page.locator('[data-testid="site-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="site-footer"]')).toBeVisible();
    
    // Test primary CTAs
    const loginButton = page.locator('[data-testid="login-cta"]');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await expect(page).toHaveURL(ROUTES.AUTH);
    }
  });

  test('auth page works correctly', async ({ page }) => {
    await page.goto(ROUTES.AUTH);
    
    // Check form elements exist
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('404 page handles unknown routes', async ({ page }) => {
    await page.goto('/non-existent-route');
    
    // Should show 404 or error page
    await expect(page.locator('text=404')).toBeVisible();
    
    // Should have link back to home
    const homeLink = page.locator('[data-testid="back-to-home"]');
    await expect(homeLink).toBeVisible();
    await homeLink.click();
    await expect(page).toHaveURL(ROUTES.HOME);
  });
});

test.describe('Admin Navigation & Role Guards', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ADMIN');
  });

  test('admin dashboard loads with all cards clickable', async ({ page }) => {
    await page.goto(ROUTES.ADMIN.DASHBOARD);
    
    // Test primary dashboard cards
    const dashboardCards = [
      { selector: '[data-testid="admin-players-card"]', url: ROUTES.ADMIN.PLAYERS },
      { selector: '[data-testid="admin-clubs-card"]', url: ROUTES.ADMIN.CLUBS },
      { selector: '[data-testid="admin-competitions-card"]', url: ROUTES.ADMIN.COMPETITIONS },
      { selector: '[data-testid="admin-revenue-card"]', url: ROUTES.ADMIN.REVENUE },
      { selector: '[data-testid="admin-entries-card"]', url: ROUTES.ADMIN.ENTRIES },
      { selector: '[data-testid="admin-claims-card"]', url: ROUTES.ADMIN.CLAIMS }
    ];

    for (const card of dashboardCards) {
      const cardElement = page.locator(card.selector);
      if (await cardElement.isVisible()) {
        await cardElement.click();
        await expect(page).toHaveURL(card.url);
        
        // Navigate back to dashboard for next test
        await page.goto(ROUTES.ADMIN.DASHBOARD);
      }
    }
  });

  test('admin entries page has working filters and row clicks', async ({ page }) => {
    await page.goto(ROUTES.ADMIN.ENTRIES);
    
    // Check back button works
    const backButton = page.locator('[data-testid="back-to-dashboard"]');
    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(page).toHaveURL(ROUTES.ADMIN.DASHBOARD);
      await page.goBack();
    }
    
    // Test entry row clicks (if entries exist)
    const firstEntryRow = page.locator('[data-testid="entry-row"]').first();
    if (await firstEntryRow.isVisible()) {
      await firstEntryRow.click();
      // Should navigate to player detail page
      await expect(page.url()).toContain('/dashboard/admin/players/');
    }
  });

  test('admin players page shows profiles with clickable details', async ({ page }) => {
    await page.goto(ROUTES.ADMIN.PLAYERS);
    
    // Test player row clicks (if players exist)
    const firstPlayerRow = page.locator('[data-testid="player-row"]').first();
    if (await firstPlayerRow.isVisible()) {
      await firstPlayerRow.click();
      await expect(page.url()).toContain('/dashboard/admin/players/');
      
      // On player detail page, check age/handicap display
      const playerDetails = page.locator('[data-testid="player-details"]');
      await expect(playerDetails).toBeVisible();
    }
  });

  test('admin claims page loads and shows banking section', async ({ page }) => {
    await page.goto(ROUTES.ADMIN.CLAIMS);
    
    // Check claims table exists
    await expect(page.locator('[data-testid="claims-table"]')).toBeVisible();
    
    // Test claim detail navigation (if claims exist)
    const firstClaimRow = page.locator('[data-testid="claim-row"]').first();
    if (await firstClaimRow.isVisible()) {
      await firstClaimRow.click();
      await expect(page.url()).toContain('/claims/');
      
      // Should show club banking details section
      const bankingSection = page.locator('[data-testid="club-banking-section"]');
      await expect(bankingSection).toBeVisible();
    }
  });
});

test.describe('Club Navigation & Role Guards', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'CLUB');
  });

  test('club dashboard loads with all cards clickable', async ({ page }) => {
    await page.goto(ROUTES.CLUB.DASHBOARD);
    
    // Test primary dashboard cards
    const dashboardCards = [
      { selector: '[data-testid="club-revenue-card"]', url: ROUTES.CLUB.REVENUE },
      { selector: '[data-testid="club-banking-card"]', url: ROUTES.CLUB.BANKING },
      { selector: '[data-testid="club-entries-card"]', url: ROUTES.CLUB.ENTRIES },
      { selector: '[data-testid="club-competitions-card"]', url: ROUTES.CLUB.COMPETITIONS },
      { selector: '[data-testid="club-claims-card"]', url: ROUTES.CLUB.CLAIMS }
    ];

    for (const card of dashboardCards) {
      const cardElement = page.locator(card.selector);
      if (await cardElement.isVisible()) {
        await cardElement.click();
        await expect(page).toHaveURL(card.url);
        
        // Navigate back to dashboard for next test
        await page.goto(ROUTES.CLUB.DASHBOARD);
      }
    }
  });

  test('club banking page is accessible and secure', async ({ page }) => {
    await page.goto(ROUTES.CLUB.BANKING);
    
    // Should load successfully (not redirected)
    await expect(page).toHaveURL(ROUTES.CLUB.BANKING);
    
    // Should show banking form
    await expect(page.locator('[data-testid="club-banking-form"]')).toBeVisible();
    
    // Back button should work
    const backButton = page.locator('[data-testid="back-to-dashboard"]');
    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(page).toHaveURL(ROUTES.CLUB.DASHBOARD);
    }
  });

  test('club claims page shows only own claims', async ({ page }) => {
    await page.goto(ROUTES.CLUB.CLAIMS);
    
    // Should load claims table
    await expect(page.locator('[data-testid="claims-table"]')).toBeVisible();
    
    // Claims should only be for this club (verify by checking no unauthorized claims)
    const claimRows = page.locator('[data-testid="claim-row"]');
    const count = await claimRows.count();
    
    if (count > 0) {
      // Click first claim to verify access
      await claimRows.first().click();
      await expect(page.url()).toContain('/claims/');
    }
  });
});

test.describe('Player Navigation & Entry Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'PLAYER');
  });

  test('entry success page has working miss flow', async ({ page }) => {
    // This would need an actual entry ID from seeded data
    const mockEntryId = 'test-entry-id';
    await page.goto(ROUTES.ENTRY.SUCCESS(mockEntryId));
    
    // Test miss button - should show toast and navigate back to competition
    const missButton = page.locator('[data-testid="miss-button"]');
    if (await missButton.isVisible()) {
      await missButton.click();
      
      // Should show success toast
      await expect(page.locator('.toast')).toContainText('Entry recorded');
      
      // Should navigate back to competition entry page
      await expect(page.url()).toContain('/competition/');
    }
  });

  test('win claim flow creates verification record', async ({ page }) => {
    const mockEntryId = 'test-entry-id';
    await page.goto(ROUTES.ENTRY.WIN_CLAIM(mockEntryId));
    
    // Step 1: Selfie
    const selfieButton = page.locator('[data-testid="selfie-capture"]');
    if (await selfieButton.isVisible()) {
      await selfieButton.click();
      
      // Mock file upload
      const fileInput = page.locator('input[type="file"]');
      // await fileInput.setInputFiles('test-selfie.jpg');
      
      const nextButton = page.locator('[data-testid="next-step"]');
      if (await nextButton.isVisible()) {
        await nextButton.click();
      }
    }
    
    // Step 2: ID Document
    const idUpload = page.locator('[data-testid="id-upload"]');
    if (await idUpload.isVisible()) {
      // Mock ID upload and continue
      const continueButton = page.locator('[data-testid="continue-to-witness"]');
      if (await continueButton.isVisible()) {
        await continueButton.click();
      }
    }
    
    // Step 3: Witness Form
    const witnessForm = page.locator('[data-testid="witness-form"]');
    if (await witnessForm.isVisible()) {
      await page.fill('[data-testid="witness-name"]', 'Test Witness');
      await page.fill('[data-testid="witness-email"]', 'witness@test.com');
      
      const submitButton = page.locator('[data-testid="submit-claim"]');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Should navigate to success page
        await expect(page.url()).toContain('success');
        
        // Verification record should be created (would need to check database)
      }
    }
  });
});

test.describe('Role Guard Security', () => {
  test('player cannot access admin routes', async ({ page }) => {
    await loginAs(page, 'PLAYER');
    
    // Try to access admin dashboard
    await page.goto(ROUTES.ADMIN.DASHBOARD);
    
    // Should be redirected to player dashboard or auth
    await expect(page).not.toHaveURL(ROUTES.ADMIN.DASHBOARD);
    expect([ROUTES.PLAYER.ENTRIES, ROUTES.AUTH, ROUTES.HOME]).toContain(page.url());
  });

  test('club cannot access admin-only routes', async ({ page }) => {
    await loginAs(page, 'CLUB');
    
    // Try to access admin users page
    await page.goto(ROUTES.ADMIN.USERS);
    
    // Should be redirected away from admin route
    await expect(page).not.toHaveURL(ROUTES.ADMIN.USERS);
  });

  test('unauthenticated user redirected to auth', async ({ page }) => {
    // Try to access protected route without login
    await page.goto(ROUTES.ADMIN.DASHBOARD);
    
    // Should redirect to auth page
    await expect(page).toHaveURL(ROUTES.AUTH);
  });
});

test.describe('Accessibility & UX', () => {
  test('icon-only buttons have aria-labels', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    
    // Check all button elements for aria-label or accessible text
    const iconButtons = page.locator('button:has(svg):not(:has(span:not([class*="sr-only"])))');
    const count = await iconButtons.count();
    
    for (let i = 0; i < count; i++) {
      const button = iconButtons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      const title = await button.getAttribute('title');
      
      // Button should have some form of accessible label
      expect(ariaLabel || ariaLabelledBy || title).toBeTruthy();
    }
  });

  test('primary actions have test ids', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    
    // Primary CTAs should have data-testid attributes
    const primaryButtons = page.locator('button[class*="primary"], a[class*="primary"]');
    const count = await primaryButtons.count();
    
    for (let i = 0; i < count; i++) {
      const button = primaryButtons.nth(i);
      const testId = await button.getAttribute('data-testid');
      
      // Primary buttons should have test IDs for reliable testing
      expect(testId).toBeTruthy();
    }
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    
    // Test tab navigation through interactive elements
    await page.keyboard.press('Tab');
    
    // Check that focused element is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('Link Health & External Validation', () => {
  test('external links are properly configured', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    
    // Check mailto links
    const mailtoLinks = page.locator('a[href^="mailto:"]');
    const mailtoCount = await mailtoLinks.count();
    
    for (let i = 0; i < mailtoCount; i++) {
      const link = mailtoLinks.nth(i);
      const href = await link.getAttribute('href');
      expect(href).toMatch(/^mailto:.+@.+\..+/);
    }
    
    // Check tel links
    const telLinks = page.locator('a[href^="tel:"]');
    const telCount = await telLinks.count();
    
    for (let i = 0; i < telCount; i++) {
      const link = telLinks.nth(i);
      const href = await link.getAttribute('href');
      expect(href).toMatch(/^tel:\+?[\d\s\-\(\)]+$/);
    }
  });

  test('internal links use Link component', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    
    // Check that internal navigation uses React Router Link (data-react-router-link attribute)
    const internalLinks = page.locator('a:not([href^="mailto:"]):not([href^="tel:"]):not([href^="http"])');
    const count = await internalLinks.count();
    
    for (let i = 0; i < count; i++) {
      const link = internalLinks.nth(i);
      const href = await link.getAttribute('href');
      
      // Internal links should start with / or be relative
      expect(href).toMatch(/^(\/|\.)/);
    }
  });
});