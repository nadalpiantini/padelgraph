/**
 * Cancel Subscription API
 * POST /api/subscriptions/cancel
 *
 * Allows users to cancel their PayPal subscription
 * Subscription remains active until period end
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { sendPayPalNotification, getUserLocale } from '@/lib/email-templates/paypal-notifications';

// PayPal API configuration
const PAYPAL_API_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken(): Promise<string> {
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
    throw new Error('Failed to get PayPal access token');
  }

  const authData = await authResponse.json();
  return authData.access_token;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's active subscription
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

    if (subscription.status === 'cancelled' || subscription.status === 'expired') {
      return NextResponse.json(
        { error: 'Subscription is already cancelled' },
        { status: 400 }
      );
    }

    if (!subscription.paypal_subscription_id) {
      return NextResponse.json(
        { error: 'No PayPal subscription ID found' },
        { status: 400 }
      );
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Cancel subscription via PayPal API
    const cancelResponse = await fetch(
      `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscription.paypal_subscription_id}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          reason: 'User requested cancellation',
        }),
      }
    );

    if (!cancelResponse.ok) {
      const errorData = await cancelResponse.json();
      log.error('PayPal subscription cancellation failed', {
        error: errorData,
        userId: user.id,
        subscriptionId: subscription.paypal_subscription_id,
      });
      return NextResponse.json(
        { error: 'Failed to cancel subscription with PayPal' },
        { status: 500 }
      );
    }

    // Update local database - set cancel_at_period_end flag
    const { error: updateError } = await supabase
      .from('subscription')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      log.error('Failed to update subscription', {
        error: updateError,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    log.info('Subscription cancellation requested', {
      userId: user.id,
      subscriptionId: subscription.paypal_subscription_id,
    });

    // Send cancellation confirmation email
    try {
      const { data: profile } = await supabase
        .from('user_profile')
        .select('name, email')
        .eq('user_id', user.id)
        .single();

      if (profile?.email) {
        const locale = await getUserLocale(user.id);

        // Calculate period end date
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end).toLocaleDateString(
              locale === 'es' ? 'es-ES' : 'en-US'
            )
          : 'end of billing period';

        await sendPayPalNotification(
          'subscriptionCancelled',
          profile.email,
          {
            name: profile.name || 'PadelGraph Player',
            expiryDate: periodEnd,
          },
          locale
        );
      }
    } catch (emailError) {
      log.error('Failed to send cancellation email', {
        error: emailError,
        userId: user.id,
      });
      // Email failure shouldn't fail the cancellation
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      cancel_at_period_end: true,
      period_end: subscription.current_period_end,
    });
  } catch (error) {
    log.error('Error cancelling subscription', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
