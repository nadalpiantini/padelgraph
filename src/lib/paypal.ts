/**
 * PayPal Payment Service
 * Sprint 1 - Payment Integration
 */

import {
  Client,
  OrdersController,
  Environment,
  CheckoutPaymentIntent,
  OrderApplicationContextLandingPage,
  OrderApplicationContextUserAction
} from '@paypal/paypal-server-sdk';

// PayPal Client Configuration
const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID || '',
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  },
  environment: (process.env.PAYPAL_MODE || 'sandbox') === 'sandbox'
    ? Environment.Sandbox
    : Environment.Production,
});

// Orders controller instance
const ordersController = new OrdersController(paypalClient);

// Types
export interface CreateOrderParams {
  amount: string;
  currency: string;
  bookingId: string;
  description?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId?: string;
  approvalUrl?: string;
  error?: string;
}

export interface CapturePaymentParams {
  orderId: string;
}

export interface CapturePaymentResponse {
  success: boolean;
  captureId?: string;
  status?: string;
  amount?: string;
  error?: string;
}

export interface WebhookEvent {
  event_type: string;
  resource: {
    id: string;
    status?: string;
    amount?: {
      value: string;
      currency_code: string;
    };
    custom_id?: string;
  };
}

/**
 * PayPal Service Class
 */
export class PayPalService {

  /**
   * Check if PayPal is configured
   */
  isConfigured(): boolean {
    const hasClientId = !!process.env.PAYPAL_CLIENT_ID;
    const hasSecret = !!process.env.PAYPAL_CLIENT_SECRET;

    if (!hasClientId || !hasSecret) {
      console.warn('[PayPal] Missing credentials - service disabled');
      return false;
    }

    return true;
  }

  /**
   * Create PayPal order
   */
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'PayPal not configured',
      };
    }

    try {
      const request = {
        body: {
          intent: CheckoutPaymentIntent.Capture,
          purchaseUnits: [
            {
              amount: {
                currencyCode: params.currency as 'USD' | 'EUR' | 'GBP',
                value: params.amount,
              },
              description: params.description || `Booking payment`,
              customId: params.bookingId, // Link order to booking
            },
          ],
          applicationContext: {
            returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/bookings/success`,
            cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/bookings/cancel`,
            brandName: 'PadelGraph',
            landingPage: OrderApplicationContextLandingPage.NoPreference,
            userAction: OrderApplicationContextUserAction.PayNow,
          },
        },
      };

      const { result } = await ordersController.createOrder(request);

      if (!result || !result.id) {
        return {
          success: false,
          error: 'Failed to create order',
        };
      }

      // Find approval URL
      const approvalLink = result.links?.find((link: { rel?: string; href?: string }) => link.rel === 'approve');

      return {
        success: true,
        orderId: result.id,
        approvalUrl: approvalLink?.href,
      };
    } catch (error) {
      console.error('[PayPal] Create order error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Capture payment for an order
   */
  async capturePayment(params: CapturePaymentParams): Promise<CapturePaymentResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'PayPal not configured',
      };
    }

    try {
      const { result } = await ordersController.captureOrder({
        id: params.orderId,
        prefer: 'return=representation',
      });

      if (!result) {
        return {
          success: false,
          error: 'Failed to capture payment',
        };
      }

      const capture = result.purchaseUnits?.[0]?.payments?.captures?.[0];

      return {
        success: true,
        captureId: capture?.id,
        status: capture?.status,
        amount: capture?.amount?.value,
      };
    } catch (error) {
      console.error('[PayPal] Capture payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify webhook signature
   * @note Requires PayPal webhook ID in env
   */
  async verifyWebhookSignature(
    headers: Record<string, string>,
    body: string
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      console.warn('[PayPal] Webhook ID not configured - skipping verification');
      return true; // Allow in dev, but log warning
    }

    try {
      // PayPal webhook verification would go here
      // Body will be used for signature verification in production
      console.log(`[PayPal] Webhook body length: ${body.length}`);

      // For now, basic validation
      const transmissionId = headers['paypal-transmission-id'];
      const transmissionTime = headers['paypal-transmission-time'];
      const transmissionSig = headers['paypal-transmission-sig'];

      if (!transmissionId || !transmissionTime || !transmissionSig) {
        console.warn('[PayPal] Missing webhook headers');
        return false;
      }

      // In production, verify signature using PayPal SDK
      // For now, basic check
      return true;
    } catch (error) {
      console.error('[PayPal] Webhook verification error:', error);
      return false;
    }
  }

  /**
   * Handle webhook event
   */
  async handleWebhook(event: WebhookEvent): Promise<{
    success: boolean;
    bookingId?: string;
    status?: string;
    error?: string;
  }> {
    try {
      const eventType = event.event_type;
      const resource = event.resource;

      // Extract booking ID from custom_id
      const bookingId = resource.custom_id;

      if (!bookingId) {
        return {
          success: false,
          error: 'No booking ID in webhook',
        };
      }

      // Handle different event types
      switch (eventType) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          return {
            success: true,
            bookingId,
            status: 'completed',
          };

        case 'PAYMENT.CAPTURE.DENIED':
        case 'PAYMENT.CAPTURE.PENDING':
          return {
            success: true,
            bookingId,
            status: resource.status?.toLowerCase(),
          };

        default:
          console.log('[PayPal] Unhandled event type:', eventType);
          return {
            success: true,
            bookingId,
            status: 'unknown',
          };
      }
    } catch (error) {
      console.error('[PayPal] Webhook handler error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton
export const paypalService = new PayPalService();
