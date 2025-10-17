import { Page, expect } from '@playwright/test';

/**
 * Navigation helper functions for E2E tests
 */

/**
 * Navigate to a page and wait for it to load
 */
export async function navigateAndWait(page: Page, url: string, waitForSelector?: string) {
  await page.goto(url);

  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { timeout: 10000 });
  }

  // Wait for network idle
  await page.waitForLoadState('networkidle');

  return page;
}

/**
 * Check if current page is the expected one
 */
export async function expectCurrentPage(page: Page, expectedPath: string) {
  const currentURL = page.url();
  expect(currentURL).toContain(expectedPath);
}

/**
 * Click a link and wait for navigation
 */
export async function clickAndNavigate(page: Page, selector: string, expectedPath?: string) {
  await page.click(selector);

  if (expectedPath) {
    await page.waitForURL(`**${expectedPath}**`, { timeout: 10000 });
  }

  await page.waitForLoadState('networkidle');

  return page;
}

/**
 * Check if element exists on page
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Take a screenshot with descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `tests/e2e/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Wait for API response
 */
export async function waitForAPIResponse(page: Page, urlPattern: string | RegExp, timeout = 10000) {
  return await page.waitForResponse((response) => {
    const url = response.url();
    if (typeof urlPattern === 'string') {
      return url.includes(urlPattern);
    }
    return urlPattern.test(url);
  }, { timeout });
}

/**
 * Check accessibility (basic check)
 */
export async function checkBasicAccessibility(page: Page) {
  // Check for alt text on images
  const images = await page.locator('img').all();
  for (const img of images) {
    const alt = await img.getAttribute('alt');
    expect(alt).toBeTruthy();
  }

  // Check for aria-label on buttons without text
  const buttons = await page.locator('button').all();
  for (const button of buttons) {
    const text = await button.textContent();
    const ariaLabel = await button.getAttribute('aria-label');
    expect(text || ariaLabel).toBeTruthy();
  }
}
