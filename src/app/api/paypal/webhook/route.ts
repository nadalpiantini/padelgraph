// Sprint 5: PayPal Webhook Handler
// POST /api/paypal/webhook

import { NextRequest, NextResponse } from 'next/server';
import { syncPayPalSubscription } from '@/lib/services/subscriptions';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { sendPayPalNotification, getUserLocale } from '@/lib/email-templates/paypal-notifications';

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
  const supabase = await createClient();
  let eventId: string | undefined;

  try {
    const body = await request.text();
    const parsedBody = JSON.parse(body);

    // Extract event metadata
    eventId = parsedBody.id;
    const eventType = parsedBody.event_type;
    const resource = parsedBody.resource;
    const resourceId = resource?.id;

    // Extract webhook headers for logging
    const headers = {
      transmissionId: request.headers.get('paypal-transmission-id'),
      transmissionTime: request.headers.get('paypal-transmission-time'),
      certUrl: request.headers.get('paypal-cert-url'),
      transmissionSig: request.headers.get('paypal-transmission-sig'),
      authAlgo: request.headers.get('paypal-auth-algo'),
    };

    log.info('PayPal webhook received', { eventId, eventType, resourceId });

    // 1. IDEMPOTENCY CHECK: Try to insert event (will fail if duplicate)
    const { error: insertError } = await supabase
      .from('paypal_webhook_event')
      .insert({
        id: eventId,
        transmission_id: headers.transmissionId,
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        event_type: eventType,
        resource_id: resourceId,
        resource_type: resourceId?.startsWith('I-') ? 'subscription' : 'payment',
        signature_verified: false,
        processed: false,
        status: 'received',
        payload: parsedBody,
        headers,
      });

    if (insertError) {
      // Duplicate event - idempotency skip
      if (insertError.code === '23505') {
        log.info('Duplicate webhook event - skipping', { eventId });
        return NextResponse.json({ success: true, deduped: true }, { status: 200 });
      }

      // Other database error - log but continue processing
      log.error('Failed to log webhook event', { error: insertError, eventId });
    }

    // 2. SIGNATURE VERIFICATION
    const isValid = await verifyWebhookSignature(request, body);

    // Update signature verification status
    if (eventId) {
      await supabase
        .from('paypal_webhook_event')
        .update({ signature_verified: isValid })
        .eq('id', eventId);
    }

    if (!isValid) {
      if (eventId) {
        await supabase
          .from('paypal_webhook_event')
          .update({
            status: 'failed',
            error_message: 'Invalid webhook signature',
          })
          .eq('id', eventId);
      }

      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    // 3. MARK AS PROCESSING
    if (eventId) {
      await supabase
        .from('paypal_webhook_event')
        .update({ status: 'processing' })
        .eq('id', eventId);
    }

    // Handle different event types
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(resource);
        break;

      case 'BILLING.SUBSCRIPTION.UPDATED':
        await handleSubscriptionUpdated(resource);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(resource);
        break;

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionSuspended(resource);
        break;

      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await handleSubscriptionExpired(resource);
        break;

      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(resource);
        break;

      case 'PAYMENT.SALE.DENIED':
        await handlePaymentFailed(resource);
        break;

      case 'PAYMENT.SALE.REFUNDED':
        await handlePaymentRefunded(resource);
        break;

      default:
        log.warn('Unhandled PayPal event type', { eventType });
    }

    // 4. MARK AS PROCESSED
    if (eventId) {
      await supabase
        .from('paypal_webhook_event')
        .update({
          processed: true,
          status: 'processed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', eventId);
    }

    return NextResponse.json({ success: true, processed: true });
  } catch (error) {
    log.error('Error processing PayPal webhook', { error, eventId });

    // Mark event as failed
    if (eventId) {
      await supabase
        .from('paypal_webhook_event')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', eventId);
    }

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
    log.warn('PAYPAL_WEBHOOK_ID not configured - skipping verification in development');
    return true;
  }

  if (!webhookId) {
    log.error('PAYPAL_WEBHOOK_ID required in production');
    return false;
  }

  // Extract webhook headers
  const transmissionId = request.headers.get('paypal-transmission-id');
  const transmissionTime = request.headers.get('paypal-transmission-time');
  const certUrl = request.headers.get('paypal-cert-url');
  const transmissionSig = request.headers.get('paypal-transmission-sig');
  const authAlgo = request.headers.get('paypal-auth-algo');

  if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig || !authAlgo) {
    log.error('Missing required PayPal webhook headers');
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
      log.error('Failed to get PayPal access token', { status: authResponse.status });
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
      log.error('PayPal webhook verification API call failed', { status: verifyResponse.status });
      return false;
    }

    const verifyData = await verifyResponse.json();
    const isValid = verifyData.verification_status === 'SUCCESS';

    if (!isValid) {
      log.error('PayPal webhook signature verification failed');
    } else {
      log.info('PayPal webhook signature verified successfully');
    }

    return isValid;
  } catch (error) {
    log.error('Error verifying PayPal webhook signature', { error });
    return false;
  }
}

