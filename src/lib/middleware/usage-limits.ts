/**
 * Usage Limits Middleware
 * Sprint 5 Phase 2 - Task #6
 *
 * Enforces tier-based usage limits:
 * - FREE: 10 tournaments, 5 teams, 2 bookings, 10 recommendations
 * - PRO: 50 tournaments, 20 teams, 10 bookings, 100 recommendations
 * - DUAL/PREMIUM/CLUB: unlimited
 */

import { createClient } from '@/lib/supabase/server';

export interface UsageLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  current?: number;
  error?: string;
}

// Tier-based limits configuration
const USAGE_LIMITS = {
  free: {
    tournaments: 10,
    teams: 5,
    bookings: 2,
    recommendations: 10, // 10 recommendations per month
  },
  pro: {
    tournaments: 50,
    teams: 20,
    bookings: 10,
    recommendations: 100, // 100 recommendations per month
  },
  dual: {
    tournaments: -1, // unlimited
    teams: -1,
    bookings: -1,
    recommendations: -1, // unlimited
  },
  premium: {
    tournaments: -1, // unlimited
    teams: -1,
    bookings: -1,
    recommendations: -1, // unlimited
  },
  club: {
    tournaments: -1, // unlimited
    teams: -1,
    bookings: -1,
    recommendations: -1, // unlimited
  },
} as const;

type PlanTier = keyof typeof USAGE_LIMITS;
type FeatureType =
  | 'tournament_created'
  | 'team_created'
  | 'booking_created'
  | 'recommendation_created';

/**
 * Get current month period for usage tracking
 */
function getCurrentPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: periodStart, end: periodEnd };
}

/**
 * Get user's current subscription
 */
async function getUserSubscription(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subscription')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    // Default to FREE tier if no subscription found
    return {
      plan: 'free' as PlanTier,
      status: 'active',
    };
  }

  return {
    plan: data.plan as PlanTier,
    status: data.status as string,
  };
}

/**
 * Get current usage count for a feature in the current period
 */
async function getUsageCount(
  userId: string,
  feature: FeatureType
): Promise<number> {
  const supabase = await createClient();
  const { start } = getCurrentPeriod();

  // Use select/count pattern that's easier to mock in tests
  const result = await supabase
    .from('usage_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('timestamp', start.toISOString());

  if (result.error) {
    console.error('Error fetching usage count:', result.error);
    throw new Error('Failed to fetch usage count');
  }

  return result.count || 0;
}

/**
 * Check if user can use a feature based on their tier limits
 */
export async function checkUsageLimit(
  userId: string,
  feature: FeatureType
): Promise<UsageLimitResult> {
  try {
    // Get user subscription
    const subscription = await getUserSubscription(userId);

    // Check if subscription is active
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        error: `Subscription status is ${subscription.status}. Please update your payment method.`,
      };
    }

    // Get tier limits
    const tierLimits = USAGE_LIMITS[subscription.plan] || USAGE_LIMITS.free;

    // Map feature names to limit keys
    const featureToLimitKey: Record<string, keyof typeof tierLimits> = {
      tournament_created: 'tournaments',
      team_created: 'teams',
      booking_created: 'bookings',
      recommendation_created: 'recommendations',
    };

    const limitKey = featureToLimitKey[feature];
    const limit = tierLimits[limitKey];

    // Unlimited access
    if (limit === -1) {
      return {
        allowed: true,
        remaining: -1,
        limit: -1,
      };
    }

    // Get current usage
    const currentUsage = await getUsageCount(userId, feature);

    // Check if under limit
    const allowed = currentUsage < limit;
    const remaining = Math.max(0, limit - currentUsage);

    return {
      allowed,
      remaining,
      limit,
      current: currentUsage,
    };
  } catch (error) {
    console.error('Error checking usage limit:', error);
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if user can create a tournament
 */
export async function canCreateTournament(
  userId: string
): Promise<UsageLimitResult> {
  return checkUsageLimit(userId, 'tournament_created');
}

/**
 * Check if user can create a team
 */
export async function canCreateTeam(
  userId: string
): Promise<UsageLimitResult> {
  return checkUsageLimit(userId, 'team_created');
}

/**
 * Check if user can create a booking
 */
export async function canCreateBooking(
  userId: string
): Promise<UsageLimitResult> {
  return checkUsageLimit(userId, 'booking_created');
}

/**
 * Check if user can generate recommendations
 */
export async function canCreateRecommendation(
  userId: string
): Promise<UsageLimitResult> {
  return checkUsageLimit(userId, 'recommendation_created');
}

/**
 * Increment usage counter after successful creation
 */
export async function incrementUsage(
  userId: string,
  feature: FeatureType,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();
  const { start, end } = getCurrentPeriod();

  await supabase.from('usage_log').insert({
    user_id: userId,
    feature,
    action: 'create',
    timestamp: new Date().toISOString(),
    metadata: metadata || null,
    period_start: start.toISOString().split('T')[0],
    period_end: end.toISOString().split('T')[0],
  });
}

/**
 * Reset monthly usage (called by cron job at start of billing cycle)
 * Note: This doesn't delete records, just ensures only current period is counted
 */
export async function resetMonthlyUsage(
  _userId: string
): Promise<{ success: boolean }> {
  // Monthly reset is automatic because we filter by timestamp >= period_start
  // This function exists for compatibility with cron jobs
  return { success: true };
}

/**
 * Middleware wrapper for API routes
 * Usage: await withUsageLimit(userId, 'tournament_created', async () => {...})
 */
export async function withUsageLimit<T>(
  userId: string,
  feature: FeatureType,
  action: () => Promise<T>
): Promise<T> {
  // Check limit
  const limitCheck = await checkUsageLimit(userId, feature);

  if (!limitCheck.allowed) {
    throw new Error(
      limitCheck.error ||
        `Usage limit exceeded. You have used ${limitCheck.limit}/${limitCheck.limit} ${feature.replace('_created', '')}s this month.`
    );
  }

  // Execute action
  const result = await action();

  // Increment usage counter
  await incrementUsage(userId, feature);

  return result;
}

/**
 * Get usage summary for user's dashboard
 */
export async function getUsageSummary(userId: string): Promise<{
  tournaments: UsageLimitResult;
  teams: UsageLimitResult;
  bookings: UsageLimitResult;
  recommendations: UsageLimitResult;
}> {
  const [tournaments, teams, bookings, recommendations] = await Promise.all([
    canCreateTournament(userId),
    canCreateTeam(userId),
    canCreateBooking(userId),
    canCreateRecommendation(userId),
  ]);

  return {
    tournaments,
    teams,
    bookings,
    recommendations,
  };
}
