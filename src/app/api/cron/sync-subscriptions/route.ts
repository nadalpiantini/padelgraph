// Sprint 5 Phase 2: Sync Subscriptions Cron Job
// Runs daily at 03:00 UTC to sync subscription status with PayPal

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { syncPayPalSubscription } from '@/lib/services/subscriptions';

export const runtime = 'edge';
export const maxDuration = 60; // 60 seconds max

const PAYPAL_API_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      log.warn('Unauthorized cron job attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const startTime = Date.now();

    log.info('Starting daily subscription sync with PayPal');

    // Get all active subscriptions with PayPal IDs
    const { data: subscriptions, error: fetchError } = await supabase
      .from('subscription')
      .select('*')
      .not('paypal_subscription_id', 'is', null)
      .in('status', ['active', 'suspended', 'past_due', 'trialing']);

    if (fetchError) {
      log.error('Error fetching subscriptions', { error: fetchError });
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    log.info(`Found ${subscriptions?.length || 0} subscriptions to sync`);

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

    // Track sync results
    const results = {
      checked: 0,
      updated: 0,
      expired: 0,
      suspended: 0,
      reactivated: 0,
      errors: [] as string[],
      discrepancies: [] as any[],
    };

    // Process each subscription
    for (const subscription of subscriptions || []) {
      try {
        // Get subscription details from PayPal
        const paypalResponse = await fetch(
          `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscription.paypal_subscription_id}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!paypalResponse.ok) {
          if (paypalResponse.status === 404) {
            // Subscription not found in PayPal - mark as expired
            await supabase
              .from('subscription')
              .update({
                status: 'expired',
                updated_at: new Date().toISOString(),
              })
              .eq('id', subscription.id);

            results.expired++;
            results.discrepancies.push({
              subscription_id: subscription.id,
              issue: 'Not found in PayPal',
              action: 'Marked as expired',
            });
            continue;
          }

          throw new Error(`PayPal API error: ${paypalResponse.status}`);
        }

        const paypalData = await paypalResponse.json();
        results.checked++;

        // Check for status discrepancies
        const localStatus = subscription.status;
        const paypalStatus = paypalData.status;

        if (localStatus !== mapPayPalStatus(paypalStatus)) {
          log.warn('Subscription status discrepancy detected', {
            subscriptionId: subscription.id,
            localStatus,
            paypalStatus,
            paypalSubscriptionId: subscription.paypal_subscription_id,
          });

          // Sync with PayPal data
          await syncPayPalSubscription(subscription.user_id, {
            subscription_id: paypalData.id,
            plan_id: paypalData.plan_id,
            status: paypalStatus,
            billing_info: paypalData.billing_info,
          });

          results.updated++;
          results.discrepancies.push({
            subscription_id: subscription.id,
            local_status: localStatus,
            paypal_status: paypalStatus,
            action: 'Synced with PayPal',
          });

          // Track specific status changes
          if (paypalStatus === 'SUSPENDED') {
            results.suspended++;
          } else if (paypalStatus === 'EXPIRED') {
            results.expired++;
          } else if (localStatus === 'suspended' && paypalStatus === 'ACTIVE') {
            results.reactivated++;
          }
        }

        // Check for payment failures (grace period expiration)
        if (subscription.status === 'past_due') {
          const gracePeriodEnd = new Date(subscription.updated_at);
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

          if (new Date() > gracePeriodEnd) {
            // Grace period expired - downgrade to free
            await supabase
              .from('subscription')
              .update({
                status: 'expired',
                plan: 'free',
                updated_at: new Date().toISOString(),
              })
              .eq('id', subscription.id);

            await supabase
              .from('user_profile')
              .update({ current_plan: 'free' })
              .eq('id', subscription.user_id);

            log.info('Grace period expired, user downgraded', {
              userId: subscription.user_id,
              subscriptionId: subscription.id,
            });

            results.expired++;
            results.discrepancies.push({
              subscription_id: subscription.id,
              issue: 'Grace period expired',
              action: 'Downgraded to free',
            });
          }
        }
      } catch (error) {
        log.error('Error syncing subscription', {
          error,
          subscriptionId: subscription.id,
          paypalSubscriptionId: subscription.paypal_subscription_id,
        });
        results.errors.push(`Subscription ${subscription.id}: ${error}`);
      }
    }

    // Send alert if critical discrepancies found
    if (results.discrepancies.length > 5) {
      log.warn('Multiple subscription discrepancies detected', {
        count: results.discrepancies.length,
        discrepancies: results.discrepancies,
      });

      // Send alert email to admin
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: process.env.ADMIN_EMAIL || 'admin@padelgraph.com',
            subject: 'Subscription Sync Alert: Multiple Discrepancies',
            template: 'admin-alert',
            data: {
              message: `${results.discrepancies.length} subscription discrepancies detected during sync`,
              details: results.discrepancies,
            },
          }),
        });
      } catch (emailError) {
        log.error('Failed to send alert email', { error: emailError });
      }
    }

    const duration = Date.now() - startTime;

    log.info('Subscription sync completed', {
      duration: `${duration}ms`,
      ...results,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription sync completed',
      duration: `${duration}ms`,
      results,
    });
  } catch (error) {
    log.error('Critical error in subscription sync cron job', { error });
    return NextResponse.json(
      {
        error: 'Subscription sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Map PayPal status to our internal status
 */
function mapPayPalStatus(paypalStatus: string): string {
  const statusMap: Record<string, string> = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    APPROVAL_PENDING: 'pending',
    APPROVED: 'active',
  };

  return statusMap[paypalStatus] || 'active';
}