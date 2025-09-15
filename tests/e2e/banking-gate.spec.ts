import { test, expect } from '@playwright/test';

test.describe('Banking Gate', () => {
  test('club sees banking banner and cannot start new challenge without banking', async ({ page }) => {
    // TODO: Replace with actual login helper when available
    // await loginAs(page, 'CLUB_NO_BANKING'); // fixture with empty banking
    
    // For now, assume we can navigate to the club dashboard
    await page.goto('/dashboard/club');
    
    // Check for banking required banner
    await expect(page.getByTestId('banking-required-banner')).toBeVisible();

    // Check that new competition CTA is disabled
    const cta = page.getByTestId('new-competition-cta');
    await expect(cta).toBeDisabled();

    // Clicking should redirect to banking page
    await cta.click();
    await expect(page).toHaveURL('/dashboard/club/banking');
  });

  test('club with complete banking can create a challenge', async ({ page }) => {
    // TODO: Replace with actual login helper when available
    // await loginAs(page, 'CLUB_WITH_BANKING');
    
    // For now, assume we can navigate to the club dashboard with complete banking
    await page.goto('/dashboard/club');
    
    // Banking banner should not be visible
    await expect(page.getByTestId('banking-required-banner')).toHaveCount(0);

    // New competition CTA should be enabled
    const cta = page.getByTestId('new-competition-cta');
    await expect(cta).toBeEnabled();
  });

  test('direct navigation to competition wizard redirects when banking incomplete', async ({ page }) => {
    // TODO: Replace with actual login helper when available
    // await loginAs(page, 'CLUB_NO_BANKING');
    
    // Try to navigate directly to competition creation
    await page.goto('/dashboard/admin/competitions/new');
    
    // Should redirect to banking page (for club users)
    // Note: This test may need adjustment based on actual routing behavior
    await expect(page).toHaveURL('/dashboard/club/banking');
  });
});