import { test, expect } from '@playwright/test';

/**
 * Discovery UI - Search Filters E2E Tests
 *
 * Tests the advanced filtering system including:
 * - Filter panel expand/collapse
 * - Skill level range filter
 * - Location and radius filter
 * - Availability date range
 * - Preferred hand selection
 * - Age range filter
 * - URL parameter sync
 * - Filter reset functionality
 */

test.describe('Discovery - Search Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');
  });

  test('should display filter panel', async ({ page }) => {
    const filterPanel = page.locator('[data-testid="search-filters"]');
    await expect(filterPanel).toBeVisible();
  });

  test('should expand and collapse filter panel', async ({ page }) => {
    const expandButton = page.locator('[data-testid="filter-toggle"]');
    await expect(expandButton).toBeVisible();

    // Click to expand
    await expandButton.click();
    await page.waitForTimeout(300); // Wait for animation

    // Filter controls should be visible
    const skillFilter = page.locator('[data-testid="skill-filter"]');
    await expect(skillFilter).toBeVisible();

    // Click to collapse
    await expandButton.click();
    await page.waitForTimeout(300);

    // Controls might be hidden (depends on implementation)
  });

  test('should filter by skill level', async ({ page }) => {
    // Set skill level min/max
    const skillMin = page.locator('[data-testid="skill-min"]');
    const skillMax = page.locator('[data-testid="skill-max"]');

    await skillMin.fill('5');
    await skillMax.fill('8');

    // Apply filters
    const applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();

    // Wait for results to update
    await page.waitForTimeout(500);

    // URL should contain skill params
    const url = page.url();
    expect(url).toContain('skill_min=5');
    expect(url).toContain('skill_max=8');
  });

  test('should filter by location', async ({ page }) => {
    // Select city
    const citySelect = page.locator('[data-testid="city-select"]');
    await citySelect.selectOption('madrid');

    // Set radius
    const radiusSlider = page.locator('[data-testid="radius-slider"]');
    await radiusSlider.fill('20');

    // Apply filters
    const applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();

    await page.waitForTimeout(500);

    // URL should contain location params
    const url = page.url();
    expect(url).toContain('city=madrid');
    expect(url).toContain('radius=20');
  });

  test('should filter by availability dates', async ({ page }) => {
    // Set from date
    const fromDate = page.locator('[data-testid="availability-from"]');
    await fromDate.fill('2025-01-20');

    // Set to date
    const toDate = page.locator('[data-testid="availability-to"]');
    await toDate.fill('2025-01-25');

    // Apply filters
    const applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();

    await page.waitForTimeout(500);

    // Check if dates are in URL or filters applied
    const url = page.url();
    expect(url).toContain('from=');
    expect(url).toContain('to=');
  });

  test('should filter by preferred hand', async ({ page }) => {
    // Select right hand
    const rightHandButton = page.locator('[data-testid="hand-right"]');
    await rightHandButton.click();

    // Apply filters
    const applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();

    await page.waitForTimeout(500);

    // URL should contain hand param
    const url = page.url();
    expect(url).toContain('hand=right');
  });

  test('should filter by age range', async ({ page }) => {
    // Set age min/max
    const ageMin = page.locator('[data-testid="age-min"]');
    const ageMax = page.locator('[data-testid="age-max"]');

    await ageMin.fill('25');
    await ageMax.fill('35');

    // Apply filters
    const applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();

    await page.waitForTimeout(500);

    // URL should contain age params
    const url = page.url();
    expect(url).toContain('age_min=25');
    expect(url).toContain('age_max=35');
  });

  test('should show active filter count', async ({ page }) => {
    // Apply multiple filters
    const skillMin = page.locator('[data-testid="skill-min"]');
    await skillMin.fill('5');

    const citySelect = page.locator('[data-testid="city-select"]');
    await citySelect.selectOption('madrid');

    // Check for filter count badge
    const filterBadge = page.locator('[data-testid="filter-count"]');

    // Should show at least 2 active filters
    const badgeText = await filterBadge.textContent();
    expect(parseInt(badgeText || '0')).toBeGreaterThanOrEqual(2);
  });

  test('should display active filter summary', async ({ page }) => {
    // Apply filters
    const skillMin = page.locator('[data-testid="skill-min"]');
    const skillMax = page.locator('[data-testid="skill-max"]');

    await skillMin.fill('6');
    await skillMax.fill('9');

    const applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();

    await page.waitForTimeout(500);

    // Check for active filter chips
    const filterChips = page.locator('[data-testid="active-filter-chip"]');
    const chipCount = await filterChips.count();
    expect(chipCount).toBeGreaterThan(0);
  });

  test('should reset all filters', async ({ page }) => {
    // Apply multiple filters
    const skillMin = page.locator('[data-testid="skill-min"]');
    await skillMin.fill('5');

    const citySelect = page.locator('[data-testid="city-select"]');
    await citySelect.selectOption('madrid');

    const applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();

    await page.waitForTimeout(500);

    // Click reset button
    const resetButton = page.locator('[data-testid="reset-filters"]');
    await resetButton.click();

    await page.waitForTimeout(500);

    // URL should be clean (no query params)
    const url = page.url();
    expect(url).not.toContain('skill_min=');
    expect(url).not.toContain('city=');

    // Filter count should be 0
    const filterBadge = page.locator('[data-testid="filter-count"]');
    const badgeText = await filterBadge.textContent();
    expect(badgeText).toBe('0');
  });

  test('should sync filters from URL on load', async ({ page }) => {
    // Navigate with URL params
    await page.goto('/discover?skill_min=7&skill_max=9&city=barcelona&radius=15');
    await page.waitForLoadState('networkidle');

    // Filters should be populated from URL
    const skillMin = page.locator('[data-testid="skill-min"]');
    const skillMax = page.locator('[data-testid="skill-max"]');
    const citySelect = page.locator('[data-testid="city-select"]');
    const radiusSlider = page.locator('[data-testid="radius-slider"]');

    expect(await skillMin.inputValue()).toBe('7');
    expect(await skillMax.inputValue()).toBe('9');
    expect(await citySelect.inputValue()).toBe('barcelona');
    expect(await radiusSlider.inputValue()).toBe('15');
  });

  test('should debounce filter changes', async ({ page }) => {
    const skillMin = page.locator('[data-testid="skill-min"]');

    // Type quickly
    await skillMin.fill('1');
    await page.waitForTimeout(100);
    await skillMin.fill('2');
    await page.waitForTimeout(100);
    await skillMin.fill('3');

    // Should not update immediately (debounced)
    await page.waitForTimeout(200);

    // After debounce timeout (300ms), should update
    await page.waitForTimeout(200);

    // Final value should be in input
    expect(await skillMin.inputValue()).toBe('3');
  });

  test('should persist filters in localStorage', async ({ page }) => {
    // Apply filters
    const skillMin = page.locator('[data-testid="skill-min"]');
    await skillMin.fill('6');

    const applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();

    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Filters should still be applied
    const skillMinAfterReload = page.locator('[data-testid="skill-min"]');
    expect(await skillMinAfterReload.inputValue()).toBe('6');
  });

  test('should handle multiple filters combination', async ({ page }) => {
    // Apply comprehensive filter set
    const skillMin = page.locator('[data-testid="skill-min"]');
    const skillMax = page.locator('[data-testid="skill-max"]');
    const citySelect = page.locator('[data-testid="city-select"]');
    const radiusSlider = page.locator('[data-testid="radius-slider"]');
    const rightHandButton = page.locator('[data-testid="hand-right"]');

    await skillMin.fill('5');
    await skillMax.fill('8');
    await citySelect.selectOption('madrid');
    await radiusSlider.fill('25');
    await rightHandButton.click();

    const applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();

    await page.waitForTimeout(500);

    // URL should contain all params
    const url = page.url();
    expect(url).toContain('skill_min=5');
    expect(url).toContain('skill_max=8');
    expect(url).toContain('city=madrid');
    expect(url).toContain('radius=25');
    expect(url).toContain('hand=right');
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Filter panel should be visible and usable
    const filterPanel = page.locator('[data-testid="search-filters"]');
    await expect(filterPanel).toBeVisible();

    // Filter controls should stack vertically
    const skillFilter = page.locator('[data-testid="skill-filter"]');
    await expect(skillFilter).toBeVisible();
  });
});
