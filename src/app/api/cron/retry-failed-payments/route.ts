// Sprint 5 Phase 2: Retry Failed Payments Cron Job
// Runs daily at 04:00 UTC to retry failed PayPal payments

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

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

    log.info('Starting failed payment retry process');

    // Get subscriptions with failed payments (past_due status)
    const { data: failedSubscriptions, error: fetchError } = await supabase
      .from('subscription')
      .select('*')
      .eq('status', 'past_due')
      .not('paypal_subscription_id', 'is', null);

    if (fetchError) {
      log.error('Error fetching failed subscriptions', { error: fetchError });
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    log.info(`Found ${failedSubscriptions?.length || 0} subscriptions with failed payments`);

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

    // Track retry results
    const results = {
      attempted: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each failed subscription
    for (const subscription of failedSubscriptions || []) {
      try {
        results.attempted++;

        // Check grace period (7 days)
        const gracePeriodEnd = new Date(subscription.updated_at);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

        if (new Date() > gracePeriodEnd) {
          log.info('Grace period expired, skipping retry', {
            subscriptionId: subscription.id,
            userId: subscription.user_id,
          });
          continue;
        }

        // Retry payment collection via PayPal API
        const retryResponse = await fetch(
          `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscription.paypal_subscription_id}/capture`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              note: 'Automatic retry for failed payment',
              amount: {
                currency_code: 'USD',
                value: subscription.price_amount,
              },
            }),
          }
        );

        if (retryResponse.ok) {
          // Payment successful - update subscription status
          await supabase
            .from('subscription')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscription.id);

          // Send success notification
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: subscription.user_id, // Will be resolved to email in email service
                subject: 'Payment Successful - Subscription Reactivated',
                template: 'payment-success',
                data: {
                  plan: subscription.plan,
                  amount: subscription.price_amount,
                },
              }),
            });
          } catch (emailError) {
            log.error('Failed to send payment success email', { error: emailError });
          }

          results.successful++;
          log.info('Payment retry successful', {
            subscriptionId: subscription.id,
            userId: subscription.user_id,
          });
        } else {
          // Payment failed
          results.failed++;

          const errorData = await retryResponse.json().catch(() => ({}));
          log.warn('Payment retry failed', {
            subscriptionId: subscription.id,
            userId: subscription.user_id,
            error: errorData,
          });

          results.errors.push(
            `Subscription ${subscription.id}: ${errorData.message || 'Payment failed'}`
          );

          // Check if we should send a warning email
          const daysSinceFailed = Math.floor(
            (Date.now() - new Date(subscription.updated_at).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceFailed === 3 || daysSinceFailed === 6) {
            // Send warning email on day 3 and day 6
            try {
              await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: subscription.user_id,
                  subject: `Payment Failed - ${7 - daysSinceFailed} days until downgrade`,
                  template: 'payment-warning',
                  data: {
                    plan: subscription.plan,
                    daysRemaining: 7 - daysSinceFailed,
                    amount: subscription.price_amount,
                  },
                }),
              });
            } catch (emailError) {
              log.error('Failed to send payment warning email', { error: emailError });
            }
          }
        }
      } catch (error) {
        log.error('Error processing subscription retry', {
          error,
          subscriptionId: subscription.id,
        });
        results.errors.push(`Subscription ${subscription.id}: ${error}`);
      }
    }

    const duration = Date.now() - startTime;

    log.info('Failed payment retry completed', {
      duration: `${duration}ms`,
      ...results,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment retry process completed',
      duration: `${duration}ms`,
      results,
    });
  } catch (error) {
    log.error('Critical error in payment retry cron job', { error });
    return NextResponse.json(
      {
        error: 'Payment retry failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}