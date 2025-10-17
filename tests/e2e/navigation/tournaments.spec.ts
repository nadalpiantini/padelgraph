import { test, expect } from '@playwright/test';
import { test as authTest } from '../fixtures/auth.fixture';
import { navigateAndWait } from '../helpers/navigation';
import { TIMEOUTS } from '../helpers/env';

test.describe('Tournament Pages Navigation (Unauthenticated)', () => {
  test('should load tournaments list page', async ({ page }) => {
    await navigateAndWait(page, '/tournaments');

    // Should show page even if not logged in
    await expect(page).toHaveTitle(/Tournaments|PadelGraph/);
  });

  test('should show tournament details when clicking on tournament', async ({ page }) => {
    await navigateAndWait(page, '/tournaments');

    // Try to find a tournament link (if any tournaments exist)
    const tournamentLink = page.locator('a[href*="/tournaments/"]').first();
    const hasTournaments = await tournamentLink.isVisible().catch(() => false);

    if (hasTournaments) {
      await tournamentLink.click();

      // Wait for tournament detail page
      await page.waitForURL('**/tournaments/**', { timeout: TIMEOUTS.MEDIUM });

      // Should show tournament details
      await expect(page).toHaveTitle(/Tournament|PadelGraph/);
    } else {
      // No tournaments available, skip test
      test.skip();
    }
  });
});

authTest.describe('Tournament Pages Navigation (Authenticated)', () => {
  authTest('should access tournament detail page when authenticated', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateAndWait(page, '/tournaments');

    // Should have access to tournament list
    await expect(page).toHaveTitle(/Tournaments|PadelGraph/);

    // Try to find and click on a tournament
    const tournamentLink = page.locator('a[href*="/tournaments/"]').first();
    const hasTournaments = await tournamentLink.isVisible().catch(() => false);

    if (hasTournaments) {
      await tournamentLink.click();
      await page.waitForURL('**/tournaments/**', { timeout: TIMEOUTS.MEDIUM });

      // Should see tournament details
      await expect(page).toHaveTitle(/Tournament|PadelGraph/);
    }
  });

  authTest('should access tournament board/bracket page', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to a tournament (assuming ID 1 exists, adjust as needed)
    // This test might need to be skipped or adjusted based on actual data
    await page.goto('/tournaments').catch(() => {});

    const tournamentLink = page.locator('a[href*="/tournaments/"]').first();
    const hasTournaments = await tournamentLink.isVisible().catch(() => false);

    if (!hasTournaments) {
      authTest.skip();
      return;
    }

    // Extract tournament ID from href
    const href = await tournamentLink.getAttribute('href');
    const tournamentId = href?.match(/tournaments\/([^/]+)/)?.[1];

    if (tournamentId) {
      // Navigate to board page
      await navigateAndWait(page, `/tournaments/${tournamentId}/board`);

      // Should show bracket/board
      await expect(page).toHaveTitle(/Board|Bracket|Tournament|PadelGraph/);
    }
  });
});
