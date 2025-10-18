/**
 * Usage Enforcement Middleware
 * Sprint 5 - FASE 1A: Consolidated usage limits system
 *
 * Consolidates:
 * - usage-limits.ts (tier-based limits, feature checks)
 * - usage-limiter.ts (API middleware, error handling)
 *
 * Enforces tier-based usage limits:
 * - FREE: Limited features (1 tournament, 5 matches, 10 recommendations)
 * - PRO: Unlimited tournaments/matches, 100 recommendations
 * - DUAL: All PRO features + 2 users
 * - PREMIUM: All DUAL features + API access
 * - CLUB: Unlimited everything
 *
 * Last Updated: 2025-10-18
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface UsageLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  current?: number;
  error?: string;
}

type PlanTier = 'free' | 'pro' | 'dual' | 'premium' | 'club';

type FeatureType =
  | 'tournament_created'
  | 'team_created'
  | 'booking_created'
  | 'recommendation_created'
  | 'match_created'
  | 'auto_match';

// Legacy feature types (for backward compatibility)
type LegacyFeatureType = 'tournament' | 'team' | 'booking' | 'auto_match' | 'recommendation' | 'travel_plan';

/**
 * Custom error for usage limit exceeded
 */
export class UsageLimitError extends Error {
  public readonly code: string;
  public readonly upgradeUrl: string;
  public readonly currentUsage: number;
  public readonly limit: number;
  public readonly plan: string;

  constructor(
    feature: string,
    currentUsage: number,
    limit: number,
    plan: string
  ) {
    const featureNames: Record<string, string> = {
      tournament: 'tournaments',
      tournament_created: 'tournaments',
      match_created: 'matches',
      auto_match: 'auto-matches',
      recommendation: 'recommendations',
      recommendation_created: 'recommendations',
      travel_plan: 'travel plans',
      team: 'teams',
      team_created: 'teams',
      booking: 'bookings',
      booking_created: 'bookings',
    };

    const featureName = featureNames[feature] || feature;
    super(
      `You've reached your limit of ${limit} ${featureName} for the ${plan} plan. Upgrade to continue.`
    );

    this.name = 'UsageLimitError';
    this.code = 'USAGE_LIMIT_EXCEEDED';
    this.upgradeUrl = '/pricing';
    this.currentUsage = currentUsage;
    this.limit = limit;
    this.plan = plan;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      upgrade_url: this.upgradeUrl,
      current_usage: this.currentUsage,
      limit: this.limit,
      plan: this.plan,
    };
  }
}

// ============================================
// TIER-BASED LIMITS CONFIGURATION
// ============================================

