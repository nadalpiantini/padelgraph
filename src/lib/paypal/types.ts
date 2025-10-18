// PayPal Types for Padelgraph

export type PayPalMode = 'sandbox' | 'production';

export interface PayPalCredentials {
  clientId: string;
  clientSecret: string;
  webhookId?: string;
}

export interface PayPalEnvironmentConfig {
  mode: PayPalMode;
  sandbox: PayPalCredentials;
  production: PayPalCredentials;
}

export type SubscriptionPlanId = 'free' | 'pro' | 'premium' | 'club';

export interface PayPalPlanMapping {
  [key: string]: string | undefined;
  pro: string;
  premium: string;
  club: string;
}

// PayPal SDK Response Types
export interface PayPalSubscriptionResponse {
  id: string;
  status: string;
  status_update_time: string;
  plan_id: string;
  start_time: string;
  subscriber: {
    email_address: string;
    payer_id: string;
  };
  billing_info?: {
    last_payment?: {
      amount: { value: string; currency_code: string };
      time: string;
    };
    next_billing_time: string;
  };
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  summary: string;
  resource: any;
  create_time: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export type PayPalSubscriptionStatus =
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'EXPIRED';
