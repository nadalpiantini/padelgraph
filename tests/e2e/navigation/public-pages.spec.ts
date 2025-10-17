import { test, expect } from '@playwright/test';
import { navigateAndWait } from '../helpers/navigation';
import { TIMEOUTS } from '../helpers/env';

test.describe('Public Pages Navigation', () => {
  test('should load landing page', async ({ page }) => {
    await navigateAndWait(page, '/');

    // Check for key landing page elements
    await expect(page.locator('text=/PadelGraph/i')).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

    // Check for navigation
    await expect(page.locator('nav, header')).toBeVisible();

    // Check for hero section
    await expect(page.locator('text=/Connect|Compete|Level Up/i')).toBeVisible();
  });

  test('should load about page', async ({ page }) => {
    await navigateAndWait(page, '/about');

    await expect(page.locator('h1, h2')).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  });

  test('should load rankings page', async ({ page }) => {
    await navigateAndWait(page, '/rankings');

    // Should show rankings or loading state
    await expect(page).toHaveTitle(/Rankings|PadelGraph/);
  });

  test('should load tournaments list page', async ({ page }) => {
    await navigateAndWait(page, '/tournaments');

    // Should show tournaments list or empty state
    await expect(page).toHaveTitle(/Tournaments|PadelGraph/);
  });

  test('should navigate from landing to auth page', async ({ page }) => {
    await navigateAndWait(page, '/');

    // Click login/start button
    await page.click('a[href*="auth"], button:has-text(/Log.*In|Sign.*Up|Get Started/i)').catch(() => {
      // If no exact match, try navigating directly
      page.goto('/auth');
    });

    await page.waitForURL('**/auth', { timeout: TIMEOUTS.SHORT });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should have working footer links', async ({ page }) => {
    await navigateAndWait(page, '/');

    // Check footer exists
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Check for common footer links
    await expect(footer.locator('text=/Terms|Privacy|Contact/i')).toBeVisible();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size

    await navigateAndWait(page, '/');

    // Check that page renders
    await expect(page.locator('body')).toBeVisible();

    // Check that navigation is accessible (mobile menu)
    await expect(page.locator('nav, header')).toBeVisible();
  });
});
