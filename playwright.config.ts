import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * This config supports testing across multiple environments:
 * - Local development (localhost:3000)
 * - Production (axis6.app)
 *
 * Test structure:
 * tests/e2e/
 * ├─ auth/         → Authentication flows
 * ├─ navigation/   → Page navigation tests
 * ├─ flows/        → Critical user flows
 * ├─ data/         → Data integrity tests
 * └─ accessibility/ → A11y & UX tests
 */

const IS_CI = !!process.env.CI;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',

  // Global test timeout (30s per test)
  timeout: 30 * 1000,

  // Expect timeout for assertions (10s)
  expect: {
    timeout: 10 * 1000,
  },

  // Test execution settings
  fullyParallel: true,
  forbidOnly: IS_CI, // Fail CI if test.only is present
  retries: IS_CI ? 2 : 0, // Retry flaky tests in CI
  workers: IS_CI ? 1 : undefined, // Limit workers in CI

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ...(IS_CI ? [['github'] as const] : []),
  ],

  // Global test settings
  use: {
    baseURL: BASE_URL,

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on retry
    video: 'retain-on-failure',

    // Default navigation timeout
    navigationTimeout: 15 * 1000,

    // Default action timeout
    actionTimeout: 10 * 1000,
  },

  // Test projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Mobile testing
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },

    // {
    //   name: 'mobile-safari',
    //   use: { ...devices['iPhone 13'] },
    // },
  ],

  // Web server configuration for local testing
  webServer: IS_CI
    ? undefined
    : {
        command: 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: !IS_CI,
        timeout: 120 * 1000, // 2 minutes to start server
      },
});
