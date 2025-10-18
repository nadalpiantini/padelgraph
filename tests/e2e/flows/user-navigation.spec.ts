import { test, expect } from '@playwright/test';

test.describe('User Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth');

    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@padelgraph.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test.describe('Dashboard Navigation Links', () => {
    test('should navigate to Profile page from user menu', async ({ page }) => {
      // Open user menu (desktop)
      await page.click('button:has-text("test")');

      // Click Profile link
      await page.click('a[href="/profile"]');

      // Verify we're on the profile page
      await expect(page).toHaveURL(/.*\/profile/);
      await expect(page.locator('h1')).toContainText(/Profile|Perfil/);

      // Verify no 404 error
      await expect(page.locator('h1')).not.toContainText(/404|Not Found/);
    });

    test('should navigate to Settings page from user menu', async ({ page }) => {
      // Open user menu
      await page.click('button:has-text("test")');

      // Click Settings link
      await page.click('a[href="/settings"]');

      // Verify we're on the settings page
      await expect(page).toHaveURL(/.*\/settings/);
      await expect(page.locator('h1')).toContainText(/Settings|Configuración/);

      // Verify no 404 error
      await expect(page.locator('h1')).not.toContainText(/404|Not Found/);
    });

    test('should navigate to Tournaments page', async ({ page }) => {
      // Click Tournaments link in navigation
      await page.click('a[href="/tournaments"]');

      // Verify we're on the tournaments page
      await expect(page).toHaveURL(/.*\/tournaments/);
      await expect(page.locator('h1')).toContainText(/Tournaments|Torneos/);

      // Verify branding logo is present
      await expect(page.locator('img[alt*="PadelGraph"]')).toBeVisible();

      // Verify back button is present
      await expect(page.locator('a:has-text("Back to Dashboard")')).toBeVisible();

      // Verify no 404 error
      await expect(page.locator('h1')).not.toContainText(/404|Not Found/);
    });

    test('should navigate to Rankings page', async ({ page }) => {
      // Click Rankings link in navigation
      await page.click('a[href="/rankings"]');

      // Verify we're on the rankings page
      await expect(page).toHaveURL(/.*\/rankings/);
      await expect(page.locator('h1')).toContainText(/Rankings/);

      // Verify branding logo is present
      await expect(page.locator('img[alt*="PadelGraph"]')).toBeVisible();

      // Verify back button is present
      await expect(page.locator('a:has-text("Back to Dashboard")')).toBeVisible();

      // Verify no 404 error
      await expect(page.locator('h1')).not.toContainText(/404|Not Found/);
    });

    test('should navigate to Players page', async ({ page }) => {
      // Click Players link in navigation
      await page.click('a[href="/players"]');

      // Verify we're on the players page
      await expect(page).toHaveURL(/.*\/players/);
      await expect(page.locator('h1')).toContainText(/Players|Jugadores/);

      // Verify branding logo is present
      await expect(page.locator('img[alt*="PadelGraph"]')).toBeVisible();

      // Verify no 404 error
      await expect(page.locator('h1')).not.toContainText(/404|Not Found/);
    });
  });

  test.describe('Back Button Navigation', () => {
    test('should return to dashboard from Tournaments page', async ({ page }) => {
      // Navigate to Tournaments
      await page.click('a[href="/tournaments"]');
      await expect(page).toHaveURL(/.*\/tournaments/);

      // Click back button
      await page.click('a:has-text("Back to Dashboard")');

      // Verify we're back on dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.locator('h1')).toContainText(/Welcome|Bienvenido/);
    });

    test('should return to dashboard from Rankings page', async ({ page }) => {
      // Navigate to Rankings
      await page.click('a[href="/rankings"]');
      await expect(page).toHaveURL(/.*\/rankings/);

      // Click back button
      await page.click('a:has-text("Back to Dashboard")');

      // Verify we're back on dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.locator('h1')).toContainText(/Welcome|Bienvenido/);
    });
  });

  test.describe('Branding Consistency', () => {
    test('should display PadelGraph branding on all pages', async ({ page }) => {
      const pages = [
        { link: 'a[href="/tournaments"]', url: /.*\/tournaments/ },
        { link: 'a[href="/rankings"]', url: /.*\/rankings/ },
        { link: 'a[href="/players"]', url: /.*\/players/ },
      ];

      for (const pageDef of pages) {
        await page.click(pageDef.link);
        await expect(page).toHaveURL(pageDef.url);

        // Verify branding logo is visible
        await expect(page.locator('img[alt*="PadelGraph"]')).toBeVisible();

        // Navigate back to dashboard for next iteration
        await page.goto('/dashboard');
      }
    });
  });

  test.describe('Mobile Menu Navigation', () => {
    test('should navigate using mobile menu', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Open mobile menu
      await page.click('button:has(svg)'); // Menu button

      // Wait for mobile menu to be visible
      await page.waitForSelector('a[href="/tournaments"]:visible', { timeout: 5000 });

      // Click Tournaments link in mobile menu
      await page.click('a[href="/tournaments"]:visible');

      // Verify we're on the tournaments page
      await expect(page).toHaveURL(/.*\/tournaments/);
      await expect(page.locator('h1')).toContainText(/Tournaments|Torneos/);

      // Verify no 404 error
      await expect(page.locator('h1')).not.toContainText(/404|Not Found/);
    });
  });

  test.describe('Complete User Journey', () => {
    test('should navigate through entire user flow without errors', async ({ page }) => {
      // Start at dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);

      // Go to Profile
      await page.click('button:has-text("test")');
      await page.click('a[href="/profile"]');
      await expect(page).toHaveURL(/.*\/profile/);
      await expect(page.locator('h1')).not.toContainText(/404/);

      // Back to Dashboard
      await page.goto('/dashboard');

      // Go to Settings
      await page.click('button:has-text("test")');
      await page.click('a[href="/settings"]');
      await expect(page).toHaveURL(/.*\/settings/);
      await expect(page.locator('h1')).not.toContainText(/404/);

      // Back to Dashboard
      await page.goto('/dashboard');

      // Go to Tournaments
      await page.click('a[href="/tournaments"]');
      await expect(page).toHaveURL(/.*\/tournaments/);
      await expect(page.locator('h1')).not.toContainText(/404/);

      // Use back button
      await page.click('a:has-text("Back to Dashboard")');
      await expect(page).toHaveURL(/.*\/dashboard/);

      // Go to Rankings
      await page.click('a[href="/rankings"]');
      await expect(page).toHaveURL(/.*\/rankings/);
      await expect(page.locator('h1')).not.toContainText(/404/);

      // Use back button
      await page.click('a:has-text("Back to Dashboard")');
      await expect(page).toHaveURL(/.*\/dashboard/);

      // Go to Players
      await page.click('a[href="/players"]');
      await expect(page).toHaveURL(/.*\/players/);
      await expect(page.locator('h1')).not.toContainText(/404/);

      // Final verification - no errors encountered
      await expect(page.locator('h1')).not.toContainText(/Error|404/);
    });
  });

  test.describe('Page Load Performance', () => {
    test('all navigation pages should load within acceptable time', async ({ page }) => {
      const pages = [
        '/profile',
        '/settings',
        '/tournaments',
        '/rankings',
        '/players',
      ];

      for (const pagePath of pages) {
        const startTime = Date.now();
        await page.goto(pagePath);
        const loadTime = Date.now() - startTime;

        // Verify page loads within 5 seconds
        expect(loadTime).toBeLessThan(5000);

        // Verify no 404
        await expect(page.locator('h1')).not.toContainText(/404/);
      }
    });
  });
});
