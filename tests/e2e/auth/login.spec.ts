import { test, expect } from '@playwright/test';
import { TEST_DATA, TEST_CREDENTIALS, TIMEOUTS } from '../helpers/env';
import { fillForm, submitForm } from '../helpers/forms';
import { navigateAndWait } from '../helpers/navigation';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAndWait(page, '/auth');
  });

  test('should display login form', async ({ page }) => {
    // Check if login tab is active
    await expect(page.locator('[data-testid="tab-login"]')).toBeVisible();

    // Check form fields exist
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-submit"]')).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await fillForm(page, {
      '[data-testid="email-input"]': TEST_DATA.INVALID_EMAIL,
      '[data-testid="password-input"]': TEST_DATA.VALID_PASSWORD,
    });

    await submitForm(page, '[data-testid="auth-form"]');

    // Wait for form validation (browser built-in)
    const emailInput = page.locator('[data-testid="email-input"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('should show error for incorrect credentials', async ({ page }) => {
    await fillForm(page, {
      '[data-testid="email-input"]': 'wrong@email.com',
      '[data-testid="password-input"]': 'wrongpassword',
    });

    await submitForm(page, '[data-testid="auth-form"]');

    // Wait for error message
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible({
      timeout: TIMEOUTS.MEDIUM,
    });
  });

  test('should successfully log in with valid credentials', async ({ page }) => {
    await fillForm(page, {
      '[data-testid="email-input"]': TEST_CREDENTIALS.email,
      '[data-testid="password-input"]': TEST_CREDENTIALS.password,
    });

    await submitForm(page, '[data-testid="auth-form"]');

    // Wait for redirect to home page
    await page.waitForURL(/^(?!.*\/auth).*$/, { timeout: TIMEOUTS.LONG });

    // Verify we're logged in - should NOT be on auth page anymore
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/auth');
  });

  test('should toggle between login and signup tabs', async ({ page }) => {
    // Start on login tab
    await expect(page.locator('[data-testid="tab-login"]')).toHaveClass(/indigo-600/);

    // Click signup tab
    await page.click('[data-testid="tab-signup"]');

    // Check signup tab is active
    await expect(page.locator('[data-testid="tab-signup"]')).toHaveClass(/indigo-600/);

    // Check username field appears (only in signup)
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible();

    // Switch back to login
    await page.click('[data-testid="tab-login"]');

    // Username field should be hidden
    await expect(page.locator('[data-testid="username-input"]')).not.toBeVisible();
  });

  test('should navigate back to home', async ({ page }) => {
    await page.click('a:has-text("Back to Home")');

    await page.waitForURL('/', { timeout: TIMEOUTS.SHORT });
    expect(page.url()).toContain('/');
  });

  test('should display PadelGraph logo', async ({ page }) => {
    const logo = page.locator('img[alt*="PadelGraph"]');
    await expect(logo).toBeVisible();
  });
});
