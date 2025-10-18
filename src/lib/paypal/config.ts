// PayPal Configuration Helpers
import type { PayPalPlanMapping, PayPalMode } from './types';

/**
 * Get PayPal Plan ID for a given subscription plan
 */
export function getPayPalPlanId(planId: 'pro' | 'premium' | 'club'): string {
  const planMapping: PayPalPlanMapping = {
    pro: process.env.PAYPAL_PRO_PLAN_ID || process.env.NEXT_PUBLIC_PAYPAL_PLAN_PRO,
    premium: process.env.PAYPAL_PREMIUM_PLAN_ID || process.env.NEXT_PUBLIC_PAYPAL_PLAN_PREMIUM,
    club: process.env.PAYPAL_CLUB_PLAN_ID || process.env.NEXT_PUBLIC_PAYPAL_PLAN_CLUB,
  };

  const paypalPlanId = planMapping[planId];

  if (!paypalPlanId) {
    throw new Error(`PayPal Plan ID not configured for plan: ${planId}`);
  }

  return paypalPlanId;
}

/**
 * Get PayPal Webhook ID for current environment
 */
export function getWebhookId(): string {
  const mode: PayPalMode = (process.env.PAYPAL_MODE as PayPalMode) || 'sandbox';

  const webhookId = mode === 'production'
    ? process.env.PAYPAL_WEBHOOK_ID
    : process.env.PAYPAL_WEBHOOK_ID; // Same for both in our setup

  if (!webhookId) {
    throw new Error(`PayPal Webhook ID not configured for ${mode} environment`);
  }

  return webhookId;
}

/**
 * Validate PayPal configuration on app startup
 */
export function validatePayPalConfig(): void {
  const mode = process.env.PAYPAL_MODE || 'sandbox';
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_SECRET;

  if (!clientId || !clientSecret) {
    console.warn(
      `⚠️  PayPal ${mode} credentials not configured. Subscription features will not work.`
    );
  }

  // Check plan IDs
  const plans = ['pro', 'premium', 'club'] as const;
  for (const plan of plans) {
    try {
      getPayPalPlanId(plan);
    } catch {
      console.warn(`⚠️  PayPal Plan ID for "${plan}" not configured`);
    }
  }
}
