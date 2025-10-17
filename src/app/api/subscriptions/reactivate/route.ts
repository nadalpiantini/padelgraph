// Sprint 5 Phase 2: Reactivate Subscription API
// POST /api/subscriptions/reactivate

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reactivateSubscription } from '@/lib/services/subscriptions';
import { log } from '@/lib/logger';

const PAYPAL_API_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscription')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Check if eligible for reactivation
    if (subscription.status !== 'cancelled' || !subscription.cancel_at_period_end) {
      return NextResponse.json(
        { error: 'Subscription is not eligible for reactivation' },
        { status: 400 }
      );
    }

    // Check if subscription period has already ended
    if (subscription.current_period_end && new Date(subscription.current_period_end) < new Date()) {
      return NextResponse.json(
        { error: 'Subscription period has already ended. Please create a new subscription.' },
        { status: 400 }
      );
    }

    // Verify PayPal subscription exists
    if (!subscription.paypal_subscription_id) {
      return NextResponse.json(
        { error: 'PayPal subscription ID not found' },
        { status: 400 }
      );
    }

    // Get PayPal access token
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
      return NextResponse.json(
        { error: 'Failed to connect to PayPal' },
        { status: 500 }
      );
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Reactivate PayPal subscription
    const reactivateResponse = await fetch(
      `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscription.paypal_subscription_id}/activate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          reason: 'User requested reactivation',
        }),
      }
    );

    if (!reactivateResponse.ok && reactivateResponse.status !== 204) {
      const errorData = await reactivateResponse.text();
      log.error('Failed to reactivate PayPal subscription', {
        status: reactivateResponse.status,
        error: errorData,
      });
      return NextResponse.json(
        { error: 'Failed to reactivate subscription with PayPal' },
        { status: 500 }
      );
    }

    // Update local subscription record
    await reactivateSubscription(user.id);

    // Send reactivation email
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: 'Subscription Reactivated',
          template: 'subscription-reactivated',
          data: {
            plan: subscription.plan,
            nextBillingDate: subscription.current_period_end,
          },
        }),
      });

      if (!emailResponse.ok) {
        log.warn('Failed to send reactivation email', { userId: user.id });
      }
    } catch (error) {
      log.error('Error sending reactivation email', { error });
    }

    log.info('Subscription reactivated', {
      userId: user.id,
      subscriptionId: subscription.paypal_subscription_id
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully',
      subscription: {
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: subscription.current_period_end,
        plan: subscription.plan,
      },
    });
  } catch (error) {
    log.error('Error reactivating subscription', { error });
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}