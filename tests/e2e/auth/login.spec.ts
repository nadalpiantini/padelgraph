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
    await expect(page.locator('button:has-text("Log In")')).toBeVisible();

    // Check form fields exist
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await fillForm(page, {
      'input[type="email"]': TEST_DATA.INVALID_EMAIL,
      'input[type="password"]': TEST_DATA.VALID_PASSWORD,
    });

    await submitForm(page, 'form');

    // Wait for form validation (browser built-in)
    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('should show error for incorrect credentials', async ({ page }) => {
    await fillForm(page, {
      'input[type="email"]': 'wrong@email.com',
      'input[type="password"]': 'wrongpassword',
    });

    await submitForm(page, 'form');

    // Wait for error message
    await expect(page.locator('text=/Invalid login credentials|Authentication failed/i')).toBeVisible({
      timeout: TIMEOUTS.MEDIUM,
    });
  });

  test('should successfully log in with valid credentials', async ({ page }) => {
    await fillForm(page, {
      'input[type="email"]': TEST_CREDENTIALS.email,
      'input[type="password"]': TEST_CREDENTIALS.password,
    });

    await submitForm(page, 'form');

    // Wait for redirect to home page
    await page.waitForURL(/^(?!.*\/auth).*$/, { timeout: TIMEOUTS.LONG });

    // Verify we're logged in (check for logout button or user menu)
    // Adjust selector based on actual UI
    const isAuthenticated =
      (await page.url()) === '/' || page.url().includes('/profile') || page.url().includes('/home');
    expect(isAuthenticated).toBe(true);
  });

  test('should toggle between login and signup tabs', async ({ page }) => {
    // Start on login tab
    await expect(page.locator('button:has-text("Log In")')).toHaveClass(/indigo-600/);

    // Click signup tab
    await page.click('button:has-text("Sign Up")');

    // Check signup tab is active
    await expect(page.locator('button:has-text("Sign Up")')).toHaveClass(/indigo-600/);

    // Check username field appears (only in signup)
    await expect(page.locator('input[type="text"]')).toBeVisible();

    // Switch back to login
    await page.click('button:has-text("Log In")');

    // Username field should be hidden
    await expect(page.locator('input[type="text"]')).not.toBeVisible();
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
