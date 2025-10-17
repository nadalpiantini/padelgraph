// Sprint 5: PayPal Webhook Handler
// POST /api/paypal/webhook

import { NextRequest, NextResponse } from 'next/server';
import { syncPayPalSubscription } from '@/lib/services/subscriptions';
import { createClient } from '@/lib/supabase/server';

// PayPal Webhook Resource Types
interface PayPalSubscriptionResource {
  id: string;
  plan_id: string;
  status: string;
  billing_info?: unknown;
  subscriber?: {
    email_address?: string;
  };
}

interface PayPalPaymentResource {
  id: string;
  billing_agreement_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const parsedBody = JSON.parse(body);

    // Verify PayPal webhook signature
    const isValid = await verifyWebhookSignature(request, body);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const eventType = parsedBody.event_type;
    const resource = parsedBody.resource;

    console.log(`PayPal webhook received: ${eventType}`);

    // Handle different event types
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.UPDATED':
        await handleSubscriptionActivated(resource);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionCancelled(resource);
        break;

      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(resource);
        break;

      case 'PAYMENT.SALE.DENIED':
      case 'PAYMENT.SALE.REFUNDED':
        await handlePaymentFailed(resource);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing PayPal webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function verifyWebhookSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  
  // In development, allow skipping verification if webhook ID not configured
  if (!webhookId && process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  PAYPAL_WEBHOOK_ID not configured - skipping verification in development');
    return true;
  }

  if (!webhookId) {
    console.error('❌ PAYPAL_WEBHOOK_ID required in production');
    return false;
  }

  // Extract webhook headers
  const transmissionId = request.headers.get('paypal-transmission-id');
  const transmissionTime = request.headers.get('paypal-transmission-time');
  const certUrl = request.headers.get('paypal-cert-url');
  const transmissionSig = request.headers.get('paypal-transmission-sig');
  const authAlgo = request.headers.get('paypal-auth-algo');

  if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig || !authAlgo) {
    console.error('❌ Missing required PayPal webhook headers');
    return false;
  }

  try {
    // Get PayPal access token
    const PAYPAL_API_BASE =
      process.env.NODE_ENV === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    const authResponse = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      console.error('❌ Failed to get PayPal access token');
      return false;
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Verify webhook signature using PayPal API
    const verifyResponse = await fetch(
      `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: JSON.parse(body),
        }),
      }
    );

    if (!verifyResponse.ok) {
      console.error('❌ PayPal webhook verification API call failed:', verifyResponse.status);
      return false;
    }

    const verifyData = await verifyResponse.json();
    const isValid = verifyData.verification_status === 'SUCCESS';

    if (!isValid) {
      console.error('❌ PayPal webhook signature verification failed');
    } else {
      console.log('✅ PayPal webhook signature verified successfully');
    }

    return isValid;
  } catch (error) {
    console.error('❌ Error verifying PayPal webhook signature:', error);
    return false;
  }
}

async function handleSubscriptionActivated(resource: unknown): Promise<void> {
  const subscriptionResource = resource as PayPalSubscriptionResource;
  const supabase = await createClient();

  // Get user by PayPal email
  const subscriberEmail = subscriptionResource.subscriber?.email_address;
  if (!subscriberEmail) {
    console.error('No subscriber email in PayPal webhook');
    return;
  }

  const { data: user } = await supabase
    .from('user_profile')
    .select('user_id')
    .eq('email', subscriberEmail)
    .single();

  if (!user) {
    console.error(`User not found for email: ${subscriberEmail}`);
    return;
  }

  await syncPayPalSubscription(user.user_id, {
    subscription_id: subscriptionResource.id,
    plan_id: subscriptionResource.plan_id,
    status: subscriptionResource.status,
    billing_info: subscriptionResource.billing_info as {
      next_billing_time: string;
      last_payment: { amount: { value: string; currency_code: string } };
    },
  });

  console.log(`Subscription activated for user: ${user.user_id}`);
}

async function handleSubscriptionCancelled(resource: unknown): Promise<void> {
  const subscriptionResource = resource as PayPalSubscriptionResource;
  const supabase = await createClient();

  const { data: subscription } = await supabase
    .from('subscription')
    .select('user_id')
    .eq('paypal_subscription_id', subscriptionResource.id)
    .single();

  if (!subscription) {
    console.error(`Subscription not found: ${subscriptionResource.id}`);
    return;
  }

  await supabase
    .from('subscription')
    .update({
      status: 'cancelled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', subscriptionResource.id);

  // Downgrade to free plan
  await supabase
    .from('user_profile')
    .update({ current_plan: 'free' })
    .eq('user_id', subscription.user_id);

  console.log(`Subscription cancelled for user: ${subscription.user_id}`);
}

async function handlePaymentCompleted(resource: unknown): Promise<void> {
  const paymentResource = resource as PayPalPaymentResource;
  console.log(`Payment completed: ${paymentResource.id}`);
  // Could log payment history here
}

async function handlePaymentFailed(resource: unknown): Promise<void> {
  const paymentResource = resource as PayPalPaymentResource;
  const supabase = await createClient();

  if (!paymentResource.billing_agreement_id) {
    console.error('No billing_agreement_id in payment resource');
    return;
  }

  const { data: subscription } = await supabase
    .from('subscription')
    .select('user_id')
    .eq('paypal_subscription_id', paymentResource.billing_agreement_id)
    .single();

  if (!subscription) return;

  await supabase
    .from('subscription')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', paymentResource.billing_agreement_id);

  console.log(`Payment failed for user: ${subscription.user_id}`);
}
