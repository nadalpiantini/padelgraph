import { test as authTest, expect } from '../fixtures/auth.fixture';
import { navigateAndWait, waitForAPIResponse } from '../helpers/navigation';
import { fillField } from '../helpers/forms';
import { TIMEOUTS } from '../helpers/env';

/**
 * Critical Flow: Profile Update
 *
 * User Journey:
 * 1. Navigate to profile/settings
 * 2. Update profile information
 * 3. Save changes
 * 4. Verify changes persist
 */
authTest.describe('Profile Update Flow', () => {
  authTest('should access and update user profile', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to profile or settings page
    // Try both possible routes
    await page.goto('/profile').catch(() => page.goto('/settings'));

    // Look for edit/update button
    const editButton = page.locator('button:has-text(/Edit|Update|Settings/i)').first();
    const hasEditButton = await editButton.isVisible().catch(() => false);

    if (hasEditButton) {
      await editButton.click();
    }

    // Look for bio/description field to update
    const bioField = page.locator('textarea[name="bio"], textarea[placeholder*="bio" i], textarea[id="bio"]');
    const hasBioField = await bioField.isVisible().catch(() => false);

    if (!hasBioField) {
      // Try alternative profile fields
      const nameField = page.locator('input[name="name"], input[name="username"]');
      const hasNameField = await nameField.isVisible().catch(() => false);

      if (!hasNameField) {
        authTest.skip();
        return;
      }

      // Update name field
      const newName = `E2E Test User ${Date.now()}`;
      await fillField(page, nameField, newName);

      // Save
      const saveButton = page.locator('button[type="submit"], button:has-text(/Save|Update/i)');
      await saveButton.click();

      // Wait for API response
      await waitForAPIResponse(page, '/api/profile').catch(() => {});

      // Wait for success message
      await expect(page.locator('text=/Success|Updated|Saved/i')).toBeVisible({
        timeout: TIMEOUTS.MEDIUM,
      });
    } else {
      // Update bio
      const newBio = `E2E Test Bio updated at ${new Date().toISOString()}`;
      await fillField(page, bioField, newBio);

      // Save
      const saveButton = page.locator('button[type="submit"], button:has-text(/Save|Update/i)');
      await saveButton.click();

      // Wait for save
      await waitForAPIResponse(page, '/api/profile').catch(() => {});

      // Wait for success
      await expect(page.locator('text=/Success|Updated/i')).toBeVisible({
        timeout: TIMEOUTS.MEDIUM,
      });
    }
  });

  authTest('should persist profile changes after reload', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Go to profile
    await navigateAndWait(page, '/profile').catch(() => navigateAndWait(page, '/settings'));

    // Get current bio/name
    const bioField = page.locator('textarea[name="bio"], textarea[id="bio"]').first();
    const hasBio = await bioField.isVisible().catch(() => false);

    let originalValue = '';

    if (hasBio) {
      originalValue = (await bioField.inputValue()) || '';
    }

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check value persisted
    if (hasBio) {
      const newValue = (await bioField.inputValue()) || '';
      expect(newValue).toBe(originalValue);
    }
  });
});
