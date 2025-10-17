// Sprint 5 Phase 2: Reset Usage Cron Job
// Runs monthly on the 1st at 00:00 UTC to reset usage counters

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max

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

    log.info('Starting monthly usage reset');

    // Get the previous month's date range
    const now = new Date();
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Archive previous month's usage logs (optional - for analytics)
    const { data: usageLogs, error: fetchError } = await supabase
      .from('usage_log')
      .select('*')
      .gte('timestamp', previousMonthStart.toISOString())
      .lte('timestamp', previousMonthEnd.toISOString());

    if (fetchError) {
      log.error('Error fetching usage logs', { error: fetchError });
    }

    // Track reset results
    const results = {
      users_reset: 0,
      logs_archived: usageLogs?.length || 0,
      notifications_sent: 0,
      errors: [] as string[],
    };

    // Get all active users with subscriptions
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('subscription')
      .select('user_id, plan, status')
      .in('status', ['active', 'trialing']);

    if (subscriptionError) {
      log.error('Error fetching subscriptions', { error: subscriptionError });
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    // Process each user
    for (const subscription of subscriptions || []) {
      try {
        // Log the reset event
        const { error: logError } = await supabase
          .from('usage_log')
          .insert({
            user_id: subscription.user_id,
            feature: 'system',
            action: 'monthly_reset',
            metadata: {
              plan: subscription.plan,
              previous_month: previousMonthStart.toISOString().slice(0, 7),
            },
          });

        if (logError) {
          log.error('Error logging reset for user', {
            error: logError,
            userId: subscription.user_id,
          });
          results.errors.push(`User ${subscription.user_id}: Failed to log reset`);
        }

        results.users_reset++;

        // Send monthly summary email (for pro/premium/club users)
        if (subscription.plan !== 'free') {
          try {
            // Calculate usage summary for the previous month
            const { data: monthlyUsage } = await supabase
              .from('usage_log')
              .select('feature')
              .eq('user_id', subscription.user_id)
              .gte('timestamp', previousMonthStart.toISOString())
              .lte('timestamp', previousMonthEnd.toISOString());

            const usageSummary = {
              tournaments: monthlyUsage?.filter(u => u.feature === 'tournament').length || 0,
              auto_matches: monthlyUsage?.filter(u => u.feature === 'auto_match').length || 0,
              recommendations: monthlyUsage?.filter(u => u.feature === 'recommendation').length || 0,
              travel_plans: monthlyUsage?.filter(u => u.feature === 'travel_plan').length || 0,
            };

            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: subscription.user_id,
                subject: 'Your Monthly PadelGraph Summary',
                template: 'monthly-summary',
                data: {
                  plan: subscription.plan,
                  month: previousMonthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                  usage: usageSummary,
                },
              }),
            });

            results.notifications_sent++;
          } catch (emailError) {
            log.error('Failed to send monthly summary email', {
              error: emailError,
              userId: subscription.user_id,
            });
          }
        }
      } catch (error) {
        log.error('Error processing user reset', {
          error,
          userId: subscription.user_id,
        });
        results.errors.push(`User ${subscription.user_id}: ${error}`);
      }
    }

    // Clean up old usage logs (keep only last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { error: cleanupError } = await supabase
      .from('usage_log')
      .delete()
      .lt('timestamp', threeMonthsAgo.toISOString());

    if (cleanupError) {
      log.error('Error cleaning up old usage logs', { error: cleanupError });
      results.errors.push('Failed to clean up old usage logs');
    }

    const duration = Date.now() - startTime;

    log.info('Monthly usage reset completed', {
      duration: `${duration}ms`,
      ...results,
    });

    return NextResponse.json({
      success: true,
      message: 'Monthly usage reset completed',
      duration: `${duration}ms`,
      results,
    });
  } catch (error) {
    log.error('Critical error in usage reset cron job', { error });
    return NextResponse.json(
      {
        error: 'Usage reset failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}