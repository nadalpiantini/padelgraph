import { Page, Locator } from '@playwright/test';

/**
 * Form helper functions for E2E tests
 */

/**
 * Fill a form field
 */
export async function fillField(page: Page, selector: string | Locator, value: string) {
  if (typeof selector === 'string') {
    await page.fill(selector, value);
  } else {
    await selector.fill(value);
  }
}

/**
 * Fill multiple form fields
 */
export async function fillForm(page: Page, fields: Record<string, string>) {
  for (const [selector, value] of Object.entries(fields)) {
    await fillField(page, selector, value);
  }
}

/**
 * Submit a form and wait for response
 */
export async function submitForm(page: Page, formSelector: string, submitSelector?: string) {
  const submit = submitSelector || `${formSelector} button[type="submit"]`;
  await page.click(submit);
}

/**
 * Check if form has error message
 */
export async function expectFormError(page: Page, errorSelector: string, expectedMessage?: string) {
  await page.waitForSelector(errorSelector, { timeout: 5000 });

  if (expectedMessage) {
    const errorText = await page.textContent(errorSelector);
    return errorText?.includes(expectedMessage);
  }

  return true;
}

/**
 * Check if form submitted successfully
 */
export async function expectFormSuccess(page: Page, successSelector: string) {
  await page.waitForSelector(successSelector, { timeout: 10000 });
}

/**
 * Clear all form fields
 */
export async function clearForm(page: Page, formSelector: string) {
  const inputs = await page.locator(`${formSelector} input`).all();

  for (const input of inputs) {
    await input.clear();
  }
}
