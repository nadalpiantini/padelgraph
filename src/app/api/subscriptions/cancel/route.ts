// Sprint 5 Phase 2: Cancel Subscription API
// POST /api/subscriptions/cancel

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cancelSubscription } from '@/lib/services/subscriptions';
import { log } from '@/lib/logger';

const PAYPAL_API_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

export async function POST(request: NextRequest) {
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
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Check if already cancelled
    if (subscription.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Subscription is already cancelled' },
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

    // Parse request body for reason (optional)
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'User requested cancellation';

    // Cancel PayPal subscription
    const cancelResponse = await fetch(
      `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscription.paypal_subscription_id}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          reason,
        }),
      }
    );

    if (!cancelResponse.ok && cancelResponse.status !== 204) {
      const errorData = await cancelResponse.text();
      log.error('Failed to cancel PayPal subscription', {
        status: cancelResponse.status,
        error: errorData,
      });
      return NextResponse.json(
        { error: 'Failed to cancel subscription with PayPal' },
        { status: 500 }
      );
    }

    // Update local subscription record
    await cancelSubscription(user.id);

    // Send cancellation email (using existing email service)
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: 'Subscription Cancellation Confirmed',
          template: 'subscription-cancelled',
          data: {
            plan: subscription.plan,
            endDate: subscription.current_period_end,
          },
        }),
      });

      if (!emailResponse.ok) {
        log.warn('Failed to send cancellation email', { userId: user.id });
      }
    } catch (error) {
      log.error('Error sending cancellation email', { error });
    }

    log.info('Subscription cancelled', {
      userId: user.id,
      subscriptionId: subscription.paypal_subscription_id,
      reason
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription: {
        status: 'cancelled',
        cancel_at_period_end: true,
        current_period_end: subscription.current_period_end,
      },
    });
  } catch (error) {
    log.error('Error cancelling subscription', { error });
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}