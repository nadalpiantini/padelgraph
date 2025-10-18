/**
 * Reactivate Subscription API
 * POST /api/subscriptions/reactivate
 *
 * Allows users to reactivate a cancelled subscription before period end
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

    if (!subscription.cancel_at_period_end) {
      return NextResponse.json(
        { error: 'Subscription is not set for cancellation' },
        { status: 400 }
      );
    }

    if (subscription.status === 'cancelled' || subscription.status === 'expired') {
      return NextResponse.json(
        { error: 'Subscription has already ended. Please subscribe again.' },
        { status: 400 }
      );
    }

    if (!subscription.paypal_subscription_id) {
      return NextResponse.json(
        { error: 'No PayPal subscription ID found' },
        { status: 400 }
      );
    }

    // Update local database - remove cancellation flag
    const { error: updateError } = await supabase
      .from('subscription')
      .update({
        cancel_at_period_end: false,
        status: 'active',
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

    log.info('Subscription reactivated', {
      userId: user.id,
      subscriptionId: subscription.paypal_subscription_id,
    });

    // Send reactivation confirmation email
    try {
      const { data: profile } = await supabase
        .from('user_profile')
        .select('name, email')
        .eq('user_id', user.id)
        .single();

      if (profile?.email) {
        const locale = await getUserLocale(user.id);

        const nextBillingDate = subscription.current_period_end
          ? new Date(subscription.current_period_end).toLocaleDateString(
              locale === 'es' ? 'es-ES' : 'en-US'
            )
          : 'next billing period';

        await sendPayPalNotification(
          'subscriptionActivated',
          profile.email,
          {
            name: profile.name || 'PadelGraph Player',
            plan: subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1),
            nextBillingDate,
          },
          locale
        );
      }
    } catch (emailError) {
      log.error('Failed to send reactivation email', {
        error: emailError,
        userId: user.id,
      });
      // Email failure shouldn't fail the reactivation
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully',
      status: 'active',
      next_billing_date: subscription.current_period_end,
    });
  } catch (error) {
    log.error('Error reactivating subscription', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
