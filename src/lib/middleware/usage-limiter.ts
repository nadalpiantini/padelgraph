// Sprint 5 Phase 2: Usage Limiter Middleware
// Enforces feature usage limits based on subscription plan

import { createClient } from '@/lib/supabase/server';
import { getPlanLimits, logFeatureUsage } from '@/lib/services/subscriptions';
import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';

export type FeatureType = 'tournament' | 'auto_match' | 'recommendation' | 'travel_plan';

interface UsageCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  plan: string;
  message?: string;
}

interface UsageError {
  error: string;
  code: 'USAGE_LIMIT_EXCEEDED' | 'AUTHENTICATION_REQUIRED' | 'SUBSCRIPTION_ERROR';
  message: string;
  current_usage?: number;
  limit?: number;
  upgrade_url?: string;
  plan?: string;
}

/**
 * Check if user has access to a specific feature based on their subscription
 */
export async function checkFeatureAccess(
  userId: string,
  feature: FeatureType
): Promise<UsageCheckResult> {
  try {
    const supabase = await createClient();

    // Get user's current subscription
    const { data: subscription } = await supabase
      .from('subscription')
      .select('plan, status')
      .eq('user_id', userId)
      .single();

    const plan = subscription?.plan || 'free';
    const status = subscription?.status || 'active';

    // Check if subscription is active
    if (status !== 'active' && status !== 'trialing') {
      log.warn('Subscription not active', { userId, status });
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        plan,
        message: 'Subscription is not active',
      };
    }

    // Get plan limits
    const limits = getPlanLimits(plan);

    // Check if feature has a limit
    const featureLimits = {
      tournament: limits.tournaments,
      auto_match: limits.autoMatch,
      recommendation: limits.recommendations,
      travel_plan: limits.travelPlans,
    };

    const limit = featureLimits[feature];

    // Unlimited access
    if (limit === 'unlimited' || limit === -1) {
      return {
        allowed: true,
        remaining: -1,
        limit: -1,
        plan,
      };
    }

    // Get current period dates
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Count usage in current period
    const { data: usageLogs, error } = await supabase
      .from('usage_log')
      .select('id')
      .eq('user_id', userId)
      .eq('feature', feature)
      .gte('timestamp', periodStart.toISOString())
      .lte('timestamp', periodEnd.toISOString());

    if (error) {
      log.error('Error fetching usage logs', { error, userId, feature });
      throw error;
    }

    const currentUsage = usageLogs?.length || 0;
    const numericLimit = limit as number; // We know it's a number at this point
    const remaining = numericLimit - currentUsage;

    return {
      allowed: currentUsage < numericLimit,
      remaining: Math.max(0, remaining),
      limit: numericLimit,
      plan,
      message: remaining <= 0 ? `You've reached your ${feature} limit for this month` : undefined,
    };
  } catch (error) {
    log.error('Error checking feature access', { error, userId, feature });
    throw error;
  }
}

/**
 * Middleware to enforce usage limits on API routes
 */
export async function enforceUsageLimit(
  userId: string | null,
  feature: FeatureType,
  adminOverride = false
): Promise<NextResponse | null> {
  // Check authentication
  if (!userId) {
    return NextResponse.json(
      {
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
        message: 'You must be logged in to access this feature',
      } as UsageError,
      { status: 401 }
    );
  }

  // Admin bypass
  if (adminOverride) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('user_profile')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'admin') {
      log.info('Admin override for usage limit', { userId, feature });
      return null; // Allow access
    }
  }

  try {
    const accessResult = await checkFeatureAccess(userId, feature);

    if (!accessResult.allowed) {
      const errorResponse: UsageError = {
        error: 'Usage limit exceeded',
        code: 'USAGE_LIMIT_EXCEEDED',
        message: accessResult.message || `You've reached your limit of ${accessResult.limit} ${feature}s for the ${accessResult.plan} plan`,
        current_usage: accessResult.limit - accessResult.remaining,
        limit: accessResult.limit,
        upgrade_url: '/pricing',
        plan: accessResult.plan,
      };

      log.warn('Usage limit exceeded', { userId, feature, ...accessResult });

      return NextResponse.json(errorResponse, { status: 403 });
    }

    // Access allowed
    return null;
  } catch (error) {
    log.error('Error enforcing usage limit', { error, userId, feature });

    return NextResponse.json(
      {
        error: 'Subscription check failed',
        code: 'SUBSCRIPTION_ERROR',
        message: 'Unable to verify your subscription status',
      } as UsageError,
      { status: 500 }
    );
  }
}

