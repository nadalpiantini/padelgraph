import { test, expect } from '@playwright/test';

/**
 * Discovery UI - URL Sharing E2E Tests
 *
 * Tests URL-based filter sharing functionality:
 * - URL parameter synchronization
 * - Shareable filter states
 * - Deep linking support
 * - Browser navigation (back/forward)
 * - URL parameter validation
 */

test.describe('Discovery - URL Sharing', () => {
  test('should create shareable URL with filters', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Apply filters
    const skillMin = page.locator('[data-testid="skill-min"]');
    const skillMax = page.locator('[data-testid="skill-max"]');
    await skillMin.fill('6');
    await skillMax.fill('9');

    const applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();

    await page.waitForTimeout(500);

    // Get URL
    const url = page.url();

    // URL should be shareable format
    expect(url).toContain('/discover?');
    expect(url).toContain('skill_min=6');
    expect(url).toContain('skill_max=9');

    // Copy URL and open in new context
    const sharedUrl = url;

    // Simulate sharing - open URL in fresh page
    const newPage = await page.context().newPage();
    await newPage.goto(sharedUrl);
    await newPage.waitForLoadState('networkidle');

    // Filters should be restored from URL
    const sharedSkillMin = newPage.locator('[data-testid="skill-min"]');
    const sharedSkillMax = newPage.locator('[data-testid="skill-max"]');

    expect(await sharedSkillMin.inputValue()).toBe('6');
    expect(await sharedSkillMax.inputValue()).toBe('9');

    await newPage.close();
  });

  test('should handle complex filter URL sharing', async ({ page }) => {
    // Navigate directly to URL with multiple filters
    const complexUrl = '/discover?skill_min=5&skill_max=8&city=madrid&radius=20&hand=right&age_min=25&age_max=35';
    await page.goto(complexUrl);
    await page.waitForLoadState('networkidle');

    // All filters should be populated
    const skillMin = page.locator('[data-testid="skill-min"]');
    const skillMax = page.locator('[data-testid="skill-max"]');
    const citySelect = page.locator('[data-testid="city-select"]');
    const radiusSlider = page.locator('[data-testid="radius-slider"]');
    const ageMin = page.locator('[data-testid="age-min"]');
    const ageMax = page.locator('[data-testid="age-max"]');

    expect(await skillMin.inputValue()).toBe('5');
    expect(await skillMax.inputValue()).toBe('8');
    expect(await citySelect.inputValue()).toBe('madrid');
    expect(await radiusSlider.inputValue()).toBe('20');
    expect(await ageMin.inputValue()).toBe('25');
    expect(await ageMax.inputValue()).toBe('35');

    // Right hand button should be selected
    const rightHandButton = page.locator('[data-testid="hand-right"]');
    const buttonClasses = await rightHandButton.getAttribute('class');
    expect(buttonClasses).toContain('selected'); // or appropriate selected class
  });

  test('should update URL on filter changes without reload', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    const initialUrl = page.url();

    // Apply filter
    const skillMin = page.locator('[data-testid="skill-min"]');
    await skillMin.fill('7');

    const applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();

    await page.waitForTimeout(500);

    // URL should change
    const newUrl = page.url();
    expect(newUrl).not.toBe(initialUrl);
    expect(newUrl).toContain('skill_min=7');

    // Page should not have reloaded (check via performance navigation timing)
    const navigationType = await page.evaluate(() => {
      return performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    });
    expect(navigationType.type).toBe('navigate'); // Initial navigation
  });

  test('should handle browser back/forward with filters', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Apply first filter set
    let skillMin = page.locator('[data-testid="skill-min"]');
    await skillMin.fill('5');

    let applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();
    await page.waitForTimeout(500);

    const url1 = page.url();

    // Apply second filter set
    skillMin = page.locator('[data-testid="skill-min"]');
    await skillMin.fill('8');

    applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();
    await page.waitForTimeout(500);

    const url2 = page.url();

    // Go back
    await page.goBack();
    await page.waitForTimeout(500);

    // Should be back to first filter state
    expect(page.url()).toBe(url1);
    skillMin = page.locator('[data-testid="skill-min"]');
    expect(await skillMin.inputValue()).toBe('5');

    // Go forward
    await page.goForward();
    await page.waitForTimeout(500);

    // Should be at second filter state
    expect(page.url()).toBe(url2);
    skillMin = page.locator('[data-testid="skill-min"]');
    expect(await skillMin.inputValue()).toBe('8');
  });

  test('should preserve filters on page refresh', async ({ page }) => {
    // Set filters via URL
    await page.goto('/discover?skill_min=6&city=barcelona');
    await page.waitForLoadState('networkidle');

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Filters should still be applied
    const skillMin = page.locator('[data-testid="skill-min"]');
    const citySelect = page.locator('[data-testid="city-select"]');

    expect(await skillMin.inputValue()).toBe('6');
    expect(await citySelect.inputValue()).toBe('barcelona');

    // URL should still contain params
    const url = page.url();
    expect(url).toContain('skill_min=6');
    expect(url).toContain('city=barcelona');
  });

  test('should handle invalid URL parameters gracefully', async ({ page }) => {
    // Navigate with invalid params
    await page.goto('/discover?skill_min=invalid&skill_max=999&city=unknown');
    await page.waitForLoadState('networkidle');

    // Page should load without errors
    const matchGrid = page.locator('[data-testid="match-suggestions"]');
    await expect(matchGrid).toBeVisible();

    // Invalid params should be ignored or sanitized
    const skillMin = page.locator('[data-testid="skill-min"]');
    const skillMax = page.locator('[data-testid="skill-max"]');

    // Should have default or valid values
    const minValue = await skillMin.inputValue();
    const maxValue = await skillMax.inputValue();

    expect(parseInt(minValue || '1')).toBeGreaterThanOrEqual(1);
    expect(parseInt(minValue || '1')).toBeLessThanOrEqual(10);
    expect(parseInt(maxValue || '10')).toBeGreaterThanOrEqual(1);
    expect(parseInt(maxValue || '10')).toBeLessThanOrEqual(10);
  });

  test('should handle URL with only some filters', async ({ page }) => {
    // Partial filter URL
    await page.goto('/discover?skill_min=7');
    await page.waitForLoadState('networkidle');

    // Specified filter should be applied
    const skillMin = page.locator('[data-testid="skill-min"]');
    expect(await skillMin.inputValue()).toBe('7');

    // Other filters should have defaults
    const citySelect = page.locator('[data-testid="city-select"]');
    const cityValue = await citySelect.inputValue();
    expect(cityValue).toBeDefined();
  });

  test('should encode/decode special characters in URL', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Apply filter with special characters (if applicable)
    const citySelect = page.locator('[data-testid="city-select"]');
    await citySelect.selectOption('madrid');

    const applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();

    await page.waitForTimeout(500);

    // URL should be properly encoded
    const url = page.url();
    expect(url).toContain('city=madrid');
    expect(url).not.toContain(' '); // No unencoded spaces
  });

  test('should handle tab switching with URL params', async ({ page }) => {
    // Navigate with filters
    await page.goto('/discover?skill_min=7');
    await page.waitForLoadState('networkidle');

    // Check Matches tab (default)
    const matchesTab = page.locator('[data-testid="tab-matches"]');
    await expect(matchesTab).toHaveAttribute('data-state', 'active');

    // Switch to Feed tab
    const feedTab = page.locator('[data-testid="tab-feed"]');
    await feedTab.click();
    await page.waitForTimeout(300);

    // URL params should be preserved
    const url = page.url();
    expect(url).toContain('skill_min=7');

    // Switch back to Matches
    await matchesTab.click();
    await page.waitForTimeout(300);

    // Filters should still be applied
    const skillMin = page.locator('[data-testid="skill-min"]');
    expect(await skillMin.inputValue()).toBe('7');
  });

  test('should create clean URLs without empty params', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Apply only one filter
    const skillMin = page.locator('[data-testid="skill-min"]');
    await skillMin.fill('6');

    const applyButton = page.locator('[data-testid="apply-filters"]');
    await applyButton.click();

    await page.waitForTimeout(500);

    // URL should not contain empty params
    const url = page.url();
    expect(url).toContain('skill_min=6');
    expect(url).not.toContain('city=&');
    expect(url).not.toContain('radius=&');
    expect(url).not.toContain('&&');
  });
});
