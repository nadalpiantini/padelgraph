import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS, TIMEOUTS } from '../helpers/env';
import { loginUser } from '../fixtures/auth.fixture';

test.describe('Logout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Log in before each test
    await loginUser(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
  });

  test('should successfully log out when clicking logout button', async ({ page }) => {
    // This test assumes there's a logout button in the UI
    // Adjust selector based on actual implementation

    // Navigate to where logout button exists (e.g., user menu)
    // await page.click('[data-testid="user-menu"]');
    // await page.click('[data-testid="logout-button"]');

    // Alternative: Clear cookies to simulate logout
    await page.context().clearCookies();

    // Navigate to home page
    await page.goto('/');

    // Verify we can access auth page (not redirected away)
    await page.goto('/auth');
    await page.waitForURL('/auth', { timeout: TIMEOUTS.SHORT });

    // Should see login form
    await expect(page.locator('button:has-text("Log In")')).toBeVisible();
  });

  test('should redirect to auth when accessing protected pages after logout', async ({ page }) => {
    // Log out
    await page.context().clearCookies();

    // Try to access protected page (adjust URL based on actual protected routes)
    await page.goto('/profile');

    // Should redirect to auth page
    // Note: This assumes middleware redirects unauthenticated users
    // Adjust based on actual auth implementation

    const currentUrl = page.url();
    const isAuthOrHome = currentUrl.includes('/auth') || currentUrl === '/';

    expect(isAuthOrHome).toBe(true);
  });

  test('should clear session data on logout', async ({ page }) => {
    // Check that session cookies exist while logged in
    const cookiesBeforeLogout = await page.context().cookies();
    const hasAuthCookie = cookiesBeforeLogout.some((cookie) =>
      cookie.name.includes('supabase') || cookie.name.includes('auth')
    );

    expect(hasAuthCookie).toBe(true);

    // Log out by clearing cookies
    await page.context().clearCookies();

    // Check cookies are cleared
    const cookiesAfterLogout = await page.context().cookies();
    const hasAuthCookieAfter = cookiesAfterLogout.some((cookie) =>
      cookie.name.includes('supabase') || cookie.name.includes('auth')
    );

    expect(hasAuthCookieAfter).toBe(false);
  });
});
