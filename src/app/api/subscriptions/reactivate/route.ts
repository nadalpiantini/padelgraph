/**
 * Reactivate Subscription Endpoint
 * POST /api/subscriptions/reactivate
 *
 * Allows users to reactivate a cancelled subscription
 * Only works if subscription is still within the billing period (cancel_at_period_end=true)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paypalClient } from '@/lib/services/paypal-client';
import { sendPayPalNotification, getUserLocale } from '@/lib/email-templates/paypal-notifications';
import { log } from '@/lib/logger';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get user's cancelled subscription (with cancel_at_period_end=true)
    const { data: subscription, error: subError } = await supabase
      .from('subscription')
      .select('*')
      .eq('user_id', user.id)
      .eq('cancel_at_period_end', true)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        {
          error: 'No cancelled subscription found',
          hint: 'Subscription must be cancelled with cancel_at_period_end=true to be reactivated',
        },
        { status: 404 }
      );
    }

    if (!subscription.paypal_subscription_id) {
      return NextResponse.json(
        { error: 'Subscription not linked to PayPal' },
        { status: 400 }
      );
    }

    // 3. Verify subscription is still within billing period
    if (subscription.status === 'cancelled' || subscription.status === 'expired') {
      return NextResponse.json(
        {
          error: 'Subscription already expired',
          hint: 'Please create a new subscription from the pricing page',
        },
        { status: 400 }
      );
    }

    log.info('Reactivating subscription', {
      userId: user.id,
      subscriptionId: subscription.paypal_subscription_id,
    });

    // 4. Call PayPal API to reactivate subscription
    // Note: PayPal uses "activate" endpoint for reactivation
    await paypalClient.reactivateSubscription(subscription.paypal_subscription_id);

    // 5. Update local database
    // Remove cancel_at_period_end flag and set status to active
    const { error: updateError } = await supabase
      .from('subscription')
      .update({
        cancel_at_period_end: false,
        status: 'active', // Ensure status is active
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      log.error('Failed to update subscription in database', { error: updateError });
      throw new Error('Database update failed');
    }

    // 6. Get user profile for email notification
    const { data: profile } = await supabase
      .from('user_profile')
      .select('name, email, preferred_language')
      .eq('user_id', user.id)
      .single();

    // 7. Send reactivation confirmation email
    if (profile?.email) {
      const locale = await getUserLocale(user.id);

      await sendPayPalNotification(
        'subscriptionReactivated',
        profile.email,
        {
          name: profile.name || 'PadelGraph Player',
          plan: subscription.plan || 'Pro',
        },
        locale
      );
    }

    log.info('Subscription reactivated successfully', {
      userId: user.id,
      subscriptionId: subscription.paypal_subscription_id,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully',
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: 'active',
        current_period_end: subscription.current_period_end,
      },
    });
  } catch (error) {
    log.error('Error reactivating subscription', { error });

    return NextResponse.json(
      {
        error: 'Failed to reactivate subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