/**
 * Log successful feature usage
 */
export async function recordFeatureUsage(
  userId: string,
  feature: FeatureType,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await logFeatureUsage(userId, feature, action, metadata);
    log.info('Feature usage recorded', { userId, feature, action });
  } catch (error) {
    // Don't fail the request if logging fails
    log.error('Failed to record feature usage', { error, userId, feature, action });
  }
}

/**
 * Get usage statistics for a user
 */
export async function getUserUsageStats(userId: string): Promise<{
  tournaments: { used: number; limit: number };
  auto_matches: { used: number; limit: number };
  recommendations: { used: number; limit: number };
  travel_plans: { used: number; limit: number };
  plan: string;
  period: { start: Date; end: Date };
}> {
  const supabase = await createClient();

  // Get subscription plan
  const { data: subscription } = await supabase
    .from('subscription')
    .select('plan')
    .eq('user_id', userId)
    .single();

  const plan = subscription?.plan || 'free';
  const limits = getPlanLimits(plan);

  // Get current period
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get usage counts
  const { data: usageCounts } = await supabase
    .from('usage_log')
    .select('feature')
    .eq('user_id', userId)
    .gte('timestamp', periodStart.toISOString())
    .lte('timestamp', periodEnd.toISOString());

  // Count by feature
  const featureCounts: Record<string, number> = {
    tournament: 0,
    auto_match: 0,
    recommendation: 0,
    travel_plan: 0,
  };

  usageCounts?.forEach((log) => {
    if (log.feature in featureCounts) {
      featureCounts[log.feature]++;
    }
  });

  return {
    tournaments: { 
      used: featureCounts.tournament, 
      limit: limits.tournaments === 'unlimited' ? -1 : limits.tournaments 
    },
    auto_matches: { 
      used: featureCounts.auto_match, 
      limit: limits.autoMatch === 'unlimited' ? -1 : limits.autoMatch 
    },
    recommendations: { 
      used: featureCounts.recommendation, 
      limit: limits.recommendations === 'unlimited' ? -1 : limits.recommendations 
    },
    travel_plans: { 
      used: featureCounts.travel_plan, 
      limit: limits.travelPlans === 'unlimited' ? -1 : limits.travelPlans 
    },
    plan,
    period: { start: periodStart, end: periodEnd },
  };
}

/**
 * Helper to create error response for exceeded limits
 */
export function createUsageLimitError(
  feature: FeatureType,
  currentUsage: number,
  limit: number,
  plan: string
): NextResponse {
  const featureNames: Record<FeatureType, string> = {
    tournament: 'tournaments',
    auto_match: 'auto-matches',
    recommendation: 'recommendations',
    travel_plan: 'travel plans',
  };

  const upgradePlans: Record<string, string> = {
    free: 'Pro',
    pro: 'Premium',
    premium: 'Club',
    club: 'Club', // Already at max
  };

  const message = plan === 'club'
    ? `You've reached the maximum limit of ${limit} ${featureNames[feature]} for this month`
    : `You've reached your limit of ${limit} ${featureNames[feature]} for the ${plan} plan. Upgrade to ${upgradePlans[plan]} for more.`;

  return NextResponse.json(
    {
      error: 'Usage limit exceeded',
      code: 'USAGE_LIMIT_EXCEEDED',
      message,
      current_usage: currentUsage,
      limit,
      upgrade_url: plan === 'club' ? undefined : '/pricing',
      plan,
    } as UsageError,
    { status: 403 }
  );
}