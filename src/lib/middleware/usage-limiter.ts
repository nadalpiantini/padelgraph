// Sprint 5 Phase 3: Usage Limit Enforcement Middleware
// Prevents users from exceeding their plan limits

import { checkUsageLimit, logFeatureUsage, getUserSubscription } from '@/lib/services/subscriptions';
import { NextResponse } from 'next/server';

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
      auto_match: 'auto-matches',
      recommendation: 'recommendations',
      travel_plan: 'travel plans',
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

/**
 * Check if user has admin override
 * Admins bypass usage limits
 */
export async function hasAdminOverride(userId: string): Promise<boolean> {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: user } = await supabase
    .from('user_profile')
    .select('role')
    .eq('user_id', userId)
    .single();

  return user?.role === 'admin';
}

/**
 * Check if user can use a feature and return error Response if limit exceeded
 * @param userId User ID
 * @param feature Feature to check
 * @param adminBypass If true, admins bypass limits (default: false for backward compatibility)
 * @returns NextResponse with error if limit exceeded, null if allowed
 */
export async function enforceUsageLimit(
  userId: string,
  feature: 'tournament' | 'auto_match' | 'recommendation' | 'travel_plan',
  adminBypass: boolean = false
): Promise<NextResponse | null> {
  // Check admin bypass if enabled
  if (adminBypass) {
    const isAdmin = await hasAdminOverride(userId);
    if (isAdmin) {
      console.log(`[Usage Limiter] Admin bypass for user ${userId}, feature ${feature}`);
      return null;
    }
  }

  const { allowed, remaining, limit } = await checkUsageLimit(userId, feature);

  if (!allowed) {
    // Get user's subscription to include plan name in error
    const subscription = await getUserSubscription(userId);
    const plan = subscription?.plan || 'free';

    const error = new UsageLimitError(
      feature,
      limit - remaining,
      limit,
      plan
    );

    // Return NextResponse for API route compatibility
    return NextResponse.json(error.toJSON(), { status: 403 });
  }

  return null;
}

/**
 * Middleware wrapper for API routes
 * Checks usage limit and logs usage after successful operation
 */
export async function withUsageLimit(
  userId: string,
  feature: 'tournament' | 'auto_match' | 'recommendation' | 'travel_plan',
  operation: () => Promise<unknown>,
  metadata?: Record<string, unknown>
): Promise<unknown> {
  // Check limit before operation
  const limitResponse = await enforceUsageLimit(userId, feature);
  if (limitResponse) {
    return limitResponse;
  }

  // Execute operation
  const result = await operation();

  // Log usage after successful operation
  await logFeatureUsage(userId, feature, 'create', metadata);

  return result;
}

/**
 * Enforce usage limit with admin bypass
 * @throws {UsageLimitError} If usage limit is exceeded and user is not admin
 */
export async function enforceUsageLimitWithAdminBypass(
  userId: string,
  feature: 'tournament' | 'auto_match' | 'recommendation' | 'travel_plan'
): Promise<NextResponse | null> {
  return enforceUsageLimit(userId, feature, true);
}

/**
 * Record feature usage (wrapper for logFeatureUsage)
 * Exported for backward compatibility with existing code
 */
export async function recordFeatureUsage(
  userId: string,
  feature: 'tournament' | 'auto_match' | 'recommendation' | 'travel_plan',
  action: string = 'create',
  metadata?: Record<string, unknown>
): Promise<void> {
  await logFeatureUsage(userId, feature, action, metadata);
}
