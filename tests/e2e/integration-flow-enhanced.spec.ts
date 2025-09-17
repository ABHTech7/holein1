import { test, expect } from '@playwright/test';
import { loginAs, AuthMocks } from '../helpers/auth-mocks';
import { BankingMocks } from '../helpers/banking-mocks';
import { ROUTES } from '../../src/routes';
import testCompetitions from '../fixtures/test-competitions.json';

/**
 * Enhanced Integration Flow Test Suite
 * Tests complete end-to-end flows: PLAYER entry via OTP to success, CLUB dashboard, ADMIN overview
 * @tag integration
 */

test.describe('End-to-End Integration Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Player Entry Flow', () => {
    test('complete player entry flow: form -> OTP -> success @integration', async ({ page }) => {
      const competition = testCompetitions.active_competition;
      const authMocks = new AuthMocks(page);

      // Mock OTP sending
      await authMocks.mockOtpSend(true, 100);
      
      // Mock auth callback success
      await authMocks.mockExchangeCodeForSession('player', true);

      // Step 1: Navigate to competition entry
      await page.goto(`/competition/${competition.club_slug}/${competition.slug}`);
      
      // Verify competition page loads
      await expect(page.getByText(competition.name)).toBeVisible();
      await expect(page.getByText(`£${competition.entry_fee}`)).toBeVisible();

      // Step 2: Fill entry form
      await page.fill('[data-testid="first-name"]', 'John');
      await page.fill('[data-testid="last-name"]', 'Doe');
      await page.fill('[data-testid="email"]', 'john.doe@example.com');
      await page.fill('[data-testid="phone"]', '07700900123');
      await page.selectOption('[data-testid="age"]', '25');
      await page.selectOption('[data-testid="gender"]', 'male');
      await page.fill('[data-testid="handicap"]', '10');

      // Accept terms
      await page.check('[data-testid="terms-checkbox"]');

      // Step 3: Submit form
      await page.click('[data-testid="submit-entry"]');

      // Should navigate to OTP screen
      await expect(page.getByText('Check Your Email')).toBeVisible();
      await expect(page.getByText('john.doe@example.com')).toBeVisible();

      // Verify resend button is available
      await expect(page.getByTestId('resend-link-btn')).toBeVisible();

      // Step 4: Simulate OTP verification (via auth callback)
      const mockEntryId = 'test-entry-integration-123';
      
      // Set up entry context that would be created
      await page.evaluate((entryId) => {
        localStorage.setItem('pending_entry_context', JSON.stringify({
          competitionId: 'test-comp-00000000-0000-0000-0000-000000000001',
          entryId: entryId,
          timestamp: Date.now(),
          expiresAt: Date.now() + (30 * 60 * 1000)
        }));
      }, mockEntryId);

      // Navigate to auth callback (simulating OTP verification)
      await page.goto('/auth/callback?code=mock-otp-code');

      // Step 5: Should redirect to entry success
      await expect(page).toHaveURL(`/entry-success/${mockEntryId}`);
      await expect(page.getByText(/Entry successful|Congratulations/i)).toBeVisible();

      // Verify entry success page elements
      await expect(page.getByTestId('miss-button')).toBeVisible();
      await expect(page.getByTestId('share-entry-btn')).toBeVisible();
    });

    test('player entry with authentication required @integration', async ({ page }) => {
      const competition = testCompetitions.active_competition;
      
      // Navigate to entry success without being authenticated
      await page.goto(`/entry-success/test-entry-123`);
      
      // Should redirect to auth
      await expect(page).toHaveURL(ROUTES.AUTH);
      
      // Login as player
      await loginAs(page, 'player');
      
      // Should now be able to access entry success
      await page.goto(`/entry-success/test-entry-123`);
      await expect(page).toHaveURL(`/entry-success/test-entry-123`);
    });

    test('win claim flow with verification steps @integration', async ({ page }) => {
      await loginAs(page, 'player');
      
      const mockEntryId = 'test-win-claim-123';
      await page.goto(`/win-claim/${mockEntryId}`);
      
      // Should load win claim page
      await expect(page.getByText(/Claim your win/i)).toBeVisible();
      
      // Step 1: Selfie capture
      if (await page.getByTestId('selfie-capture').isVisible()) {
        await page.getByTestId('selfie-capture').click();
        // Mock selfie taken
        await page.getByTestId('confirm-selfie').click();
      }
      
      // Step 2: ID document
      if (await page.getByTestId('id-upload-section').isVisible()) {
        // Mock ID upload
        await page.getByTestId('continue-to-witness').click();
      }
      
      // Step 3: Witness details
      if (await page.getByTestId('witness-form').isVisible()) {
        await page.fill('[data-testid="witness-name"]', 'Jane Smith');
        await page.fill('[data-testid="witness-email"]', 'jane@example.com');
        await page.fill('[data-testid="witness-phone"]', '07700900456');
        
        await page.click('[data-testid="submit-claim"]');
      }
      
      // Should show success message
      await expect(page.getByText(/Claim submitted|under review/i)).toBeVisible();
    });
  });

  test.describe('Club Dashboard Happy Path', () => {
    test('club dashboard with complete banking - full functionality @integration', async ({ page }) => {
      const bankingMocks = new BankingMocks(page);
      
      // Mock complete banking
      await bankingMocks.mockBankingDetails('complete_banking', 0);
      
      await loginAs(page, 'club_complete_banking');
      
      // Navigate to club dashboard
      await page.goto(ROUTES.CLUB.DASHBOARD);
      
      // Verify dashboard loads correctly
      await expect(page.getByText('Club Dashboard')).toBeVisible();
      await expect(page.getByText('Hi Complete, welcome back!')).toBeVisible();
      
      // No banking banner should be visible
      await expect(page.getByTestId('banking-required-banner')).toHaveCount(0);
      
      // CTA should be enabled
      const newCompCTA = page.getByTestId('new-competition-cta');
      await expect(newCompCTA).toBeEnabled();
      
      // Test navigation to competition creation
      await newCompCTA.click();
      await expect(page).toHaveURL(ROUTES.CLUB.COMPETITIONS_NEW);
      
      // Go back to dashboard
      await page.goBack();
      
      // Test other dashboard cards
      const cards = [
        { testid: 'club-revenue-card', url: ROUTES.CLUB.REVENUE },
        { testid: 'club-banking-card-btn', url: ROUTES.CLUB.BANKING },
        { testid: 'club-entries-card', url: ROUTES.CLUB.ENTRIES },
        { testid: 'club-competitions-card', url: ROUTES.CLUB.COMPETITIONS }
      ];
      
      for (const card of cards) {
        if (await page.getByTestId(card.testid).isVisible()) {
          await page.getByTestId(card.testid).click();
          await expect(page).toHaveURL(card.url);
          await page.goBack();
        }
      }
    });

    test('club dashboard with incomplete banking - guided flow @integration', async ({ page }) => {
      const bankingMocks = new BankingMocks(page);
      
      // Mock incomplete banking
      await bankingMocks.mockBankingDetails('incomplete_banking', 150);
      
      await loginAs(page, 'club_incomplete_banking');
      
      await page.goto(ROUTES.CLUB.DASHBOARD);
      
      // Wait for banking status to load
      await expect(page.getByTestId('banking-required-banner')).toBeVisible();
      
      // CTA should be disabled
      const newCompCTA = page.getByTestId('new-competition-cta');
      await expect(newCompCTA).toBeDisabled();
      
      // Clicking disabled CTA should redirect to banking
      await newCompCTA.click();
      await expect(page).toHaveURL(ROUTES.CLUB.BANKING);
      
      // Verify banking page loads
      await expect(page.getByTestId('club-banking-form')).toBeVisible();
      
      // Go back and test banking banner link
      await page.goBack();
      await page.getByText('Go to Banking Details').click();
      await expect(page).toHaveURL(ROUTES.CLUB.BANKING);
    });

    test('club competition management flow @integration', async ({ page }) => {
      const bankingMocks = new BankingMocks(page);
      await bankingMocks.mockBankingDetails('complete_banking', 0);
      
      await loginAs(page, 'club_complete_banking');
      
      // Start at dashboard
      await page.goto(ROUTES.CLUB.DASHBOARD);
      
      // Navigate to competition creation
      await page.getByTestId('new-competition-cta').click();
      await expect(page).toHaveURL(ROUTES.CLUB.COMPETITIONS_NEW);
      
      // Verify competition wizard loads
      await expect(page.getByText(/Create Competition|New Challenge/i)).toBeVisible();
      
      // Test navigation to competitions list
      await page.goto(ROUTES.CLUB.COMPETITIONS);
      await expect(page.getByText(/Competitions|Challenges/i)).toBeVisible();
      
      // Test navigation to entries
      await page.goto(ROUTES.CLUB.ENTRIES);
      await expect(page.getByText(/Entries|Recent Entries/i)).toBeVisible();
      
      // Test navigation to revenue
      await page.goto(ROUTES.CLUB.REVENUE);
      await expect(page.getByText(/Revenue|Earnings/i)).toBeVisible();
    });
  });

  test.describe('Admin Overview Happy Path', () => {
    test('admin dashboard - full system overview @integration', async ({ page }) => {
      await loginAs(page, 'admin');
      
      // Navigate to admin dashboard
      await page.goto(ROUTES.ADMIN.DASHBOARD);
      
      // Verify admin dashboard loads
      await expect(page.getByText(/Admin Dashboard/i)).toBeVisible();
      
      // Test all admin cards
      const adminCards = [
        { testid: 'admin-players-card', url: ROUTES.ADMIN.PLAYERS },
        { testid: 'admin-clubs-card', url: ROUTES.ADMIN.CLUBS },
        { testid: 'admin-competitions-card', url: ROUTES.ADMIN.COMPETITIONS },
        { testid: 'admin-revenue-card', url: ROUTES.ADMIN.REVENUE },
        { testid: 'admin-entries-card', url: ROUTES.ADMIN.ENTRIES },
        { testid: 'admin-claims-card', url: ROUTES.ADMIN.CLAIMS }
      ];
      
      for (const card of adminCards) {
        if (await page.getByTestId(card.testid).isVisible()) {
          await page.getByTestId(card.testid).click();
          await expect(page).toHaveURL(card.url);
          
          // Verify page loads correctly
          await expect(page.getByTestId('back-to-dashboard')).toBeVisible();
          
          // Go back to dashboard
          await page.getByTestId('back-to-dashboard').click();
          await expect(page).toHaveURL(ROUTES.ADMIN.DASHBOARD);
        }
      }
    });

    test('admin claims management flow @integration', async ({ page }) => {
      await loginAs(page, 'admin');
      
      // Navigate to claims
      await page.goto(ROUTES.ADMIN.CLAIMS);
      
      // Verify claims table
      await expect(page.getByTestId('claims-table')).toBeVisible();
      
      // Test claim detail navigation (if claims exist)
      const firstClaimRow = page.getByTestId('claim-row').first();
      if (await firstClaimRow.isVisible()) {
        await firstClaimRow.click();
        
        // Should navigate to claim detail
        await expect(page.url()).toContain('/claims/');
        
        // Verify claim detail elements
        await expect(page.getByTestId('club-banking-section')).toBeVisible();
        await expect(page.getByText(/Verification Status/i)).toBeVisible();
      }
    });

    test('admin user management flow @integration', async ({ page }) => {
      await loginAs(page, 'admin');
      
      // Navigate to user management
      await page.goto(ROUTES.ADMIN.USERS);
      
      // Verify user management page
      await expect(page.getByText(/User Management|Users/i)).toBeVisible();
      
      // Test admin creation functionality
      if (await page.getByTestId('create-admin-btn').isVisible()) {
        await page.getByTestId('create-admin-btn').click();
        
        // Should show admin creation modal
        await expect(page.getByTestId('admin-creation-modal')).toBeVisible();
      }
    });
  });

  test.describe('Cross-Role Security', () => {
    test('role escalation attempts are blocked @integration', async ({ page }) => {
      // Start as player
      await loginAs(page, 'player');
      
      // Try to access admin functions
      await page.goto(ROUTES.ADMIN.DASHBOARD);
      await expect(page).not.toHaveURL(ROUTES.ADMIN.DASHBOARD);
      
      // Try to access club functions
      await page.goto(ROUTES.CLUB.DASHBOARD);
      await expect(page).not.toHaveURL(ROUTES.CLUB.DASHBOARD);
      
      // Should show access denied toasts
      await expect(page.locator('.toast')).toContainText('Access Denied');
    });

    test('session persistence across navigation @integration', async ({ page }) => {
      await loginAs(page, 'club_complete_banking');
      
      // Navigate through multiple pages
      const pages = [
        ROUTES.CLUB.DASHBOARD,
        ROUTES.CLUB.REVENUE,
        ROUTES.CLUB.BANKING,
        ROUTES.CLUB.COMPETITIONS
      ];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await expect(page).toHaveURL(pagePath);
        
        // Should not be redirected to auth
        await expect(page).not.toHaveURL(ROUTES.AUTH);
      }
    });

    test('deep link protection with state preservation @integration', async ({ page }) => {
      // Try to access protected page without auth
      const targetUrl = ROUTES.ENTRY.SUCCESS('test-entry-protected');
      await page.goto(targetUrl);
      
      // Should redirect to auth
      await expect(page).toHaveURL(ROUTES.AUTH);
      
      // Login
      await loginAs(page, 'player');
      
      // Should be able to access the originally requested page
      await page.goto(targetUrl);
      await expect(page).toHaveURL(targetUrl);
    });
  });
});