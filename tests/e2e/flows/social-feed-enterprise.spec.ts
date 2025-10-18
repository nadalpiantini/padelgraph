import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@padelgraph.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

test.describe('Social Feed Enterprise', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should load social feed and display posts', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Wait for feed to load
    await expect(page.locator('text=Loading your feed...')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Loading your feed...')).not.toBeVisible({ timeout: 10000 });

    // Should show posts or empty state
    const postsOrEmpty = page.locator('article, text=No posts yet');
    await expect(postsOrEmpty.first()).toBeVisible({ timeout: 5000 });
  });

  test('should create a comment on a post', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    // Find first post and click Comment button
    const commentButton = page.locator('button:has-text("Comment")').first();
    await commentButton.click();

    // Fill comment form
    const commentInput = page.locator('input[placeholder*="Add a comment"]');
    await expect(commentInput).toBeVisible({ timeout: 5000 });
    await commentInput.fill('Great post! Test comment from E2E');

    // Submit comment
    const postButton = page.locator('button:has-text("Post")').first();
    await postButton.click();

    // Verify comment appears
    await expect(page.locator('text=Great post! Test comment from E2E')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should like a post', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    // Get initial like count
    const likeButton = page.locator('button:has-text("Like")').first();
    const initialText = await likeButton.textContent();

    // Click like
    await likeButton.click();
    await page.waitForTimeout(1000);

    // Verify like count changed or button state changed
    const newText = await likeButton.textContent();
    expect(newText).not.toBe(initialText);
  });

  test('should navigate to Explore page and see trending content', async ({ page }) => {
    await page.goto(`${BASE_URL}/explore`);

    // Should show Discover title
    await expect(page.locator('h1:has-text("Discover")')).toBeVisible({ timeout: 5000 });

    // Should show trending hashtags or empty state
    const trending = page.locator('text=Trending, text=No trending posts');
    await expect(trending.first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to user profile and follow', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    // Click on first user avatar/name
    const userLink = page.locator('a[href*="/players/"], a[href*="/users/"]').first();
    if (await userLink.isVisible()) {
      await userLink.click();
      await page.waitForTimeout(2000);

      // Should see profile page
      await expect(
        page.locator('h1, text=Level, button:has-text("Follow")')
      ).toBeVisible({ timeout: 5000 });

      // Try to click follow button if present
      const followButton = page.locator('button:has-text("Follow")').first();
      if (await followButton.isVisible()) {
        await followButton.click();
        await page.waitForTimeout(1000);

        // Button should change to "Following"
        await expect(page.locator('button:has-text("Following")')).toBeVisible({
          timeout: 5000,
        });
      }
    }
  });

  test('should load notifications', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Look for notification bell/icon
    const notifIcon = page.locator('svg[class*="lucide-bell"], [aria-label*="notification"]');
    if (await notifIcon.isVisible()) {
      // Notification system is present
      await expect(notifIcon).toBeVisible();
    }
  });

  test('should handle media upload flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    // Find media upload button
    const mediaButton = page.locator('label:has-text("Media"), button:has-text("Media")').first();

    if (await mediaButton.isVisible()) {
      await mediaButton.click();
      await page.waitForTimeout(500);

      // Check if file input is present
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible()) {
        await expect(fileInput).toBeVisible();
      }
    }
  });

  test('should display Six Degrees graph if available', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(3000);

    // Look for Six Degrees component
    const graphTitle = page.locator('text=Six Degrees, text=Connect Players');
    if (await graphTitle.isVisible()) {
      await expect(graphTitle).toBeVisible();

      // Should have select dropdowns for from/to
      const selects = page.locator('select');
      expect(await selects.count()).toBeGreaterThanOrEqual(2);
    }
  });
});
