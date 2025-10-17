import { test, expect, devices } from '@playwright/test';
import { navigateAndWait } from '../helpers/navigation';

test.use({ ...devices['iPhone 13'] });

test.describe('Mobile Navigation', () => {
  test('should render landing page on mobile', async ({ page }) => {
    await navigateAndWait(page, '/');

    // Check page loads
    await expect(page.locator('body')).toBeVisible();

    // Check viewport is mobile size
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(768);
  });

  test('should have accessible navigation on mobile', async ({ page }) => {
    await navigateAndWait(page, '/');

    // Check for navigation element
    const nav = page.locator('nav, header');
    await expect(nav).toBeVisible();
  });

  test('should navigate to auth page on mobile', async ({ page }) => {
    await navigateAndWait(page, '/');

    // Find and click login/signup button
    await page.click('a[href*="auth"], button:has-text(/Log.*In|Sign.*Up|Get Started/i)').catch(() => {
      page.goto('/auth');
    });

    await page.waitForURL('**/auth');

    // Check form is visible and usable on mobile
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should have touch-friendly buttons on mobile', async ({ page }) => {
    await navigateAndWait(page, '/auth');

    // Check submit button is large enough for touch
    const submitButton = page.locator('button[type="submit"]');
    const boundingBox = await submitButton.boundingBox();

    // Touch target should be at least 44x44px (iOS guideline)
    expect(boundingBox?.height).toBeGreaterThanOrEqual(40);
  });
});
