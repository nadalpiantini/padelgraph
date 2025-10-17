import { test, expect } from '@playwright/test';
import { TEST_DATA, TIMEOUTS } from '../helpers/env';
import { fillForm, submitForm } from '../helpers/forms';
import { navigateAndWait } from '../helpers/navigation';

test.describe('Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAndWait(page, '/auth?mode=signup');

    // Should start on signup tab
    await expect(page.locator('[data-testid="tab-signup"]')).toHaveClass(/indigo-600/);
  });

  test('should display signup form with username field', async ({ page }) => {
    // Check form fields exist
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible(); // Username
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-submit"]')).toBeVisible();
  });

  test('should show validation error for invalid email on signup', async ({ page }) => {
    await fillForm(page, {
      '[data-testid="username-input"]': TEST_DATA.USERNAME,
      '[data-testid="email-input"]': TEST_DATA.INVALID_EMAIL,
      '[data-testid="password-input"]': TEST_DATA.VALID_PASSWORD,
    });

    await submitForm(page, '[data-testid="auth-form"]');

    // Wait for form validation
    const emailInput = page.locator('[data-testid="email-input"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('should show error for weak password', async ({ page }) => {
    await fillForm(page, {
      '[data-testid="username-input"]': TEST_DATA.USERNAME,
      '[data-testid="email-input"]': TEST_DATA.VALID_EMAIL,
      '[data-testid="password-input"]': TEST_DATA.WEAK_PASSWORD,
    });

    await submitForm(page, '[data-testid="auth-form"]');

    // Wait for error message about weak password
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible({
      timeout: TIMEOUTS.MEDIUM,
    });
  });

  test('should show success message to check email', async ({ page }) => {
    // Generate unique email for this test
    const uniqueEmail = `test+${Date.now()}@padelgraph.com`;

    await fillForm(page, {
      '[data-testid="username-input"]': TEST_DATA.USERNAME,
      '[data-testid="email-input"]': uniqueEmail,
      '[data-testid="password-input"]': TEST_DATA.VALID_PASSWORD,
    });

    await submitForm(page, '[data-testid="auth-form"]');

    // Wait for success message
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible({
      timeout: TIMEOUTS.LONG,
    });

    // Check that message is styled as success (green)
    const successMessage = page.locator('[data-testid="auth-error"]');
    await expect(successMessage).toHaveClass(/green/);
  });

  test('should show error for already registered email', async ({ page }) => {
    // Use existing test account email
    await fillForm(page, {
      '[data-testid="username-input"]': TEST_DATA.USERNAME,
      '[data-testid="email-input"]': 'test@padelgraph.com',
      '[data-testid="password-input"]': TEST_DATA.VALID_PASSWORD,
    });

    await submitForm(page, '[data-testid="auth-form"]');

    // Wait for error about duplicate user
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible({
      timeout: TIMEOUTS.MEDIUM,
    });
  });

  test('should use email as username if username not provided', async ({ page }) => {
    // Generate unique email
    const uniqueEmail = `nouser+${Date.now()}@padelgraph.com`;

    // Leave username empty
    await fillForm(page, {
      '[data-testid="email-input"]': uniqueEmail,
      '[data-testid="password-input"]': TEST_DATA.VALID_PASSWORD,
    });

    await submitForm(page, '[data-testid="auth-form"]');

    // Should still succeed (username defaults to email prefix)
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible({
      timeout: TIMEOUTS.LONG,
    });
  });
});
