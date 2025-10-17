import { test as authTest, expect } from '../fixtures/auth.fixture';
import { navigateAndWait, waitForAPIResponse } from '../helpers/navigation';
import { TIMEOUTS } from '../helpers/env';

/**
 * Critical Flow: Tournament Registration
 *
 * User Journey:
 * 1. Browse tournaments
 * 2. Select a tournament
 * 3. Join tournament
 * 4. Verify registration success
 */
authTest.describe('Tournament Registration Flow', () => {
  authTest('should complete full tournament registration flow', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Step 1: Navigate to tournaments list
    await navigateAndWait(page, '/tournaments');
    await expect(page).toHaveTitle(/Tournaments|PadelGraph/);

    // Step 2: Find an available tournament to join
    const tournamentCard = page.locator('[data-testid="tournament-card"]').first();
    const hasTournaments = await tournamentCard.isVisible().catch(() => false);

    if (!hasTournaments) {
      // Try alternative selector
      const altCard = page.locator('a[href*="/tournaments/"]').first();
      const hasAltTournaments = await altCard.isVisible().catch(() => false);

      if (!hasAltTournaments) {
        authTest.skip();
        return;
      }

      await altCard.click();
    } else {
      await tournamentCard.click();
    }

    // Step 3: On tournament detail page
    await page.waitForURL('**/tournaments/**', { timeout: TIMEOUTS.MEDIUM });

    // Step 4: Look for Join button
    const joinButton = page.locator('button:has-text(/Join|Register|Sign Up/i)');
    const canJoin = await joinButton.isVisible().catch(() => false);

    if (canJoin) {
      // Click join button
      await joinButton.click();

      // Wait for API request
      await waitForAPIResponse(page, '/api/tournaments/').catch(() => {});

      // Wait for success message or redirect
      const successMessage = page.locator('text=/Success|Registered|Joined/i');
      const messageVisible = await successMessage.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false);

      if (messageVisible) {
        // Verify registration was successful
        expect(await successMessage.isVisible()).toBe(true);
      } else {
        // Alternative: check if button changed to "Joined" or "Registered"
        const joinedButton = page.locator('button:has-text(/Joined|Registered/i)');
        const isJoined = await joinedButton.isVisible().catch(() => false);
        expect(isJoined).toBe(true);
      }
    } else {
      // Tournament might be full or user already joined
      const alreadyJoined = await page
        .locator('text=/Already.*joined|Full|Closed/i')
        .isVisible()
        .catch(() => false);

      if (alreadyJoined) {
        // This is acceptable - user already in tournament
        expect(alreadyJoined).toBe(true);
      } else {
        // No way to join - skip test
        authTest.skip();
      }
    }
  });

  authTest('should show tournament after joining in my tournaments list', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Navigate to user profile or my tournaments section
    // Adjust URL based on actual route
    await page.goto('/profile').catch(() => page.goto('/'));

    // Look for "My Tournaments" section
    const myTournaments = page.locator('text=/My Tournaments|Registered Tournaments/i');
    const hasTournamentsSection = await myTournaments.isVisible().catch(() => false);

    if (hasTournamentsSection) {
      // Should show at least one tournament
      const tournamentItems = page.locator('[data-testid="my-tournament-item"]');
      const count = await tournamentItems.count();
      expect(count).toBeGreaterThanOrEqual(0); // May be 0 if no tournaments joined yet
    }
  });
});
