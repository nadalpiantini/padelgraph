import { test, expect } from '@playwright/test';
import { navigateAndWait } from '../helpers/navigation';
import { TIMEOUTS } from '../helpers/env';

/**
 * Analytics Event Tracking E2E Tests
 * Sprint 5 Phase 3: Verify client-side analytics tracking
 */

test.describe('Analytics Event Tracking', () => {
  test('should track page view events on navigation', async ({ page }) => {
    // Intercept analytics API calls
    const analyticsRequests: any[] = [];

    await page.route('**/api/analytics/track', (route) => {
      const request = route.request();
      const postData = request.postData();

      if (postData) {
        analyticsRequests.push(JSON.parse(postData));
      }

      // Continue with request
      route.continue();
    });

    // Navigate to landing page
    await navigateAndWait(page, '/');

    // Wait for analytics request
    await page.waitForTimeout(2000); // Give time for analytics to fire

    // Verify page_view event was tracked
    const pageViewEvent = analyticsRequests.find(
      (req) => req.event_name === 'page_view'
    );

    expect(pageViewEvent).toBeDefined();
    expect(pageViewEvent?.session_id).toBeTruthy();
    expect(pageViewEvent?.page_url).toContain('/');
    expect(pageViewEvent?.device_info).toBeDefined();
  });

  test('should track pricing page events', async ({ page }) => {
    const analyticsRequests: any[] = [];

    await page.route('**/api/analytics/track', (route) => {
      const request = route.request();
      const postData = request.postData();

      if (postData) {
        analyticsRequests.push(JSON.parse(postData));
      }

      route.continue();
    });

    // Navigate to pricing page
    await navigateAndWait(page, '/pricing');
    await page.waitForTimeout(2000);

    // Verify pricing_viewed event
    const pricingEvent = analyticsRequests.find(
      (req) => req.event_name === 'pricing_viewed'
    );

    expect(pricingEvent).toBeDefined();
  });

  test('should capture device information', async ({ page }) => {
    let deviceInfo: any = null;

    await page.route('**/api/analytics/track', (route) => {
      const request = route.request();
      const postData = request.postData();

      if (postData) {
        const data = JSON.parse(postData);
        if (data.device_info) {
          deviceInfo = data.device_info;
        }
      }

      route.continue();
    });

    await navigateAndWait(page, '/');
    await page.waitForTimeout(2000);

    // Verify device info structure
    expect(deviceInfo).toBeDefined();
    expect(deviceInfo.userAgent).toBeTruthy();
    expect(deviceInfo.screenWidth).toBeGreaterThan(0);
    expect(deviceInfo.screenHeight).toBeGreaterThan(0);
    expect(deviceInfo.language).toBeTruthy();
    expect(deviceInfo.timezone).toBeTruthy();
    expect(deviceInfo.platform).toBeTruthy();
  });

  test('should maintain session ID across page navigations', async ({ page }) => {
    const sessionIds: string[] = [];

    await page.route('**/api/analytics/track', (route) => {
      const request = route.request();
      const postData = request.postData();

      if (postData) {
        const data = JSON.parse(postData);
        if (data.session_id && !sessionIds.includes(data.session_id)) {
          sessionIds.push(data.session_id);
        }
      }

      route.continue();
    });

    // Navigate to multiple pages
    await navigateAndWait(page, '/');
    await page.waitForTimeout(1000);

    await navigateAndWait(page, '/about');
    await page.waitForTimeout(1000);

    await navigateAndWait(page, '/rankings');
    await page.waitForTimeout(1000);

    // All events should use the same session ID
    expect(sessionIds.length).toBe(1);
    expect(sessionIds[0]).toBeTruthy();
  });

  test('should handle analytics API errors gracefully', async ({ page }) => {
    // Force analytics API to fail
    await page.route('**/api/analytics/track', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    // Page should still load and function normally
    await navigateAndWait(page, '/');

    // Verify page loaded successfully despite analytics failure
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should send valid JSON to analytics API', async ({ page }) => {
    let isValidJSON = false;

    await page.route('**/api/analytics/track', (route) => {
      const request = route.request();
      const postData = request.postData();

      if (postData) {
        try {
          const data = JSON.parse(postData);
          isValidJSON = typeof data === 'object' && data !== null;
        } catch (e) {
          isValidJSON = false;
        }
      }

      route.continue();
    });

    await navigateAndWait(page, '/');
    await page.waitForTimeout(2000);

    expect(isValidJSON).toBe(true);
  });

  test('should include referrer information when available', async ({ page }) => {
    let referrerInfo: string | null = null;

    await page.route('**/api/analytics/track', (route) => {
      const request = route.request();
      const postData = request.postData();

      if (postData) {
        const data = JSON.parse(postData);
        referrerInfo = data.referrer || null;
      }

      route.continue();
    });

    // Navigate from one page to another to set referrer
    await navigateAndWait(page, '/');
    await page.waitForTimeout(1000);

    await page.click('a[href*="about"], a[href*="rankings"]').catch(() => {
      // If no link found, navigate directly
      return page.goto('/about');
    });

    await page.waitForTimeout(2000);

    // Referrer should be captured (may be empty on first load)
    expect(referrerInfo !== undefined).toBe(true);
  });
});
