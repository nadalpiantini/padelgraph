import { test, expect } from '@playwright/test';

/**
 * Discovery UI - Integration E2E Tests
 *
 * End-to-end integration tests covering complete user flows:
 * - Complete discovery workflow
 * - Filter → Results → Invite flow
 * - Tab navigation
 * - Cross-component interactions
 */

test.describe('Discovery - Integration Tests', () => {
  test('should complete full discovery workflow', async ({ page }) => {
    // 1. Navigate to discovery page
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // 2. Verify page loaded correctly
    const matchGrid = page.locator('[data-testid="match-suggestions"]');
    await expect(matchGrid).toBeVisible();

    // 3. Apply filters
    const skillMin = page.locator('[data-testid="skill-min"]');
    const skillMax = page.locator('[data-testid="skill-max"]');
    await skillMin.fill('6');
    await skillMax.fill('9');

    const citySelect = page.locator('[data-testid="city-select"]');
    await citySelect.selectOption('madrid');

    const applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();

    // 4. Wait for filtered results
    await page.waitForTimeout(500);

    // 5. Verify URL updated
    const url = page.url();
    expect(url).toContain('skill_min=6');
    expect(url).toContain('skill_max=9');
    expect(url).toContain('city=madrid');

    // 6. Verify results displayed
    const matchCards = page.locator('[data-testid="match-card"]');
    const cardCount = await matchCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // 7. Click invite on first match
    const firstInviteButton = page.locator('[data-testid="invite-button"]').first();
    await firstInviteButton.click();

    // 8. Verify button state changed
    await expect(firstInviteButton).toHaveAttribute('disabled', '');
  });

  test('should handle tab navigation correctly', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Default should be Matches tab
    const matchesTab = page.locator('[data-testid="tab-matches"]');
    await expect(matchesTab).toHaveAttribute('data-state', 'active');

    // Switch to Feed tab
    const feedTab = page.locator('[data-testid="tab-feed"]');
    await feedTab.click();
    await page.waitForTimeout(300);

    // Feed should be active
    await expect(feedTab).toHaveAttribute('data-state', 'active');

    // Feed content should be visible
    const feedContent = page.locator('[data-testid="discovery-feed"]');
    await expect(feedContent).toBeVisible();

    // Switch back to Matches
    await matchesTab.click();
    await page.waitForTimeout(300);

    // Matches should be active again
    await expect(matchesTab).toHaveAttribute('data-state', 'active');

    // Match suggestions should be visible
    const matchGrid = page.locator('[data-testid="match-suggestions"]');
    await expect(matchGrid).toBeVisible();
  });

  test('should share filtered results via URL', async ({ page }) => {
    // User 1: Apply filters
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    const skillMin = page.locator('[data-testid="skill-min"]');
    await skillMin.fill('7');

    const citySelect = page.locator('[data-testid="city-select"]');
    await citySelect.selectOption('barcelona');

    const applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();
    await page.waitForTimeout(500);

    // Get shareable URL
    const sharedUrl = page.url();

    // User 2: Open shared URL in new context
    const context2 = await page.context().browser()?.newContext() || page.context();
    const page2 = await context2.newPage();

    await page2.goto(sharedUrl);
    await page2.waitForLoadState('networkidle');

    // Verify filters are restored
    const sharedSkillMin = page2.locator('[data-testid="skill-min"]');
    const sharedCitySelect = page2.locator('[data-testid="city-select"]');

    expect(await sharedSkillMin.inputValue()).toBe('7');
    expect(await sharedCitySelect.inputValue()).toBe('barcelona');

    // Verify results are similar (same filters applied)
    const matchCards = page2.locator('[data-testid="match-card"]');
    const cardCount = await matchCards.count();
    expect(cardCount).toBeGreaterThan(0);

    await page2.close();
  });

  test('should handle filter changes and reset cycle', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Initial count
    const initialCards = await page.locator('[data-testid="match-card"]').count();

    // Apply restrictive filters
    const skillMin = page.locator('[data-testid="skill-min"]');
    const skillMax = page.locator('[data-testid="skill-max"]');
    await skillMin.fill('9');
    await skillMax.fill('10');

    const applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();
    await page.waitForTimeout(500);

    // Reset filters
    const resetButton = page.locator('[data-testid="reset-filters"]');
    await resetButton.click();
    await page.waitForTimeout(500);

    // Should return to initial state
    const resetCards = await page.locator('[data-testid="match-card"]').count();
    expect(resetCards).toBe(initialCards);

    // URL should be clean
    const url = page.url();
    expect(url).not.toContain('skill_min=');
    expect(url).not.toContain('skill_max=');
  });

  test('should maintain state across page reloads', async ({ page }) => {
    // Set filters
    await page.goto('/discover?skill_min=6&city=madrid');
    await page.waitForLoadState('networkidle');

    // Get initial match count
    const initialCards = await page.locator('[data-testid="match-card"]').count();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Filters should be restored
    const skillMin = page.locator('[data-testid="skill-min"]');
    const citySelect = page.locator('[data-testid="city-select"]');

    expect(await skillMin.inputValue()).toBe('6');
    expect(await citySelect.inputValue()).toBe('madrid');

    // Results should be similar
    const reloadedCards = await page.locator('[data-testid="match-card"]').count();
    expect(reloadedCards).toBe(initialCards);
  });

  test('should handle responsive design transitions', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Start desktop
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Should have multi-column layout
    let grid = page.locator('[data-testid="match-suggestions"]');
    let gridClasses = await grid.getAttribute('class');
    expect(gridClasses).toMatch(/grid-cols-(2|3)/);

    // Switch to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    // Should have single column
    grid = page.locator('[data-testid="match-suggestions"]');
    gridClasses = await grid.getAttribute('class');
    expect(gridClasses).toContain('grid-cols-1');

    // Back to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(300);

    // Should return to multi-column
    grid = page.locator('[data-testid="match-suggestions"]');
    gridClasses = await grid.getAttribute('class');
    expect(gridClasses).toMatch(/grid-cols-(2|3)/);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API and force error
    await page.route('**/api/recommendations*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Should show error state or empty state
    const errorMessage = page.locator('[data-testid="error-message"]');
    const emptyState = page.locator('[data-testid="empty-matches"]');

    // Either error or empty state should be visible
    const errorVisible = await errorMessage.isVisible().catch(() => false);
    const emptyVisible = await emptyState.isVisible().catch(() => false);

    expect(errorVisible || emptyVisible).toBe(true);
  });

  test('should handle slow network conditions', async ({ page }) => {
    // Slow down network
    await page.route('**/api/recommendations*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s delay
      route.continue();
    });

    await page.goto('/discover');

    // Should show loading state
    const skeleton = page.locator('[data-testid="match-skeleton"]');
    await expect(skeleton.first()).toBeVisible({ timeout: 1000 });

    // Eventually should show results
    const matchCards = page.locator('[data-testid="match-card"]');
    await expect(matchCards.first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle pagination correctly', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Initial count
    const initialCards = await page.locator('[data-testid="match-card"]').count();

    // Look for load more button
    const loadMoreButton = page.locator('button:has-text("Load More")');

    if (await loadMoreButton.isVisible()) {
      // Click load more
      await loadMoreButton.click();
      await page.waitForTimeout(1000);

      // Should have more cards
      const newCards = await page.locator('[data-testid="match-card"]').count();
      expect(newCards).toBeGreaterThan(initialCards);

      // No duplicate cards (check IDs are unique)
      const cardIds = await page.locator('[data-testid="match-card"]').evaluateAll((cards) => {
        return cards.map((card) => card.getAttribute('data-match-id'));
      });

      const uniqueIds = new Set(cardIds);
      expect(uniqueIds.size).toBe(cardIds.length);
    }
  });

  test('should handle multiple rapid filter changes', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    const skillMin = page.locator('[data-testid="skill-min"]');
    const applyButton = page.locator('[data-testid="apply-filters"]');

    // Rapidly change filters
    await skillMin.fill('3');
    await applyButton.click();
    await page.waitForTimeout(100);

    await skillMin.fill('5');
    await applyButton.click();
    await page.waitForTimeout(100);

    await skillMin.fill('7');
    await applyButton.click();

    // Wait for final result
    await page.waitForTimeout(1000);

    // Should show results for final filter value
    const url = page.url();
    expect(url).toContain('skill_min=7');

    // Should have results
    const matchCards = page.locator('[data-testid="match-card"]');
    await expect(matchCards.first()).toBeVisible();
  });
});
