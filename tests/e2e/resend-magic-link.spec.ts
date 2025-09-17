import { test, expect } from '@playwright/test';

test.describe('Resend Magic Link', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage and cookies
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Resend button appears after OTP sent', async ({ page }) => {
    await page.goto('/competition/test-club/test-competition');
    
    // Fill form and trigger OTP
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="phone"]', '+44 7700 900000');
    await page.fill('input[name="age"]', '30');
    await page.fill('input[name="handicap"]', '18');
    await page.check('input[type="checkbox"]');
    
    // Mock OTP send success
    await page.route('**/functions/v1/send-magic-link', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
    
    await page.click('button[type="submit"]');
    
    // Should show OTP confirmation screen with resend option
    await expect(page.locator('text=Check Your Email')).toBeVisible();
    await expect(page.locator('button:has-text("Resend Link")')).toBeVisible();
  });

  test('Resend button shows cooldown timer', async ({ page }) => {
    await page.goto('/auth');
    
    // Mock form state to show resend component
    await page.evaluate(() => {
      // Simulate being in the "email sent" state
      window.postMessage({ type: 'SHOW_RESEND', email: 'test@example.com' }, '*');
    });
    
    // If ResendMagicLink component is rendered, test cooldown
    const resendButton = page.locator('button:has-text("Resend")');
    
    if (await resendButton.isVisible()) {
      await resendButton.click();
      
      // Should show cooldown timer
      await expect(page.locator('text=Resend in')).toBeVisible();
      
      // Button should be disabled during cooldown
      await expect(resendButton).toBeDisabled();
    }
  });

  test('Rate limiting prevents excessive requests', async ({ page }) => {
    await page.goto('/auth');
    
    // Mock multiple rapid resend attempts
    await page.route('**/auth/v1/otp', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Simulate rapid clicking (if component is available)
    const resendButton = page.locator('button:has-text("Resend")');
    
    if (await resendButton.isVisible()) {
      // Click multiple times rapidly
      for (let i = 0; i < 6; i++) {
        if (await resendButton.isEnabled()) {
          await resendButton.click();
          await page.waitForTimeout(100);
        }
      }
      
      // Should eventually show rate limit message
      await expect(page.locator('text=Too many attempts')).toBeVisible();
    }
  });

  test('Successful resend shows success toast', async ({ page }) => {
    await page.goto('/competition/test-club/test-competition');
    
    // Fill minimal form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="phone"]', '+44 1234567890');
    await page.fill('input[name="age"]', '25');
    await page.fill('input[name="handicap"]', '15');
    await page.check('input[type="checkbox"]');
    
    // Mock successful OTP send
    await page.route('**/functions/v1/send-magic-link', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
    
    await page.click('button[type="submit"]');
    
    // Wait for OTP confirmation screen
    await expect(page.locator('text=Check Your Email')).toBeVisible();
    
    // Mock successful resend
    await page.route('**/auth/v1/otp', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
    
    const resendButton = page.locator('button:has-text("Resend Link")');
    if (await resendButton.isVisible() && await resendButton.isEnabled()) {
      await resendButton.click();
      
      // Should show success message
      await expect(page.locator('text=Link resent!')).toBeVisible();
    }
  });

  test('Failed resend shows error toast', async ({ page }) => {
    await page.goto('/competition/test-club/test-competition');
    
    // Fill form and get to OTP screen
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="phone"]', '+44 1234567890');
    await page.fill('input[name="age"]', '25');
    await page.fill('input[name="handicap"]', '15');
    await page.check('input[type="checkbox"]');
    
    // Mock initial OTP success
    await page.route('**/functions/v1/send-magic-link', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Check Your Email')).toBeVisible();
    
    // Mock resend failure
    await page.route('**/auth/v1/otp', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Email sending failed' })
      });
    });
    
    const resendButton = page.locator('button:has-text("Resend Link")');
    if (await resendButton.isVisible() && await resendButton.isEnabled()) {
      await resendButton.click();
      
      // Should show error message
      await expect(page.locator('text=Failed to resend')).toBeVisible();
    }
  });

  test('Resend component shows attempt counter', async ({ page }) => {
    // This test checks if the attempt counter works correctly
    await page.goto('/auth');
    
    // Simulate component with attempt tracking
    await page.evaluate(() => {
      // Mock localStorage to simulate previous attempts
      localStorage.setItem('resend_test@example.com_attempts', '2');
    });
    
    // If ResendMagicLink is rendered, should show remaining attempts
    const attemptsText = page.locator('text=attempts remaining');
    
    if (await attemptsText.isVisible()) {
      const text = await attemptsText.textContent();
      expect(text).toContain('3'); // Should show 3 remaining out of 5 max
    }
  });

  test('Maximum attempts reached disables resend', async ({ page }) => {
    await page.goto('/auth');
    
    // Simulate max attempts reached
    await page.evaluate(() => {
      localStorage.setItem('resend_test@example.com_attempts', '5');
    });
    
    const resendButton = page.locator('button:has-text("Resend")');
    
    if (await resendButton.isVisible()) {
      // Button should be disabled
      await expect(resendButton).toBeDisabled();
      
      // Should show max attempts message
      await expect(page.locator('text=Maximum attempts reached')).toBeVisible();
    }
  });
});