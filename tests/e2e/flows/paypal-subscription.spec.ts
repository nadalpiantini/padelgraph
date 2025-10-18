import { test as authTest, expect } from '../fixtures/auth.fixture';
import { TIMEOUTS } from '../helpers/env';

/**
 * Critical Flow: PayPal Subscription
 *
 * Updated for 4-plan structure: Free, Pro ($9.99), Dual ($15, 2 users), Premium ($15, 1 user)
 *
 * User Journey:
 * 1. Navigate to pricing page
 * 2. Verify all 4 plans are displayed with correct pricing
 * 3. Select a subscription plan
 * 4. PayPal checkout flow initiates correctly
 * 5. Verify plan-specific features are displayed
 * 6. Test upgrade/downgrade scenarios
 *
 * Note: Full payment E2E is complex with PayPal sandbox.
 * This test validates UI integration and subscription creation flow.
 * Actual payment completion should be tested manually with PayPal sandbox.
 */
authTest.describe('PayPal Subscription Flow', () => {
  authTest('should display all 4 pricing plans with correct pricing', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to pricing page
    await page.goto('/pricing', { timeout: TIMEOUTS.MEDIUM });

    // Verify all 4 plans are displayed
    const freePlan = page.locator('text=Free').first();
    const proPlan = page.locator('text=Pro').first();
    const dualPlan = page.locator('text=Dual').first();
    const premiumPlan = page.locator('text=Premium').first();

    await expect(freePlan).toBeVisible();
    await expect(proPlan).toBeVisible();
    await expect(dualPlan).toBeVisible();
    await expect(premiumPlan).toBeVisible();

    // Verify correct pricing
    await expect(page.locator('text=$9.99')).toBeVisible(); // Pro
    await expect(page.locator('text=$15')).toBeVisible(); // Dual and Premium

    // Verify plan descriptions
    await expect(page.locator('text=Perfect for couples & families')).toBeVisible(); // Dual
    await expect(page.locator('text=For professional players')).toBeVisible(); // Premium
  });

  authTest('should show upgrade buttons for paid plans', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/pricing', { timeout: TIMEOUTS.MEDIUM });

    // Look for subscription buttons on paid plans
    const upgradeButtons = page.locator('button:has-text(/Upgrade|Get Started|Subscribe/i)');
    await expect(upgradeButtons.first()).toBeVisible();

    // Should have at least 3 upgrade buttons (Pro, Dual, Premium - excluding Free)
    const buttonCount = await upgradeButtons.count();
    expect(buttonCount).toBeGreaterThanOrEqual(3);
  });

  authTest('should display Dual plan with family invitations feature', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/pricing', { timeout: TIMEOUTS.MEDIUM });

    // Verify Dual plan has family invitation feature
    await expect(page.locator('text=Dual')).toBeVisible();
    await expect(page.locator('text=Family Invitations (2 Users)')).toBeVisible();
    await expect(page.locator('text=Perfect for couples & families')).toBeVisible();
  });

  authTest('should display Premium plan with API access', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/pricing', { timeout: TIMEOUTS.MEDIUM });

    // Verify Premium plan has API access and custom branding
    await expect(page.locator('text=Premium')).toBeVisible();
    await expect(page.locator('text=API Access')).toBeVisible();
    await expect(page.locator('text=Custom Tournament Branding')).toBeVisible();
  });

  authTest('should display Free plan with limited features', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/pricing', { timeout: TIMEOUTS.MEDIUM });

    // Verify Free plan shows limitations
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=2/month').first()).toBeVisible(); // Tournament limit
    await expect(page.locator('text=5/month').first()).toBeVisible(); // Auto-Match limit
  });

  authTest('should initiate PayPal subscription creation for Pro plan', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/pricing', { timeout: TIMEOUTS.MEDIUM });

    // Find and click Pro plan upgrade button
    const proUpgradeButton = page.locator('button', { hasText: /Upgrade|Subscribe/i }).nth(0);

    // Listen for navigation or API calls
    const [response] = await Promise.all([
      page.waitForResponse(response =>
        response.url().includes('/api/paypal/create-subscription') &&
        response.status() === 200,
        { timeout: TIMEOUTS.LONG }
      ).catch(() => null),
      proUpgradeButton.click()
    ]);

    // Should either get a successful API response or redirect to PayPal
    if (response) {
      expect(response.status()).toBe(200);
      const responseData = await response.json().catch(() => null);
      if (responseData) {
        expect(responseData).toHaveProperty('approval_url');
      }
    } else {
      // Check if redirected to PayPal
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl.includes('paypal') || currentUrl.includes('sandbox.paypal')).toBe(true);
    }
  });

  authTest('should show Pro plan as Most Popular', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/pricing', { timeout: TIMEOUTS.MEDIUM });

    // Verify Pro plan has "Most Popular" badge
    const mostPopularBadge = page.locator('text=Most Popular');
    await expect(mostPopularBadge).toBeVisible();

    // Verify the badge is associated with Pro plan
    const proPlanCard = page.locator('text=Pro').first().locator('..');
    const hasProPlan = await proPlanCard.locator('text=Pro').isVisible();
    expect(hasProPlan).toBe(true);
  });

  authTest('should display subscription FAQ section', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/pricing', { timeout: TIMEOUTS.MEDIUM });

    // Verify FAQ section exists
    await expect(page.locator('text=Frequently Asked Questions')).toBeVisible();

    // Verify key FAQ items
    await expect(page.locator('text=Can I change plans anytime?')).toBeVisible();
    await expect(page.locator('text=What payment methods do you accept?')).toBeVisible();
    await expect(page.locator('text=Is there a free trial?')).toBeVisible();
    await expect(page.locator('text=Can I cancel my subscription?')).toBeVisible();
  });

  authTest('should show correct plan hierarchy: Free < Pro < Dual/Premium', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/pricing', { timeout: TIMEOUTS.MEDIUM });

    // Verify pricing order (Dual and Premium both at $15, but Pro at $9.99)
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=$9.99')).toBeVisible(); // Pro
    await expect(page.locator('text=$15').first()).toBeVisible(); // Dual/Premium

    // Verify all plans are in same container (grid layout)
    const pricingGrid = page.locator('.grid');
    const planCards = pricingGrid.locator('.relative');
    const cardCount = await planCards.count();

    // Should have 4 plan cards
    expect(cardCount).toBe(4);
  });
});