async function handleSubscriptionActivated(resource: unknown): Promise<void> {
  const subscriptionResource = resource as PayPalSubscriptionResource;
  const supabase = await createClient();

  // Get user by PayPal email
  const subscriberEmail = subscriptionResource.subscriber?.email_address;
  if (!subscriberEmail) {
    log.error('No subscriber email in PayPal webhook', { subscriptionId: subscriptionResource.id });
    return;
  }

  const { data: user } = await supabase
    .from('user_profile')
    .select('user_id')
    .eq('email', subscriberEmail)
    .single();

  if (!user) {
    log.error('User not found for PayPal subscription', { email: subscriberEmail });
    return;
  }

  const billingInfo = subscriptionResource.billing_info as {
    next_billing_time?: string;
    last_payment?: { amount: { value: string; currency_code: string } };
  } | undefined;

  // Only use syncPayPalSubscription if we have complete billing info
  if (billingInfo?.next_billing_time && billingInfo?.last_payment) {
    await syncPayPalSubscription(user.user_id, {
      subscription_id: subscriptionResource.id,
      plan_id: subscriptionResource.plan_id,
      status: subscriptionResource.status,
      billing_info: {
        next_billing_time: billingInfo.next_billing_time,
        last_payment: billingInfo.last_payment,
      },
    });
  } else {
    // Manual update if billing info incomplete
    const planMap: Record<string, string> = {
      'P-8DF61561CK131203HNDZLZVQ': 'pro',
      'P-3R001407AKS44845TNDZLY7': 'dual',
      'P-88023967WE506663ENDZN2QQ': 'premium',
      'P-1EVQ6856ST196634TNDZN46A': 'club',
    };

    await supabase.from('subscription').upsert(
      {
        user_id: user.user_id,
        paypal_subscription_id: subscriptionResource.id,
        paypal_plan_id: subscriptionResource.plan_id,
        plan: planMap[subscriptionResource.plan_id] || 'pro',
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  }

  log.info('Subscription activated', { userId: user.user_id, subscriptionId: subscriptionResource.id });

  // Send activation email
  const { data: profile } = await supabase
    .from('user_profile')
    .select('name, email, preferred_language')
    .eq('user_id', user.user_id)
    .single();

  if (profile?.email) {
    const locale = await getUserLocale(user.user_id);
    const nextBillingDate = billingInfo?.next_billing_time
      ? new Date(billingInfo.next_billing_time).toLocaleDateString(
          locale === 'es' ? 'es-ES' : 'en-US'
        )
      : 'TBD';

    // Get subscription plan from database
    const { data: subscriptionData } = await supabase
      .from('subscription')
      .select('plan')
      .eq('paypal_subscription_id', subscriptionResource.id)
      .single();

    await sendPayPalNotification(
      'subscriptionActivated',
      profile.email,
      {
        name: profile.name || 'PadelGraph Player',
        plan: subscriptionData?.plan || 'Pro',
        nextBillingDate,
      },
      locale
    );
  }
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
    log.error('Subscription not found for cancellation', { subscriptionId: subscriptionResource.id });
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

  log.info('Subscription cancelled', { userId: subscription.user_id });

  // Send cancellation email
  const { data: profile } = await supabase
    .from('user_profile')
    .select('name, email')
    .eq('user_id', subscription.user_id)
    .single();

  if (profile?.email) {
    const locale = await getUserLocale(subscription.user_id);
    const expiryDate = new Date().toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US');

    await sendPayPalNotification(
      'subscriptionCancelled',
      profile.email,
      {
        name: profile.name || 'PadelGraph Player',
        expiryDate,
      },
      locale
    );
  }
}

async function handlePaymentCompleted(resource: unknown): Promise<void> {
  const paymentResource = resource as PayPalPaymentResource;
  log.info('Payment completed', { paymentId: paymentResource.id });
  // Could log payment history here
}

async function handlePaymentFailed(resource: unknown): Promise<void> {
  const paymentResource = resource as PayPalPaymentResource;
  const supabase = await createClient();

  if (!paymentResource.billing_agreement_id) {
    log.error('No billing_agreement_id in payment resource', { paymentId: paymentResource.id });
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

  log.warn('Payment failed', { userId: subscription.user_id, paymentId: paymentResource.id });

  // Send payment failed email with retry information
  const { data: profile } = await supabase
    .from('user_profile')
    .select('name, email')
    .eq('user_id', subscription.user_id)
    .single();

  if (profile?.email) {
    const locale = await getUserLocale(subscription.user_id);
    const retryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(
      locale === 'es' ? 'es-ES' : 'en-US'
    );

    await sendPayPalNotification(
      'paymentFailed',
      profile.email,
      {
        name: profile.name || 'PadelGraph Player',
        retryDate,
      },
      locale
    );
  }
}

async function handleSubscriptionUpdated(resource: unknown): Promise<void> {
  const subscriptionResource = resource as PayPalSubscriptionResource;
  const supabase = await createClient();

  // Find existing subscription
  const { data: subscription } = await supabase
    .from('subscription')
    .select('user_id')
    .eq('paypal_subscription_id', subscriptionResource.id)
    .single();

  if (!subscription) {
    log.error('Subscription not found for update', { subscriptionId: subscriptionResource.id });
    return;
  }

  // Sync updated subscription data
  await syncPayPalSubscription(subscription.user_id, {
    subscription_id: subscriptionResource.id,
    plan_id: subscriptionResource.plan_id,
    status: subscriptionResource.status,
    billing_info: subscriptionResource.billing_info as {
      next_billing_time: string;
      last_payment: { amount: { value: string; currency_code: string } };
    },
  });

  log.info('Subscription updated', { userId: subscription.user_id, subscriptionId: subscriptionResource.id });
}

async function handleSubscriptionSuspended(resource: unknown): Promise<void> {
  const subscriptionResource = resource as PayPalSubscriptionResource;
  const supabase = await createClient();

  const { data: subscription } = await supabase
    .from('subscription')
    .select('user_id')
    .eq('paypal_subscription_id', subscriptionResource.id)
    .single();

  if (!subscription) {
    log.error('Subscription not found for suspension', { subscriptionId: subscriptionResource.id });
    return;
  }

  // Update subscription status to suspended
  await supabase
    .from('subscription')
    .update({
      status: 'suspended',
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', subscriptionResource.id);

  log.warn('Subscription suspended', { userId: subscription.user_id });

  // Send suspension email
  const { data: profile } = await supabase
    .from('user_profile')
    .select('name, email')
    .eq('user_id', subscription.user_id)
    .single();

  if (profile?.email) {
    const locale = await getUserLocale(subscription.user_id);

    await sendPayPalNotification(
      'subscriptionSuspended',
      profile.email,
      {
        name: profile.name || 'PadelGraph Player',
      },
      locale
    );
  }
}

async function handleSubscriptionExpired(resource: unknown): Promise<void> {
  const subscriptionResource = resource as PayPalSubscriptionResource;
  const supabase = await createClient();

  const { data: subscription } = await supabase
    .from('subscription')
    .select('user_id')
    .eq('paypal_subscription_id', subscriptionResource.id)
    .single();

  if (!subscription) {
    log.error('Subscription not found for expiration', { subscriptionId: subscriptionResource.id });
    return;
  }

  // Mark subscription as expired and downgrade to free
  await supabase
    .from('subscription')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', subscriptionResource.id);

  // Downgrade user to free plan
  await supabase
    .from('user_profile')
    .update({ current_plan: 'free' })
    .eq('user_id', subscription.user_id);

  log.info('Subscription expired, user downgraded to free', { userId: subscription.user_id });

  // Send expiration email
  const { data: profile } = await supabase
    .from('user_profile')
    .select('name, email')
    .eq('user_id', subscription.user_id)
    .single();

  if (profile?.email) {
    const locale = await getUserLocale(subscription.user_id);

    await sendPayPalNotification(
      'subscriptionExpired',
      profile.email,
      {
        name: profile.name || 'PadelGraph Player',
      },
      locale
    );
  }
}

async function handlePaymentRefunded(resource: unknown): Promise<void> {
  const paymentResource = resource as PayPalPaymentResource;
  const supabase = await createClient();

  // Log the refund in usage_log for tracking
  if (paymentResource.billing_agreement_id) {
    const { data: subscription } = await supabase
      .from('subscription')
      .select('user_id')
      .eq('paypal_subscription_id', paymentResource.billing_agreement_id)
      .single();

    if (subscription) {
      // Log refund event
      await supabase.from('usage_log').insert({
        user_id: subscription.user_id,
        feature: 'payment',
        action: 'refund',
        timestamp: new Date().toISOString(),
        metadata: { payment_id: paymentResource.id },
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
      });

      log.info('Payment refunded', { userId: subscription.user_id, paymentId: paymentResource.id });
    }
  } else {
    log.warn('Payment refunded without billing agreement', { paymentId: paymentResource.id });
  }
}
