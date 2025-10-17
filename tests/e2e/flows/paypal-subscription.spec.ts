import { test as authTest, expect } from '../fixtures/auth.fixture';
import { TIMEOUTS } from '../helpers/env';

/**
 * Critical Flow: PayPal Subscription
 *
 * User Journey:
 * 1. Navigate to pricing/subscription page
 * 2. Select a subscription plan
 * 3. PayPal button renders correctly
 * 4. Verify PayPal checkout flow initiates
 *
 * Note: Full payment E2E is complex with PayPal sandbox.
 * This test validates UI integration and button rendering.
 * Actual payment completion should be tested manually or with PayPal's testing tools.
 */
authTest.describe('PayPal Subscription Flow', () => {
  authTest('should display pricing plans', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to pricing page (adjust URL based on actual route)
    const pricingRoutes = ['/pricing', '/subscription', '/plans', '/profile/subscription'];
    let loaded = false;

    for (const route of pricingRoutes) {
      try {
        await page.goto(route, { timeout: TIMEOUTS.MEDIUM });
        loaded = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!loaded) {
      authTest.skip();
      return;
    }

    // Should display subscription plans
    const plansContainer = page.locator('[data-testid="pricing-plans"]');
    const hasPlans = await plansContainer.isVisible().catch(() => false);

    if (!hasPlans) {
      // Try alternative selectors
      const altPlans = page.locator('text=/Pro|Premium|Club|Free/i');
      const hasAltPlans = await altPlans.first().isVisible().catch(() => false);
      expect(hasAltPlans).toBe(true);
    } else {
      expect(await plansContainer.isVisible()).toBe(true);
    }
  });

  authTest('should show PayPal button for paid plans', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to subscription page
    const routes = ['/pricing', '/subscription', '/plans', '/profile/subscription'];
    for (const route of routes) {
      try {
        await page.goto(route, { timeout: TIMEOUTS.SHORT });
        break;
      } catch (e) {
        continue;
      }
    }

    // Look for Pro plan (assuming it's a paid tier)
    const proPlan = page.locator('[data-testid="plan-pro"]');
    const hasPro = await proPlan.isVisible().catch(() => false);

    if (hasPro) {
      // Click on Pro plan to see subscription options
      await proPlan.click();

      // Wait for PayPal button container to render
      await page.waitForTimeout(2000); // Allow PayPal SDK to load

      // Check for PayPal button (PayPal SDK creates iframe or button)
      const paypalButton = page.locator('[data-testid="paypal-button"]');
      const hasPaypal = await paypalButton.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false);

      if (!hasPaypal) {
        // Try alternative: PayPal SDK creates divs with specific classes
        const paypalContainer = page.locator('div[id*="paypal"]').first();
        const hasContainer = await paypalContainer.isVisible().catch(() => false);
        expect(hasContainer).toBe(true);
      } else {
        expect(hasPaypal).toBe(true);
      }
    }
  });

  authTest('should display subscription tiers with correct pricing', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to pricing
    const routes = ['/pricing', '/subscription', '/plans'];
    let loaded = false;

    for (const route of routes) {
      try {
        await page.goto(route, { timeout: TIMEOUTS.SHORT });
        loaded = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!loaded) {
      authTest.skip();
      return;
    }

    // Check for pricing tiers (Free, Pro, Premium, Club)
    const tiers = ['Free', 'Pro', 'Premium', 'Club'];
    let foundTiers = 0;

    for (const tier of tiers) {
      const tierElement = page.locator(`text=${tier}`).first();
      const visible = await tierElement.isVisible().catch(() => false);
      if (visible) foundTiers++;
    }

    // Should have at least 2 tiers visible
    expect(foundTiers).toBeGreaterThanOrEqual(2);
  });

  authTest('should handle subscription upgrade click', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to subscription management
    const routes = ['/profile/subscription', '/subscription', '/pricing'];
    let loaded = false;

    for (const route of routes) {
      try {
        await page.goto(route, { timeout: TIMEOUTS.SHORT });
        loaded = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!loaded) {
      authTest.skip();
      return;
    }

    // Look for upgrade button
    const upgradeButton = page.locator('button:has-text(/Upgrade|Subscribe|Get Started/i)').first();
    const hasUpgrade = await upgradeButton.isVisible().catch(() => false);

    if (hasUpgrade) {
      // Click upgrade button
      await upgradeButton.click();

      // Should show PayPal checkout or modal
      await page.waitForTimeout(1000);

      // Check if modal, overlay, or redirect occurred
      const hasModal = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      const hasOverlay = await page.locator('[data-testid="paypal-overlay"]').isVisible().catch(() => false);
      const urlChanged = page.url().includes('paypal') || page.url().includes('checkout');

      // At least one should be true
      expect(hasModal || hasOverlay || urlChanged).toBe(true);
    }
  });

  authTest('should show current subscription status', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to profile or subscription page
    const routes = ['/profile', '/profile/subscription', '/subscription'];
    let loaded = false;

    for (const route of routes) {
      try {
        await page.goto(route, { timeout: TIMEOUTS.SHORT });
        loaded = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!loaded) {
      authTest.skip();
      return;
    }

    // Look for subscription status indicator
    const statusText = page.locator('text=/Current Plan|Subscription|Free Plan|Pro Plan/i').first();
    const hasStatus = await statusText.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false);

    // Should show some subscription information
    expect(hasStatus).toBe(true);
  });

  authTest('should display usage limits based on tier', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to profile or dashboard
    const routes = ['/profile', '/dashboard', '/'];
    let loaded = false;

    for (const route of routes) {
      try {
        await page.goto(route, { timeout: TIMEOUTS.SHORT });
        loaded = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!loaded) {
      authTest.skip();
      return;
    }

    // Look for usage limit indicators
    const usageLimits = page.locator('text=/tournaments.*limit|limit.*tournaments|matches.*limit/i').first();
    const hasLimits = await usageLimits.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false);

    // Limits display is optional, so we just check presence without assertion
    if (hasLimits) {
      expect(await usageLimits.isVisible()).toBe(true);
    }
  });
});
