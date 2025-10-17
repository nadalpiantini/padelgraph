/**
 * Stripe Payment Service
 * To be implemented in future sprints
 */

interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

interface PaymentIntentResponse {
  success: boolean;
  clientSecret?: string;
  error?: string;
}

export class StripeService {
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY || '';
  }

  /**
   * Create payment intent
   * @stub - To be implemented in future sprints
   */
  async createPaymentIntent(
    params: CreatePaymentIntentParams
  ): Promise<PaymentIntentResponse> {
    console.log('[Stripe] Create payment intent stub called:', params);
    return {
      success: false,
      error: 'Stripe not implemented yet',
    };
  }

  /**
   * Handle webhook
   * @stub - To be implemented in future sprints
   */
  async handleWebhook(payload: string, signature: string): Promise<boolean> {
    console.log('[Stripe] Webhook stub called');
    return false;
  }
}

export const stripeService = new StripeService();
