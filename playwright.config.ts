import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  testMatch: ['**/e2e/**/*.spec.ts', '**/smoke/**/*.spec.ts'],
  /* Global setup for creating auth states */
  globalSetup: require.resolve('./tests/global-setup.ts'),
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: true,
  /* Retry on CI and locally for stability */
  retries: 1,
  /* Opt out of parallel tests on CI for better resource management */
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['list'],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  /* Global timeout for tests */
  globalTimeout: 15 * 60 * 1000, // 15 minutes total
  timeout: 30000, // 30 seconds per test
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video on retry */
    video: 'retain-on-failure',
    /* Action timeout */
    actionTimeout: 10000,
  },

  /* Configure projects for major browsers with test filtering */
  projects: [
    // Desktop browsers for all tests
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/*.spec.ts',
    },

    // Tagged test projects for CI sharding
    {
      name: 'role-tests',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/*role*.spec.ts',
      grep: /@role/,
    },

    {
      name: 'entry-tests', 
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/*entry*.spec.ts',
      grep: /@entry/,
    },

    {
      name: 'banking-tests',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/*banking*.spec.ts', 
      grep: /@banking/,
    },

    {
      name: 'resend-tests',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/*resend*.spec.ts',
      grep: /@resend/,
    },

    {
      name: 'integration-tests',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/*integration*.spec.ts',
      grep: /@integration/,
    },

    // Mobile testing for critical flows only
    {
      name: 'mobile-critical',
      use: { ...devices['Pixel 5'] },
      testMatch: ['**/integration-flow-enhanced.spec.ts', '**/role-access-enhanced.spec.ts'],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});