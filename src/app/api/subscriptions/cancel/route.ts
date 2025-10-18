/**
 * Cancel Subscription Endpoint
 * POST /api/subscriptions/cancel
 *
 * Allows users to cancel their active PayPal subscription
 * Subscription remains active until end of billing period
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paypalClient } from '@/lib/services/paypal-client';
import { sendPayPalNotification, getUserLocale } from '@/lib/email-templates/paypal-notifications';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get user's active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscription')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    if (!subscription.paypal_subscription_id) {
      return NextResponse.json(
        { error: 'Subscription not linked to PayPal' },
        { status: 400 }
      );
    }

    // 3. Parse optional request body for cancellation reason
    let cancellationReason = 'User requested cancellation via web app';
    try {
      const body = await request.json();
      if (body.reason) {
        cancellationReason = body.reason;
      }
    } catch {
      // No body or invalid JSON - use default reason
    }

    log.info('Cancelling subscription', {
      userId: user.id,
      subscriptionId: subscription.paypal_subscription_id,
      reason: cancellationReason,
    });

    // 4. Call PayPal API to cancel subscription
    await paypalClient.cancelSubscription(subscription.paypal_subscription_id, cancellationReason);

    // 5. Update local database
    // Set cancel_at_period_end=true (subscription stays active until period ends)
    // PayPal webhook will handle final status change to 'cancelled'
    const { error: updateError } = await supabase
      .from('subscription')
      .update({
        cancel_at_period_end: true,
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

    // 7. Send cancellation confirmation email
    if (profile?.email) {
      const locale = await getUserLocale(user.id);
      const expiryDate = subscription.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US')
        : 'End of billing period';

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

    log.info('Subscription cancelled successfully', {
      userId: user.id,
      subscriptionId: subscription.paypal_subscription_id,
      expiresAt: subscription.current_period_end,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled. Access remains active until end of billing period.',
      expiresAt: subscription.current_period_end,
    });
  } catch (error) {
    log.error('Error cancelling subscription', { error });

    return NextResponse.json(
      {
        error: 'Failed to cancel subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