const TIER_LIMITS = {
  free: {
    tournaments: 1,
    matches: 5,
    teams: 5,
    bookings: 2,
    recommendations: 10,
    auto_matches: 3,
  },
  pro: {
    tournaments: -1, // unlimited
    matches: -1,
    teams: 20,
    bookings: 10,
    recommendations: -1,
    auto_matches: -1,
  },
  dual: {
    tournaments: -1, // unlimited
    matches: -1,
    teams: -1,
    bookings: -1,
    recommendations: -1,
    auto_matches: -1,
    users: 2, // special limit for dual plan
  },
  premium: {
    tournaments: -1, // unlimited
    matches: -1,
    teams: -1,
    bookings: -1,
    recommendations: -1,
    auto_matches: -1,
    api_access: true, // special flag
  },
  club: {
    tournaments: -1, // unlimited
    matches: -1,
    teams: -1,
    bookings: -1,
    recommendations: -1,
    auto_matches: -1,
  },
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

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
 * Check if user has admin override (admins bypass usage limits)
 */
export async function hasAdminOverride(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from('user_profile')
    .select('role')
    .eq('user_id', userId)
    .single();

  return user?.role === 'admin';
}

/**
 * Map legacy feature names to new feature types
 */
function mapFeatureType(feature: LegacyFeatureType | FeatureType): FeatureType {
  const featureMap: Record<string, FeatureType> = {
    tournament: 'tournament_created',
    team: 'team_created',
    booking: 'booking_created',
    recommendation: 'recommendation_created',
    auto_match: 'auto_match',
    travel_plan: 'recommendation_created', // map travel_plan to recommendations
  };

  return (featureMap[feature] as FeatureType) || (feature as FeatureType);
}

// ============================================
// CORE LIMIT CHECKING FUNCTIONS
// ============================================

/**
 * Check if user can use a feature based on their tier limits
 */
export async function checkUsageLimit(
  userId: string,
  feature: FeatureType | LegacyFeatureType
): Promise<UsageLimitResult> {
  try {
    const mappedFeature = mapFeatureType(feature as LegacyFeatureType);

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
    const tierLimits = TIER_LIMITS[subscription.plan] || TIER_LIMITS.free;

    // Map feature names to limit keys
    const featureToLimitKey: Record<string, keyof typeof tierLimits> = {
      tournament_created: 'tournaments',
      match_created: 'matches',
      team_created: 'teams',
      booking_created: 'bookings',
      recommendation_created: 'recommendations',
      auto_match: 'auto_matches',
    };

    const limitKey = featureToLimitKey[mappedFeature];
    const limit = tierLimits[limitKey] as number;

    // Unlimited access
    if (limit === -1) {
      return {
        allowed: true,
        remaining: -1,
        limit: -1,
      };
    }

    // Get current usage
    const currentUsage = await getUsageCount(userId, mappedFeature);

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

// ============================================
// FEATURE-SPECIFIC CONVENIENCE FUNCTIONS
// ============================================

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
 * Check if user can create a match
 */
export async function canCreateMatch(
  userId: string
): Promise<UsageLimitResult> {
  return checkUsageLimit(userId, 'match_created');
}

/**
 * Check if user can trigger auto-match
 */
export async function canTriggerAutoMatch(
  userId: string
): Promise<UsageLimitResult> {
  return checkUsageLimit(userId, 'auto_match');
}

// ============================================
// USAGE LOGGING
// ============================================

/**
 * Increment usage counter after successful creation
 */
export async function incrementUsage(
  userId: string,
  feature: FeatureType | LegacyFeatureType,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();
  const { start, end } = getCurrentPeriod();
  const mappedFeature = mapFeatureType(feature as LegacyFeatureType);

  await supabase.from('usage_log').insert({
    user_id: userId,
    feature: mappedFeature,
    action: 'create',
    timestamp: new Date().toISOString(),
    metadata: metadata || null,
    period_start: start.toISOString().split('T')[0],
    period_end: end.toISOString().split('T')[0],
  });
}

/**
 * Record feature usage (alias for incrementUsage - backward compatibility)
 */
export async function recordFeatureUsage(
  userId: string,
  feature: FeatureType | LegacyFeatureType,
  _action: string = 'create',
  metadata?: Record<string, unknown>
): Promise<void> {
  await incrementUsage(userId, feature, metadata);
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

// ============================================
// API MIDDLEWARE FUNCTIONS
// ============================================

/**
 * Enforce usage limit and return error Response if limit exceeded
 * @param userId User ID
 * @param feature Feature to check
 * @param adminBypass If true, admins bypass limits (default: false)
 * @returns NextResponse with error if limit exceeded, null if allowed
 */
export async function enforceUsageLimit(
  userId: string,
  feature: FeatureType | LegacyFeatureType,
  adminBypass: boolean = false
): Promise<NextResponse | null> {
  // Check admin bypass if enabled
  if (adminBypass) {
    const isAdmin = await hasAdminOverride(userId);
    if (isAdmin) {
      console.log(`[Usage Enforcement] Admin bypass for user ${userId}, feature ${feature}`);
      return null;
    }
  }

  // Check usage limit
  const limitCheck = await checkUsageLimit(userId, feature);
  const { allowed, remaining, limit } = limitCheck;

  // Calculate current usage
  const currentUsage: number = ('current' in limitCheck && typeof limitCheck.current === 'number')
    ? limitCheck.current
    : (limit - remaining);

  if (!allowed) {
    // Get user's subscription to include plan name in error
    const subscription = await getUserSubscription(userId);
    const plan = subscription?.plan || 'free';

    const error = new UsageLimitError(
      feature as string,
      currentUsage,
      limit,
      plan
    );

    // Return NextResponse for API route compatibility
    return NextResponse.json(error.toJSON(), { status: 403 });
  }

  return null;
}

/**
 * Enforce usage limit with admin bypass enabled
 * @throws {UsageLimitError} If usage limit is exceeded and user is not admin
 */
export async function enforceUsageLimitWithAdminBypass(
  userId: string,
  feature: FeatureType | LegacyFeatureType
): Promise<NextResponse | null> {
  return enforceUsageLimit(userId, feature, true);
}

/**
 * Middleware wrapper for API routes
 * Checks usage limit and logs usage after successful operation
 */
export async function withUsageLimit<T>(
  userId: string,
  feature: FeatureType | LegacyFeatureType,
  action: () => Promise<T>
): Promise<T> {
  // Check limit
  const limitCheck = await checkUsageLimit(userId, feature);

  if (!limitCheck.allowed) {
    const subscription = await getUserSubscription(userId);
    const plan = subscription?.plan || 'free';

    throw new UsageLimitError(
      feature as string,
      limitCheck.current || 0,
      limitCheck.limit,
      plan
    );
  }

  // Execute action
  const result = await action();

  // Increment usage counter
  await incrementUsage(userId, feature);

  return result;
}

// ============================================
// USAGE SUMMARY & DASHBOARD
// ============================================

/**
 * Get usage summary for user's dashboard
 */
export async function getUsageSummary(userId: string): Promise<{
  tournaments: UsageLimitResult;
  matches: UsageLimitResult;
  teams: UsageLimitResult;
  bookings: UsageLimitResult;
  recommendations: UsageLimitResult;
  auto_matches: UsageLimitResult;
  plan: string;
  period: { start: Date; end: Date };
}> {
  const [tournaments, matches, teams, bookings, recommendations, auto_matches, subscription] = await Promise.all([
    canCreateTournament(userId),
    canCreateMatch(userId),
    canCreateTeam(userId),
    canCreateBooking(userId),
    canCreateRecommendation(userId),
    canTriggerAutoMatch(userId),
    getUserSubscription(userId),
  ]);

  const period = getCurrentPeriod();

  return {
    tournaments,
    matches,
    teams,
    bookings,
    recommendations,
    auto_matches,
    plan: subscription.plan,
    period,
  };
}
