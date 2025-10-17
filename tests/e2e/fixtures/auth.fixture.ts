import { test as base, Page } from '@playwright/test';
import { TEST_CREDENTIALS } from '../helpers/env';

/**
 * Auth Fixture
 *
 * Provides authenticated page context for tests that require login.
 * Usage:
 *
 * import { test } from '../fixtures/auth.fixture';
 *
 * test('should access protected page', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/profile');
 *   ...
 * });
 */

type AuthFixtures = {
  authenticatedPage: Page;
};

/**
 * Helper to log in a user
 */
export async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/auth');

  // Wait for auth form to load
  await page.waitForSelector('input[type="email"]');

  // Fill credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Submit login
  await page.click('button[type="submit"]');

  // Wait for navigation after login
  await page.waitForURL(/^(?!.*\/auth).*$/, { timeout: 10000 });

  return page;
}

/**
 * Helper to log out a user
 */
export async function logoutUser(page: Page) {
  // Navigate to profile or settings where logout button exists
  // This is a placeholder - adjust based on actual logout implementation
  await page.goto('/');

  // Click logout button (adjust selector based on actual implementation)
  // await page.click('[data-testid="logout-button"]');

  // For now, just clear cookies to simulate logout
  await page.context().clearCookies();

  return page;
}

/**
 * Extended test with authenticated page fixture
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Set up: log in before test
    await loginUser(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

    // Provide authenticated page to test
    await use(page);

    // Tear down: log out after test
    await logoutUser(page);
  },
});

export { expect } from '@playwright/test';
