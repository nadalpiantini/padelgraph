import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getPayPalClient, getPayPalMode, isPayPalConfigured, getPayPalCredentials } from '@/lib/paypal/client';

describe('PayPal Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('getPayPalMode', () => {
    it('returns sandbox by default', () => {
      delete process.env.PAYPAL_MODE;
      expect(getPayPalMode()).toBe('sandbox');
    });

    it('returns configured mode', () => {
      process.env.PAYPAL_MODE = 'production';
      expect(getPayPalMode()).toBe('production');
    });
  });

  describe('isPayPalConfigured', () => {
    it('returns false when credentials missing', () => {
      delete process.env.PAYPAL_CLIENT_ID;
      delete process.env.PAYPAL_SECRET;
      expect(isPayPalConfigured()).toBe(false);
    });

    it('returns true when sandbox credentials present', () => {
      process.env.PAYPAL_MODE = 'sandbox';
      process.env.PAYPAL_CLIENT_ID = 'test_sandbox_client_id';
      process.env.PAYPAL_SECRET = 'test_sandbox_secret';
      expect(isPayPalConfigured()).toBe(true);
    });

    it('returns true when production credentials present', () => {
      process.env.PAYPAL_MODE = 'production';
      process.env.PAYPAL_CLIENT_ID = 'test_prod_client_id';
      process.env.PAYPAL_SECRET = 'test_prod_secret';
      expect(isPayPalConfigured()).toBe(true);
    });
  });

  describe('getPayPalCredentials', () => {
    it('throws error when credentials missing', () => {
      delete process.env.PAYPAL_CLIENT_ID;
      delete process.env.PAYPAL_SECRET;

      expect(() => getPayPalCredentials()).toThrow(/credentials not configured/i);
    });

    it('returns credentials when configured', () => {
      process.env.PAYPAL_CLIENT_ID = 'test_client_id';
      process.env.PAYPAL_SECRET = 'test_secret';

      const credentials = getPayPalCredentials();
      expect(credentials.clientId).toBe('test_client_id');
      expect(credentials.clientSecret).toBe('test_secret');
    });
  });

  describe('getPayPalClient', () => {
    it('returns client object with credentials', () => {
      process.env.PAYPAL_MODE = 'sandbox';
      process.env.PAYPAL_CLIENT_ID = 'test_sandbox_client_id';
      process.env.PAYPAL_SECRET = 'test_sandbox_secret';

      const client = getPayPalClient();
      expect(client).toBeDefined();
      expect(client.baseUrl).toContain('sandbox');
      expect(client.credentials).toBeDefined();
    });

    it('uses production URL when mode is production', () => {
      process.env.PAYPAL_MODE = 'production';
      process.env.PAYPAL_CLIENT_ID = 'test_prod_client_id';
      process.env.PAYPAL_SECRET = 'test_prod_secret';

      const client = getPayPalClient();
      expect(client.baseUrl).toContain('api-m.paypal.com');
      expect(client.baseUrl).not.toContain('sandbox');
    });
  });
});
