// PayPal Client Configuration
// Uses @paypal/paypal-server-sdk (installed package)
import type { PayPalMode } from './types';

/**
 * Get PayPal API Base URL based on mode
 */
function getPayPalBaseUrl(): string {
  const mode: PayPalMode = (process.env.PAYPAL_MODE as PayPalMode) || 'sandbox';
  return mode === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

/**
 * Get PayPal credentials for current environment
 */
export function getPayPalCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_SECRET environment variables.'
    );
  }

  return { clientId, clientSecret };
}

/**
 * Get PayPal OAuth Token
 * Required for making authenticated API calls
 */
export async function getPayPalAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getPayPalCredentials();
  const baseUrl = getPayPalBaseUrl();

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`PayPal OAuth failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Get PayPal HTTP Client (compatibility wrapper)
 * Note: Using REST API directly instead of old SDK
 */
export function getPayPalClient() {
  return {
    baseUrl: getPayPalBaseUrl(),
    getAccessToken: getPayPalAccessToken,
    credentials: getPayPalCredentials(),
  };
}

/**
 * Get current PayPal mode
 */
export function getPayPalMode(): PayPalMode {
  return (process.env.PAYPAL_MODE as PayPalMode) || 'sandbox';
}

/**
 * Check if PayPal is properly configured
 */
export function isPayPalConfigured(): boolean {
  try {
    const mode = getPayPalMode();

    if (mode === 'production') {
      return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET);
    } else {
      return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET);
    }
  } catch {
    return false;
  }
}
