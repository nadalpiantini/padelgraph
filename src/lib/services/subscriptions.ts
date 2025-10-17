// Sprint 5: Subscription Management Service
// PayPal subscription handling and usage limits

import { createClient } from '@/lib/supabase/server';

export interface Subscription {
  id: string;
  user_id: string;
  paypal_customer_id: string | null;
  paypal_subscription_id: string | null;
  paypal_plan_id: string | null;
  plan: 'free' | 'pro' | 'premium' | 'club';
  status: 'active' | 'cancelled' | 'suspended' | 'past_due' | 'trialing';
  current_period_start: Date | null;
  current_period_end: Date | null;
  trial_end: Date | null;
  cancel_at_period_end: boolean;
  canceled_at: Date | null;
  amount: number | null;
  currency: string;
  interval: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PlanLimits {
  tournaments: number | 'unlimited';
  autoMatch: number | 'unlimited';
  recommendations: number | 'unlimited';
  travelPlans: number | 'unlimited';
  analytics: boolean;
  achievements: boolean;
  leaderboards: boolean;
  prioritySupport?: boolean;
  adFree?: boolean;
  customBranding?: boolean;
  apiAccess?: boolean;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    tournaments: 2,
    autoMatch: 3,
    recommendations: 10,
    travelPlans: 1,
    analytics: false,
    achievements: true,
    leaderboards: true,
  },
  pro: {
    tournaments: 'unlimited',
    autoMatch: 20,
    recommendations: 100,
    travelPlans: 10,
    analytics: true,
    achievements: true,
    leaderboards: true,
    prioritySupport: true,
    adFree: true,
  },
  premium: {
    tournaments: 'unlimited',
    autoMatch: 'unlimited',
    recommendations: 'unlimited',
    travelPlans: 'unlimited',
    analytics: true,
    achievements: true,
    leaderboards: true,
    prioritySupport: true,
    adFree: true,
    customBranding: true,
    apiAccess: true,
  },
  club: {
    tournaments: 'unlimited',
    autoMatch: 'unlimited',
    recommendations: 'unlimited',
    travelPlans: 'unlimited',
    analytics: true,
    achievements: true,
    leaderboards: true,
    prioritySupport: true,
    adFree: true,
    customBranding: true,
    apiAccess: true,
  },
};

/**
 * Get user's subscription
 */
export async function getUserSubscription(
  userId: string
): Promise<Subscription | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subscription')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    // Return default free subscription
    return {
      id: 'default',
      user_id: userId,
      paypal_customer_id: null,
      paypal_subscription_id: null,
      paypal_plan_id: null,
      plan: 'free',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      trial_end: null,
      cancel_at_period_end: false,
      canceled_at: null,
      amount: null,
      currency: 'EUR',
      interval: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  return data as Subscription;
}

/**
 * Get plan limits for a subscription plan
 */
export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

/**
 * Check if user can use a feature based on usage limits
 */
export async function checkUsageLimit(
  userId: string,
  feature: 'tournament' | 'auto_match' | 'recommendation' | 'travel_plan'
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  const limits = getPlanLimits(subscription.plan);
  const featureMap: Record<string, keyof PlanLimits> = {
    tournament: 'tournaments',
    auto_match: 'autoMatch',
    recommendation: 'recommendations',
    travel_plan: 'travelPlans',
  };

  const limitKey = featureMap[feature];
  const limit = limits[limitKey];

  // Unlimited access
  if (limit === 'unlimited' || typeof limit !== 'number') {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  // Get usage for current period
  const usage = await getFeatureUsage(userId, feature, 'current_period');

  const allowed = usage < limit;
  const remaining = Math.max(0, limit - usage);

  return { allowed, remaining, limit };
}

/**
 * Get feature usage for a period
 */
async function getFeatureUsage(
  userId: string,
  feature: string,
  period: 'current_period' | 'last_30_days'
): Promise<number> {
  const supabase = await createClient();

  const now = new Date();
  let startDate: Date;

  if (period === 'current_period') {
    // Current billing period (monthly)
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    // Last 30 days
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const { data, error } = await supabase
    .from('usage_log')
    .select('id')
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('timestamp', startDate.toISOString());

  if (error) {
    console.error('Error fetching usage:', error);
    return 0;
  }

  return data.length;
}

/**
 * Log feature usage
 */
export async function logFeatureUsage(
  userId: string,
  feature: string,
  action: string = 'use',
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  await supabase.from('usage_log').insert({
    user_id: userId,
    feature,
    action,
    timestamp: now.toISOString(),
    metadata,
    period_start: periodStart.toISOString().split('T')[0],
    period_end: periodEnd.toISOString().split('T')[0],
  });
}

/**
 * Create or update subscription from PayPal webhook
 */
export async function syncPayPalSubscription(
  userId: string,
  paypalData: {
    subscription_id: string;
    plan_id: string;
    status: string;
    billing_info: {
      next_billing_time: string;
      last_payment: { amount: { value: string; currency_code: string } };
    };
  }
): Promise<void> {
  const supabase = await createClient();

  // Map PayPal plan ID to internal plan
  const planMap: Record<string, string> = {
    'P-PRO': 'pro',
    'P-PREMIUM': 'premium',
    'P-CLUB': 'club',
  };

  const plan = planMap[paypalData.plan_id] || 'pro';

  // Map PayPal status to internal status
  const statusMap: Record<string, string> = {
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
    SUSPENDED: 'suspended',
    APPROVAL_PENDING: 'trialing',
  };

  const status = statusMap[paypalData.status] || 'active';

  await supabase.from('subscription').upsert(
    {
      user_id: userId,
      paypal_subscription_id: paypalData.subscription_id,
      paypal_plan_id: paypalData.plan_id,
      plan,
      status,
      current_period_start: new Date().toISOString(),
      current_period_end: paypalData.billing_info.next_billing_time,
      amount: parseFloat(paypalData.billing_info.last_payment.amount.value) * 100,
      currency: paypalData.billing_info.last_payment.amount.currency_code,
      interval: 'month',
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    }
  );

  // Update user profile with new plan
  await supabase
    .from('user_profile')
    .update({ current_plan: plan })
    .eq('user_id', userId);
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('subscription')
    .update({
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * Reactivate subscription
 */
export async function reactivateSubscription(userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('subscription')
    .update({
      cancel_at_period_end: false,
      canceled_at: null,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}
