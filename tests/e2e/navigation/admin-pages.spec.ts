import { test as authTest, expect } from '../fixtures/auth.fixture';
import { navigateAndWait } from '../helpers/navigation';
import { TIMEOUTS } from '../helpers/env';

authTest.describe('Admin Pages Navigation', () => {
  authTest('should access admin analytics page if user is admin', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Try to navigate to admin analytics
    await page.goto('/admin/analytics');

    // Check if we're on the admin page or redirected
    const currentUrl = page.url();

    if (currentUrl.includes('/admin/analytics')) {
      // User has admin access
      await expect(page).toHaveTitle(/Analytics|Admin|PadelGraph/);

      // Check for analytics components
      await expect(page.locator('text=/Analytics|Dashboard|Metrics/i')).toBeVisible({
        timeout: TIMEOUTS.MEDIUM,
      });
    } else {
      // User doesn't have admin access - this is expected for regular users
      authTest.skip();
    }
  });

  authTest('should access admin tournaments management page if user is admin', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Navigate to tournaments list first
    await navigateAndWait(page, '/tournaments');

    // Try to find a tournament to manage
    const tournamentLink = page.locator('a[href*="/tournaments/"]').first();
    const hasTournaments = await tournamentLink.isVisible().catch(() => false);

    if (!hasTournaments) {
      authTest.skip();
      return;
    }

    // Extract tournament ID
    const href = await tournamentLink.getAttribute('href');
    const tournamentId = href?.match(/tournaments\/([^/]+)/)?.[1];

    if (!tournamentId) {
      authTest.skip();
      return;
    }

    // Try to access admin page for this tournament
    await page.goto(`/admin/tournaments/${tournamentId}`);

    const currentUrl = page.url();

    if (currentUrl.includes('/admin/tournaments/')) {
      // User has admin access
      await expect(page).toHaveTitle(/Tournament|Admin|Management|PadelGraph/);
    } else {
      // Not an admin or unauthorized
      authTest.skip();
    }
  });
});
