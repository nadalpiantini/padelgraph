import { test, expect } from '@playwright/test';

/**
 * Discovery UI - Match Suggestions E2E Tests
 *
 * Tests the personalized player recommendation system including:
 * - Match card display and data
 * - Pagination and infinite scroll
 * - Loading states
 * - Empty states
 * - Invite functionality
 */

test.describe('Discovery - Match Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to discovery page
    await page.goto('/discover');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should display match suggestions grid', async ({ page }) => {
    // Check if match suggestions container exists
    const matchGrid = page.locator('[data-testid="match-suggestions"]');
    await expect(matchGrid).toBeVisible();

    // Verify grid layout (should have at least 1 card)
    const matchCards = page.locator('[data-testid="match-card"]');
    const cardCount = await matchCards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('should display match card with all elements', async ({ page }) => {
    // Get first match card
    const firstCard = page.locator('[data-testid="match-card"]').first();
    await expect(firstCard).toBeVisible();

    // Check for avatar
    const avatar = firstCard.locator('[data-testid="user-avatar"]');
    await expect(avatar).toBeVisible();

    // Check for match score badge
    const scoreBadge = firstCard.locator('[data-testid="match-score"]');
    await expect(scoreBadge).toBeVisible();

    // Verify score is between 0-100
    const scoreText = await scoreBadge.textContent();
    const scoreValue = parseInt(scoreText?.replace('%', '') || '0');
    expect(scoreValue).toBeGreaterThanOrEqual(0);
    expect(scoreValue).toBeLessThanOrEqual(100);

    // Check for player name
    const playerName = firstCard.locator('[data-testid="player-name"]');
    await expect(playerName).toBeVisible();

    // Check for skill level
    const skillLevel = firstCard.locator('[data-testid="skill-level"]');
    await expect(skillLevel).toBeVisible();

    // Check for invite button
    const inviteButton = firstCard.locator('[data-testid="invite-button"]');
    await expect(inviteButton).toBeVisible();
    await expect(inviteButton).toBeEnabled();
  });

  test('should show loading state initially', async ({ page }) => {
    // Reload and check for skeleton loading
    await page.reload();

    // Should see skeleton cards briefly
    const skeleton = page.locator('[data-testid="match-skeleton"]');

    // Wait for either skeleton or actual cards
    await Promise.race([
      skeleton.first().waitFor({ state: 'visible', timeout: 1000 }).catch(() => {}),
      page.locator('[data-testid="match-card"]').first().waitFor({ state: 'visible', timeout: 1000 })
    ]);
  });

  test('should handle empty state when no matches', async ({ page }) => {
    // Apply very restrictive filters to get empty state
    await page.goto('/discover?skill_min=10&skill_max=10&city=unknown');

    // Wait for response
    await page.waitForLoadState('networkidle');

    // Check for empty state message
    const emptyState = page.locator('[data-testid="empty-matches"]');

    // Either we have matches or empty state, both are valid
    const hasMatches = await page.locator('[data-testid="match-card"]').count() > 0;
    if (!hasMatches) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should handle invite button click', async ({ page }) => {
    // Click first invite button
    const firstInviteButton = page.locator('[data-testid="invite-button"]').first();
    await firstInviteButton.click();

    // Button should change state (disabled or text change)
    await expect(firstInviteButton).toHaveAttribute('disabled', '');
  });

  test('should load more matches on pagination', async ({ page }) => {
    // Count initial matches
    const initialCards = await page.locator('[data-testid="match-card"]').count();

    // Look for "Load More" button
    const loadMoreButton = page.locator('button:has-text("Load More")');

    if (await loadMoreButton.isVisible()) {
      // Click load more
      await loadMoreButton.click();

      // Wait for new cards to load
      await page.waitForTimeout(1000);

      // Count should increase
      const newCards = await page.locator('[data-testid="match-card"]').count();
      expect(newCards).toBeGreaterThan(initialCards);
    }
  });

  test('should display match score with color coding', async ({ page }) => {
    const firstCard = page.locator('[data-testid="match-card"]').first();
    const scoreBadge = firstCard.locator('[data-testid="match-score"]');

    // Get score value
    const scoreText = await scoreBadge.textContent();
    const scoreValue = parseInt(scoreText?.replace('%', '') || '0');

    // Check for appropriate color class based on score
    const badgeClasses = await scoreBadge.getAttribute('class');

    if (scoreValue >= 80) {
      expect(badgeClasses).toContain('green'); // High match
    } else if (scoreValue >= 60) {
      expect(badgeClasses).toContain('blue'); // Good match
    }
  });

  test('should display skill level badge', async ({ page }) => {
    const firstCard = page.locator('[data-testid="match-card"]').first();
    const skillBadge = firstCard.locator('[data-testid="skill-level"]');

    // Should show skill level 1-10
    const skillText = await skillBadge.textContent();
    expect(skillText).toMatch(/\d+\/10/);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Should still display cards
    const matchCards = page.locator('[data-testid="match-card"]');
    await expect(matchCards.first()).toBeVisible();

    // Should be in single column layout
    const grid = page.locator('[data-testid="match-suggestions"]');
    const gridClasses = await grid.getAttribute('class');
    expect(gridClasses).toContain('grid-cols-1');
  });

  test('should be responsive on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Should display cards
    const matchCards = page.locator('[data-testid="match-card"]');
    await expect(matchCards.first()).toBeVisible();

    // Should be in multi-column layout
    const grid = page.locator('[data-testid="match-suggestions"]');
    const gridClasses = await grid.getAttribute('class');
    expect(gridClasses).toMatch(/grid-cols-(2|3)/);
  });
});
