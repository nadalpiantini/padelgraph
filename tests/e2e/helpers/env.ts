/**
 * Environment configuration for E2E tests
 *
 * Handles different test environments:
 * - Local development (localhost:3000)
 * - Production (axis6.app)
 */

export const TEST_ENV = {
  BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  IS_PRODUCTION: process.env.PLAYWRIGHT_BASE_URL?.includes('axis6.app'),
  IS_LOCAL: !process.env.PLAYWRIGHT_BASE_URL || process.env.PLAYWRIGHT_BASE_URL.includes('localhost'),
} as const;

/**
 * Test credentials
 * These should be set in environment variables for security
 */
export const TEST_CREDENTIALS = {
  email: process.env.TEST_USER_EMAIL || 'test@padelgraph.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
  username: 'e2e_test_user',
} as const;

/**
 * Test timeouts
 */
export const TIMEOUTS = {
  SHORT: 5 * 1000, // 5s
  MEDIUM: 10 * 1000, // 10s
  LONG: 30 * 1000, // 30s
  XL: 60 * 1000, // 1min
} as const;

/**
 * Test data
 */
export const TEST_DATA = {
  VALID_EMAIL: 'test@padelgraph.com',
  INVALID_EMAIL: 'invalid-email',
  VALID_PASSWORD: 'StrongPassword123!',
  WEAK_PASSWORD: '123',
  USERNAME: 'testuser',
} as const;
