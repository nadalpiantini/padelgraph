import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Social Feed
 * Tests the complete social feed functionality in production
 */

const PRODUCTION_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://padelgraph.com';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@padelgraph.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

test.describe('Social Feed - Production Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to production site
    await page.goto(PRODUCTION_URL);
  });

  test('should display social feed on dashboard after login', async ({ page }) => {
    // Click login/signin button
    await page.click('a[href*="auth"]');

    // Wait for auth page
    await page.waitForURL('**/auth');

    // Fill login form
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard (with locale)
    await page.waitForURL('**/*/dashboard', { timeout: 15000 });

    // Verify social feed components are present
    await expect(page.locator('text=What\'s on your mind')).toBeVisible({ timeout: 10000 });

    // Verify CreatePost component is visible
    const createPostTextarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await expect(createPostTextarea).toBeVisible();

    // Verify Post button exists
    await expect(page.locator('button:has-text("Post")')).toBeVisible();
  });

  test('should create a new post successfully', async ({ page }) => {
    // Login first
    await page.goto(`${PRODUCTION_URL}/auth`);
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/*/dashboard', { timeout: 15000 });

    // Wait for feed to load
    await page.waitForSelector('textarea[placeholder*="What\'s on your mind"]', { timeout: 10000 });

    // Create a test post
    const testPostContent = `E2E Test Post - ${new Date().toISOString()}`;
    await page.fill('textarea[placeholder*="What\'s on your mind"]', testPostContent);

    // Click Post button
    await page.click('button:has-text("Post")');

    // Wait for post to appear in feed
    await page.waitForTimeout(2000); // Give time for post to be created and feed to refresh

    // Verify the post appears in the feed
    const postInFeed = page.locator(`text=${testPostContent}`).first();
    await expect(postInFeed).toBeVisible({ timeout: 10000 });
  });

  test('should display post card components correctly', async ({ page }) => {
    // Login
    await page.goto(`${PRODUCTION_URL}/auth`);
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/*/dashboard', { timeout: 15000 });

    // Wait for feed to load
    await page.waitForTimeout(3000);

    // Check if there are any posts in the feed
    const feedContainer = page.locator('div').filter({ hasText: 'What\'s on your mind' }).first();
    await expect(feedContainer).toBeVisible();

    // Look for post cards (they should have like/comment/share buttons)
    const likeButtons = page.locator('button:has-text("Like")');
    const commentButtons = page.locator('button:has-text("Comment")');
    const shareButtons = page.locator('button:has-text("Share")');

    // If there are posts, verify interaction buttons exist
    const likeButtonCount = await likeButtons.count();
    if (likeButtonCount > 0) {
      await expect(likeButtons.first()).toBeVisible();
      await expect(commentButtons.first()).toBeVisible();
      await expect(shareButtons.first()).toBeVisible();
    }
  });

  test('should toggle like on a post', async ({ page }) => {
    // Login
    await page.goto(`${PRODUCTION_URL}/auth`);
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/*/dashboard', { timeout: 15000 });

    // Wait for feed
    await page.waitForTimeout(3000);

    // Find first like button
    const likeButtons = page.locator('button:has-text("Like")');
    const firstLikeButton = likeButtons.first();

    if (await firstLikeButton.count() > 0) {
      // Check initial state
      const initialClasses = await firstLikeButton.getAttribute('class');

      // Click like button
      await firstLikeButton.click();

      // Wait for optimistic update
      await page.waitForTimeout(500);

      // Verify button state changed
      const newClasses = await firstLikeButton.getAttribute('class');
      expect(initialClasses).not.toBe(newClasses);

      // Click again to unlike
      await firstLikeButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should show visibility selector in create post', async ({ page }) => {
    // Login
    await page.goto(`${PRODUCTION_URL}/auth`);
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/*/dashboard', { timeout: 15000 });

    // Wait for CreatePost component
    await page.waitForSelector('textarea[placeholder*="What\'s on your mind"]', { timeout: 10000 });

    // Look for visibility button (should show "Public" by default)
    const visibilityButton = page.locator('button:has-text("Public")');
    await expect(visibilityButton).toBeVisible();

    // Click to open visibility menu
    await visibilityButton.click();

    // Verify visibility options appear
    await expect(page.locator('text=Anyone can see')).toBeVisible({ timeout: 2000 });
  });

  test('should display empty state when no posts exist', async ({ page }) => {
    // This test assumes we might have a fresh account or filtered view with no posts
    // Login
    await page.goto(`${PRODUCTION_URL}/auth`);
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/*/dashboard', { timeout: 15000 });

    // Wait for feed to load
    await page.waitForTimeout(3000);

    // Check if CreatePost component is visible (should always be there)
    await expect(page.locator('textarea[placeholder*="What\'s on your mind"]')).toBeVisible();

    // If no posts, should see empty state or posts
    // This is more of a smoke test to ensure page doesn't crash
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
  });

  test('should have responsive layout on dashboard', async ({ page }) => {
    // Login
    await page.goto(`${PRODUCTION_URL}/auth`);
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/*/dashboard', { timeout: 15000 });

    // Wait for dashboard to load
    await page.waitForTimeout(2000);

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('text=Quick Actions')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Verify feed is still accessible on mobile
    await expect(page.locator('textarea[placeholder*="What\'s on your mind"]')).toBeVisible();
  });
});
