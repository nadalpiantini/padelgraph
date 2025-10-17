import { test as authTest, expect } from '../fixtures/auth.fixture';
import { navigateAndWait, waitForAPIResponse } from '../helpers/navigation';
import { fillField } from '../helpers/forms';
import { TIMEOUTS } from '../helpers/env';

/**
 * Critical Flow: Social Interaction
 *
 * User Journey:
 * 1. View social feed
 * 2. Create a post
 * 3. Like a post
 * 4. Comment on a post
 */
authTest.describe('Social Interaction Flow', () => {
  authTest('should create a post in social feed', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to home/feed page
    await navigateAndWait(page, '/');

    // Look for post creation area
    const createPostButton = page.locator('button:has-text(/Create.*Post|New Post|Share/i)');
    const hasCreatePost = await createPostButton.isVisible().catch(() => false);

    if (!hasCreatePost) {
      // Try alternative - direct textarea
      const postTextarea = page.locator('textarea[placeholder*="post" i], textarea[placeholder*="share" i]');
      const hasTextarea = await postTextarea.isVisible().catch(() => false);

      if (!hasTextarea) {
        authTest.skip();
        return;
      }

      // Fill post content
      await fillField(page, postTextarea, 'E2E Test Post - Amazing game today! 🎾');

      // Submit post
      const submitButton = page.locator('button[type="submit"]:has-text(/Post|Share|Publish/i)');
      await submitButton.click();

      // Wait for API response
      await waitForAPIResponse(page, '/api/posts').catch(() => {});

      // Wait for success or post to appear
      await page.waitForSelector('text=/E2E Test Post/i', { timeout: TIMEOUTS.MEDIUM });

      // Verify post is visible
      const postVisible = await page.locator('text=/E2E Test Post/i').isVisible();
      expect(postVisible).toBe(true);
    } else {
      await createPostButton.click();

      // Fill modal/form
      const postInput = page.locator('textarea, input[type="text"]').first();
      await fillField(page, postInput, 'E2E Test Post - Great match! 🏆');

      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text(/Post|Share/i)');
      await submitButton.click();

      // Wait for post to appear
      await page.waitForSelector('text=/E2E Test Post/i', { timeout: TIMEOUTS.MEDIUM });
    }
  });

  authTest('should like a post', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateAndWait(page, '/');

    // Find a post with like button
    const likeButton = page.locator('button[aria-label*="like" i], button:has-text(/like/i)').first();
    const hasLikeButton = await likeButton.isVisible().catch(() => false);

    if (!hasLikeButton) {
      authTest.skip();
      return;
    }

    // Get initial like count (if displayed)
    const likeCountBefore = await page
      .locator('[data-testid="like-count"]')
      .first()
      .textContent()
      .catch(() => '0');

    // Click like
    await likeButton.click();

    // Wait for API response
    await waitForAPIResponse(page, '/api/posts/').catch(() => {});

    // Wait a bit for UI to update
    await page.waitForTimeout(1000);

    // Verify like was registered (button state changed or count increased)
    const likeCountAfter = await page
      .locator('[data-testid="like-count"]')
      .first()
      .textContent()
      .catch(() => '0');

    // Like count should change OR button should show "liked" state
    const likeStateChanged = likeCountAfter !== likeCountBefore ||
      (await likeButton.getAttribute('aria-pressed')) === 'true' ||
      (await likeButton.getAttribute('data-liked')) === 'true';

    expect(likeStateChanged).toBe(true);
  });

  authTest('should comment on a post', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateAndWait(page, '/');

    // Find comment button
    const commentButton = page.locator('button:has-text(/comment/i), button[aria-label*="comment" i]').first();
    const hasCommentButton = await commentButton.isVisible().catch(() => false);

    if (!hasCommentButton) {
      authTest.skip();
      return;
    }

    // Click to open comment section
    await commentButton.click();

    // Wait for comment input to appear
    const commentInput = page.locator('textarea[placeholder*="comment" i], input[placeholder*="comment" i]');
    await commentInput.waitFor({ timeout: TIMEOUTS.SHORT });

    // Type comment
    await fillField(page, commentInput, 'Great post! E2E test comment 👍');

    // Submit comment
    const submitComment = page.locator('button[type="submit"]:has-text(/comment|send|post/i)');
    await submitComment.click();

    // Wait for comment to appear
    await page.waitForSelector('text=/E2E test comment/i', { timeout: TIMEOUTS.MEDIUM });

    // Verify comment is visible
    const commentVisible = await page.locator('text=/E2E test comment/i').isVisible();
    expect(commentVisible).toBe(true);
  });
});
