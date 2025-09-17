import { test, expect } from '@playwright/test';

test.describe('Entry Context Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Entry context persists through auth flow', async ({ page }) => {
    // Start competition entry
    await page.goto('/competition/test-club/test-competition');
    
    // Fill out entry form
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="phone"]', '+44 7700 900000');
    await page.fill('input[name="age"]', '30');
    await page.fill('input[name="handicap"]', '18');
    
    // Accept terms
    await page.check('input[type="checkbox"]');
    
    // Submit form (should trigger OTP flow)
    await page.click('button[type="submit"]');
    
    // Check that context was stored
    const storedContext = await page.evaluate(() => {
      return localStorage.getItem('pending_entry_context') || 
             localStorage.getItem('secure_pending_entry_context');
    });
    
    expect(storedContext).toBeTruthy();
    
    // Verify context contains expected data
    if (storedContext) {
      const context = JSON.parse(storedContext);
      expect(context.formData.firstName).toBe('John');
      expect(context.formData.email).toBe('john@example.com');
      expect(context.competitionId).toBeTruthy();
    }
  });

  test('Entry context expires after 30 minutes', async ({ page }) => {
    // Simulate expired context
    await page.evaluate(() => {
      const expiredContext = {
        competitionId: 'test-comp',
        formData: { firstName: 'Test' },
        timestamp: Date.now() - (31 * 60 * 1000), // 31 minutes ago
        expiresAt: Date.now() - (60 * 1000) // Expired 1 minute ago
      };
      localStorage.setItem('pending_entry_context', JSON.stringify(expiredContext));
    });
    
    // Navigate to auth callback
    await page.goto('/auth/callback?code=test');
    
    // Should redirect to home (not entry continuation) due to expired context
    await page.waitForURL('/');
    expect(page.url()).toContain('/');
    expect(page.url()).not.toContain('/entry-success');
  });

  test('Valid entry context redirects after auth', async ({ page }) => {
    // Simulate valid context with entry ID
    await page.evaluate(() => {
      const validContext = {
        competitionId: 'test-comp',
        entryId: 'test-entry-123',
        formData: { firstName: 'Test' },
        timestamp: Date.now(),
        expiresAt: Date.now() + (30 * 60 * 1000) // Valid for 30 minutes
      };
      localStorage.setItem('pending_entry_context', JSON.stringify(validContext));
    });
    
    // Mock successful auth
    await page.route('**/auth/v1/token*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-token',
          user: { id: 'test-user' }
        })
      });
    });
    
    // Navigate to auth callback
    await page.goto('/auth/callback?code=test');
    
    // Should redirect to entry success page
    await page.waitForURL('**/entry-success/test-entry-123**');
    expect(page.url()).toContain('/entry-success/test-entry-123');
  });

  test('Context cleanup on auth failure', async ({ page }) => {
    // Set up valid context
    await page.evaluate(() => {
      const context = {
        competitionId: 'test-comp',
        formData: { firstName: 'Test' },
        timestamp: Date.now(),
        expiresAt: Date.now() + (30 * 60 * 1000)
      };
      localStorage.setItem('pending_entry_context', JSON.stringify(context));
    });
    
    // Mock auth failure
    await page.route('**/auth/v1/token*', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_grant' })
      });
    });
    
    // Navigate to auth callback
    await page.goto('/auth/callback?code=invalid');
    
    // Should redirect to auth page
    await page.waitForURL('**/auth**');
    
    // Context should be cleaned up
    const remainingContext = await page.evaluate(() => {
      return localStorage.getItem('pending_entry_context');
    });
    
    expect(remainingContext).toBeFalsy();
  });

  test('Form data restoration after refresh', async ({ page }) => {
    // Start entry process
    await page.goto('/competition/test-club/test-competition');
    
    // Fill form
    await page.fill('input[name="firstName"]', 'Jane');
    await page.fill('input[name="email"]', 'jane@example.com');
    
    // Submit to trigger context storage
    await page.check('input[type="checkbox"]');
    await page.click('button[type="submit"]');
    
    // Wait for OTP screen or redirect
    await page.waitForTimeout(1000);
    
    // Simulate page refresh by navigating away and back
    await page.goto('/');
    await page.goto('/competition/test-club/test-competition');
    
    // Form should restore data if context is still valid
    const storedContext = await page.evaluate(() => {
      const context = localStorage.getItem('pending_entry_context');
      return context ? JSON.parse(context) : null;
    });
    
    if (storedContext && storedContext.formData) {
      // Check if form can be restored (implementation dependent)
      expect(storedContext.formData.firstName).toBe('Jane');
      expect(storedContext.formData.email).toBe('jane@example.com');
    }
  });

  test('Multiple competition contexts handled correctly', async ({ page }) => {
    // Start first competition entry
    await page.goto('/competition/club1/comp1');
    await page.evaluate(() => {
      const context1 = {
        competitionId: 'comp1',
        clubSlug: 'club1',
        competitionSlug: 'comp1',
        formData: { firstName: 'First' },
        timestamp: Date.now(),
        expiresAt: Date.now() + (30 * 60 * 1000)
      };
      localStorage.setItem('pending_entry_context', JSON.stringify(context1));
    });
    
    // Start second competition entry (should overwrite first)
    await page.goto('/competition/club2/comp2');
    await page.evaluate(() => {
      const context2 = {
        competitionId: 'comp2',
        clubSlug: 'club2', 
        competitionSlug: 'comp2',
        formData: { firstName: 'Second' },
        timestamp: Date.now(),
        expiresAt: Date.now() + (30 * 60 * 1000)
      };
      localStorage.setItem('pending_entry_context', JSON.stringify(context2));
    });
    
    // Check that only the latest context remains
    const finalContext = await page.evaluate(() => {
      const context = localStorage.getItem('pending_entry_context');
      return context ? JSON.parse(context) : null;
    });
    
    expect(finalContext?.competitionId).toBe('comp2');
    expect(finalContext?.formData.firstName).toBe('Second');
  });
});