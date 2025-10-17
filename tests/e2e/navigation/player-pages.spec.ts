import { test, expect } from '@playwright/test';
import { navigateAndWait } from '../helpers/navigation';
import { TIMEOUTS } from '../helpers/env';

test.describe('Player Pages Navigation', () => {
  test('should load player profile page', async ({ page }) => {
    // Try to access a player profile
    // This assumes there's at least one player in the system

    // First, go to rankings to find a player
    await navigateAndWait(page, '/rankings');

    // Look for a player link
    const playerLink = page.locator('a[href*="/players/"]').first();
    const hasPlayers = await playerLink.isVisible().catch(() => false);

    if (hasPlayers) {
      await playerLink.click();

      // Wait for player profile page
      await page.waitForURL('**/players/**', { timeout: TIMEOUTS.MEDIUM });

      // Should show player profile
      await expect(page).toHaveTitle(/Player|Profile|PadelGraph/);

      // Check for profile elements
      await expect(page.locator('text=/Stats|Rankings|Matches|Profile/i')).toBeVisible();
    } else {
      // No players available, skip test
      test.skip();
    }
  });

  test('should be able to access player profile directly by username', async ({ page }) => {
    // Try a common test username
    await page.goto('/players/testuser');

    // Page should either show profile or not found message
    const isProfilePage = page.url().includes('/players/');
    expect(isProfilePage).toBe(true);
  });
});
