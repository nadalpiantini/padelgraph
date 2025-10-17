// Sprint 5 Phase 3: Usage Stats API
// GET /api/usage/stats
// Returns current usage statistics for authenticated user

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserSubscription, getPlanLimits } from '@/lib/services/subscriptions';

interface UsageStats {
  tournaments: { used: number; limit: number | 'unlimited' };
  auto_matches: { used: number; limit: number | 'unlimited' };
  recommendations: { used: number; limit: number | 'unlimited' };
  travel_plans: { used: number; limit: number | 'unlimited' };
  plan: string;
  period: { start: string; end: string };
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's subscription
    const subscription = await getUserSubscription(user.id);

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Get plan limits
    const limits = getPlanLimits(subscription.plan);

    // Calculate current billing period
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    if (subscription.current_period_start && subscription.current_period_end) {
      // Use subscription period for paid plans
      periodStart = new Date(subscription.current_period_start);
      periodEnd = new Date(subscription.current_period_end);
    } else {
      // Use calendar month for free plan
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    // Get usage counts for current period
    const { data: usageData, error: usageError } = await supabase
      .from('usage_log')
      .select('feature')
      .eq('user_id', user.id)
      .gte('timestamp', periodStart.toISOString())
      .lte('timestamp', periodEnd.toISOString());

    if (usageError) {
      console.error('Error fetching usage data:', usageError);
      return NextResponse.json(
        { error: 'Failed to fetch usage data' },
        { status: 500 }
      );
    }

    // Count usage by feature
    const usageCounts = {
      tournament: 0,
      auto_match: 0,
      recommendation: 0,
      travel_plan: 0,
    };

    usageData?.forEach((log) => {
      const feature = log.feature as keyof typeof usageCounts;
      if (feature in usageCounts) {
        usageCounts[feature]++;
      }
    });

    // Build response with usage stats
    const stats: UsageStats = {
      tournaments: {
        used: usageCounts.tournament,
        limit: limits.tournaments,
      },
      auto_matches: {
        used: usageCounts.auto_match,
        limit: limits.autoMatch,
      },
      recommendations: {
        used: usageCounts.recommendation,
        limit: limits.recommendations,
      },
      travel_plans: {
        used: usageCounts.travel_plan,
        limit: limits.travelPlans,
      },
      plan: subscription.plan,
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in usage stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
