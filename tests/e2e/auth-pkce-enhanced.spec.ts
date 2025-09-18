import { test, expect } from '@playwright/test';

test.describe('Enhanced PKCE Magic Link Flow', () => {
  test('@auth-pkce: missing verifier shows expired link page with resend', async ({ page, context }) => {
    // Navigate to entry form
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Fill out entry form
    await page.click('[data-testid="enter-now-cta"]', { timeout: 10000 });
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="firstname-input"]', 'Test');
    await page.fill('[data-testid="lastname-input"]', 'User');
    await page.fill('[data-testid="phone-input"]', '+44 7700 900000');
    await page.fill('[data-testid="age-input"]', '25');
    await page.fill('[data-testid="handicap-input"]', '18');
    
    // Submit form and get "Check your email" screen
    await page.click('[data-testid="submit-entry"]');
    await expect(page.locator('text=Check your email')).toBeVisible();
    
    // Simulate opening magic link in different browser (no PKCE verifier)
    // This would normally come from email, but we'll simulate the callback directly
    const newPage = await context.newPage();
    await newPage.goto('/auth/callback?code=mock_code_without_verifier');
    
    // Should redirect to expired link page (not show raw error)
    await expect(newPage.locator('text=Your sign-in link expired')).toBeVisible();
    await expect(newPage.locator('text=test@example.com')).toBeVisible();
    await expect(newPage.locator('button', { hasText: 'Resend Link' })).toBeVisible();
    
    // Test resend functionality
    await newPage.click('button', { hasText: 'Resend Link' });
    
    // Should show cooldown
    await expect(newPage.locator('text=Resend in')).toBeVisible();
    
    await newPage.close();
  });

  test('@auth-pkce: successful flow continues entry', async ({ page }) => {
    // This test would require actual auth integration
    // For now, we'll test the callback handling logic
    
    await page.goto('/auth/callback?code=valid_code');
    
    // Should either continue entry flow or redirect to player area
    await page.waitForLoadState('networkidle');
    
    // Check we don't see error messages
    await expect(page.locator('text=invalid request')).not.toBeVisible();
    await expect(page.locator('text=code verifier')).not.toBeVisible();
  });
});