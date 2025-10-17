import { test, expect } from '@playwright/test';
import { TEST_DATA, TIMEOUTS } from '../helpers/env';
import { fillForm, submitForm } from '../helpers/forms';
import { navigateAndWait } from '../helpers/navigation';

test.describe('Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAndWait(page, '/auth?mode=signup');

    // Should start on signup tab
    await expect(page.locator('button:has-text("Sign Up")')).toHaveClass(/indigo-600/);
  });

  test('should display signup form with username field', async ({ page }) => {
    // Check form fields exist
    await expect(page.locator('input[type="text"]')).toBeVisible(); // Username
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Create Account")')).toBeVisible();
  });

  test('should show validation error for invalid email on signup', async ({ page }) => {
    await fillForm(page, {
      'input[type="text"]': TEST_DATA.USERNAME,
      'input[type="email"]': TEST_DATA.INVALID_EMAIL,
      'input[type="password"]': TEST_DATA.VALID_PASSWORD,
    });

    await submitForm(page, 'form');

    // Wait for form validation
    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('should show error for weak password', async ({ page }) => {
    await fillForm(page, {
      'input[type="text"]': TEST_DATA.USERNAME,
      'input[type="email"]': TEST_DATA.VALID_EMAIL,
      'input[type="password"]': TEST_DATA.WEAK_PASSWORD,
    });

    await submitForm(page, 'form');

    // Wait for error message about weak password
    await expect(
      page.locator('text=/Password.*too weak|Password must be at least|weak password/i')
    ).toBeVisible({
      timeout: TIMEOUTS.MEDIUM,
    });
  });

  test('should show success message to check email', async ({ page }) => {
    // Generate unique email for this test
    const uniqueEmail = `test+${Date.now()}@padelgraph.com`;

    await fillForm(page, {
      'input[type="text"]': TEST_DATA.USERNAME,
      'input[type="email"]': uniqueEmail,
      'input[type="password"]': TEST_DATA.VALID_PASSWORD,
    });

    await submitForm(page, 'form');

    // Wait for success message
    await expect(page.locator('text=/Check your email|confirmation link/i')).toBeVisible({
      timeout: TIMEOUTS.LONG,
    });

    // Check that message is styled as success (green)
    const successMessage = page.locator('text=/Check your email/i').locator('..');
    await expect(successMessage).toHaveClass(/green/);
  });

  test('should show error for already registered email', async ({ page }) => {
    // Use existing test account email
    await fillForm(page, {
      'input[type="text"]': TEST_DATA.USERNAME,
      'input[type="email"]': 'test@padelgraph.com',
      'input[type="password"]': TEST_DATA.VALID_PASSWORD,
    });

    await submitForm(page, 'form');

    // Wait for error about duplicate user
    await expect(page.locator('text=/already.*registered|User already exists/i')).toBeVisible({
      timeout: TIMEOUTS.MEDIUM,
    });
  });

  test('should use email as username if username not provided', async ({ page }) => {
    // Generate unique email
    const uniqueEmail = `nouser+${Date.now()}@padelgraph.com`;

    // Leave username empty
    await fillForm(page, {
      'input[type="email"]': uniqueEmail,
      'input[type="password"]': TEST_DATA.VALID_PASSWORD,
    });

    await submitForm(page, 'form');

    // Should still succeed (username defaults to email prefix)
    await expect(page.locator('text=/Check your email/i')).toBeVisible({
      timeout: TIMEOUTS.LONG,
    });
  });
});
