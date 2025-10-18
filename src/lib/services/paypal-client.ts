/**
 * PayPal Client Service
 * Sprint 5 Phase 2: Centralized PayPal API client
 *
 * Handles authentication, API calls, and error handling for PayPal operations
 */

import { log } from '@/lib/logger';

// ==============================================
// TYPES & INTERFACES
// ==============================================

export interface PayPalSubscriptionDetails {
  id: string;
  plan_id: string;
  status: 'ACTIVE' | 'CANCELLED' | 'SUSPENDED' | 'EXPIRED';
  subscriber: {
    email_address: string;
    name?: {
      given_name: string;
      surname: string;
    };
  };
  billing_info: {
    next_billing_time: string;
    last_payment?: {
      amount: {
        value: string;
        currency_code: string;
      };
      time: string;
    };
    failed_payments_count?: number;
  };
  create_time: string;
  update_time: string;
}

export interface PayPalPlanDetails {
  id: string;
  product_id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  billing_cycles: Array<{
    frequency: {
      interval_unit: string;
      interval_count: number;
    };
    pricing_scheme: {
      fixed_price: {
        value: string;
        currency_code: string;
      };
    };
  }>;
}

interface PayPalAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// ==============================================
// PAYPAL CLIENT CLASS
// ==============================================

export class PayPalClient {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly secret: string;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!;
    this.secret = process.env.PAYPAL_SECRET!;

    if (!this.clientId || !this.secret) {
      throw new Error('PayPal credentials not configured');
    }

    // Use sandbox in development, production in production
    this.baseUrl =
      process.env.PAYPAL_MODE === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    log.info('PayPal client initialized', {
      mode: process.env.PAYPAL_MODE || 'sandbox',
      baseUrl: this.baseUrl,
    });
  }

  // ==============================================
  // AUTHENTICATION
  // ==============================================

  /**
   * Get PayPal access token with caching
   * Tokens are cached and reused until expiration
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60000) {
      return this.cachedToken.token;
    }

    try {
      const authResponse = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.secret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      });

      if (!authResponse.ok) {
        const error = await authResponse.text();
        throw new Error(`PayPal auth failed: ${authResponse.status} ${error}`);
      }

      const authData: PayPalAuthResponse = await authResponse.json();

      // Cache token
      this.cachedToken = {
        token: authData.access_token,
        expiresAt: Date.now() + authData.expires_in * 1000,
      };

      log.info('PayPal access token obtained', {
        expiresIn: authData.expires_in,
      });

      return authData.access_token;
    } catch (error) {
      log.error('Failed to get PayPal access token', { error });
      throw error;
    }
  }

  // ==============================================
  // SUBSCRIPTION MANAGEMENT
  // ==============================================

  /**
   * Get subscription details from PayPal
   */
  async getSubscription(subscriptionId: string): Promise<PayPalSubscriptionDetails> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get subscription: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Cancel a PayPal subscription
   * @param reason - Optional cancellation reason
   */
  async cancelSubscription(subscriptionId: string, reason?: string): Promise<void> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reason: reason || 'User requested cancellation via web app',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to cancel subscription: ${response.status} ${error}`);
    }

    log.info('PayPal subscription cancelled', { subscriptionId });
  }

  /**
   * Reactivate a cancelled subscription
   * Note: Only works if cancellation was set to end of period
   */
  async reactivateSubscription(subscriptionId: string): Promise<void> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reason: 'User requested reactivation via web app',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to reactivate subscription: ${response.status} ${error}`);
    }

    log.info('PayPal subscription reactivated', { subscriptionId });
  }

  /**
   * Suspend a subscription (payment issues)
   */
  async suspendSubscription(subscriptionId: string, reason?: string): Promise<void> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/suspend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reason: reason || 'Payment issue - automatic suspension',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to suspend subscription: ${response.status} ${error}`);
    }

    log.warn('PayPal subscription suspended', { subscriptionId, reason });
  }

  /**
   * Update subscription plan (upgrade/downgrade)
   * @param newPlanId - PayPal plan ID to switch to
   */
  async updateSubscriptionPlan(subscriptionId: string, newPlanId: string): Promise<void> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/revise`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan_id: newPlanId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update subscription plan: ${response.status} ${error}`);
    }

    log.info('PayPal subscription plan updated', { subscriptionId, newPlanId });
  }

  /**
   * Capture payment for a subscription (manual billing)
   * Use for immediate billing on upgrade scenarios
   */
  async captureSubscriptionPayment(
    subscriptionId: string,
    note?: string,
    amount?: { value: string; currency_code: string }
  ): Promise<void> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          note: note || 'Manual capture for subscription',
          ...(amount && { amount }),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to capture payment: ${response.status} ${error}`);
    }

    log.info('PayPal subscription payment captured', { subscriptionId });
  }

  // ==============================================
  // PLAN MANAGEMENT
  // ==============================================

  /**
   * Get plan details from PayPal
   */
  async getPlan(planId: string): Promise<PayPalPlanDetails> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v1/billing/plans/${planId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get plan: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * List all available plans
   */
  async listPlans(): Promise<PayPalPlanDetails[]> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v1/billing/plans?page_size=20&page=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list plans: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.plans || [];
  }

  // ==============================================
  // TRANSACTIONS & PAYMENTS
  // ==============================================

  /**
   * List transactions for a subscription
   * Useful for billing history
   */
  async listSubscriptionTransactions(
    subscriptionId: string,
    startTime: string,
    endTime: string
  ): Promise<any[]> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/transactions?start_time=${startTime}&end_time=${endTime}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list transactions: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.transactions || [];
  }

  // ==============================================
  // UTILITY METHODS
  // ==============================================

  /**
   * Verify webhook signature using PayPal API
   * @returns true if signature is valid
   */
  async verifyWebhookSignature(params: {
    transmissionId: string;
    transmissionTime: string;
    certUrl: string;
    transmissionSig: string;
    authAlgo: string;
    webhookId: string;
    webhookEvent: any;
  }): Promise<boolean> {
    const token = await this.getAccessToken();

    try {
      const verifyResponse = await fetch(
        `${this.baseUrl}/v1/notifications/verify-webhook-signature`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            auth_algo: params.authAlgo,
            cert_url: params.certUrl,
            transmission_id: params.transmissionId,
            transmission_sig: params.transmissionSig,
            transmission_time: params.transmissionTime,
            webhook_id: params.webhookId,
            webhook_event: params.webhookEvent,
          }),
        }
      );

      if (!verifyResponse.ok) {
        log.error('PayPal webhook verification API call failed', {
          status: verifyResponse.status,
        });
        return false;
      }

      const verifyData = await verifyResponse.json();
      const isValid = verifyData.verification_status === 'SUCCESS';

      if (!isValid) {
        log.error('PayPal webhook signature verification failed');
      }

      return isValid;
    } catch (error) {
      log.error('Error verifying PayPal webhook signature', { error });
      return false;
    }
  }
}

// ==============================================
// SINGLETON INSTANCE
// ==============================================

// Export singleton instance for reuse across app
export const paypalClient = new PayPalClient();
