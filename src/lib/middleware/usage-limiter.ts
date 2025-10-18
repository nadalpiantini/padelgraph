// Sprint 5 Phase 3: Usage Limit Enforcement Middleware
// Prevents users from exceeding their plan limits
// UPDATED: Now uses the new usage-limits.ts system (Task #6-7)

import { NextResponse } from 'next/server';
import {
  canCreateTournament,
  canCreateTeam,
  canCreateBooking,
  incrementUsage,
} from '@/lib/middleware/usage-limits';
import { getUserSubscription } from '@/lib/services/subscriptions';

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
  feature: 'tournament' | 'auto_match' | 'recommendation' | 'travel_plan' | 'team' | 'booking',
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

  // Map old feature names to new check functions
  let limitCheck;
  if (feature === 'tournament') {
    limitCheck = await canCreateTournament(userId);
  } else if (feature === 'team') {
    limitCheck = await canCreateTeam(userId);
  } else if (feature === 'booking') {
    limitCheck = await canCreateBooking(userId);
  } else {
    // For backward compatibility with old features (auto_match, recommendation, travel_plan)
    // These still use the old checkUsageLimit from subscriptions.ts
    const { checkUsageLimit } = await import('@/lib/services/subscriptions');
    limitCheck = await checkUsageLimit(userId, feature);
  }

  const { allowed, remaining, limit } = limitCheck;

  // Calculate current usage (explicit number type)
  const currentUsage: number = ('current' in limitCheck && typeof limitCheck.current === 'number')
    ? limitCheck.current
    : (limit - remaining);

  if (!allowed) {
    // Get user's subscription to include plan name in error
    const subscription = await getUserSubscription(userId);
    const plan = subscription?.plan || 'free';

    const error = new UsageLimitError(
      feature,
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
 * Middleware wrapper for API routes
 * Checks usage limit and logs usage after successful operation
 */
export async function withUsageLimit(
  userId: string,
  feature: 'tournament' | 'auto_match' | 'recommendation' | 'travel_plan' | 'team' | 'booking',
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
  await recordFeatureUsage(userId, feature, 'create', metadata);

  return result;
}

/**
 * Enforce usage limit with admin bypass
 * @throws {UsageLimitError} If usage limit is exceeded and user is not admin
 */
export async function enforceUsageLimitWithAdminBypass(
  userId: string,
  feature: 'tournament' | 'auto_match' | 'recommendation' | 'travel_plan' | 'team' | 'booking'
): Promise<NextResponse | null> {
  return enforceUsageLimit(userId, feature, true);
}

/**
 * Record feature usage (wrapper for incrementUsage from new system)
 * Exported for backward compatibility with existing code
 */
export async function recordFeatureUsage(
  userId: string,
  feature: 'tournament' | 'auto_match' | 'recommendation' | 'travel_plan' | 'team' | 'booking',
  action: string = 'create',
  metadata?: Record<string, unknown>
): Promise<void> {
  // Map old feature names to new feature types
  const featureMap: Record<string, 'tournament_created' | 'team_created' | 'booking_created'> = {
    tournament: 'tournament_created',
    team: 'team_created',
    booking: 'booking_created',
  };

  const newFeature = featureMap[feature];

  if (newFeature) {
    // Use new system
    await incrementUsage(userId, newFeature, metadata);
  } else {
    // For backward compatibility with old features (auto_match, recommendation, travel_plan)
    const { logFeatureUsage } = await import('@/lib/services/subscriptions');
    await logFeatureUsage(userId, feature, action, metadata);
  }
}
