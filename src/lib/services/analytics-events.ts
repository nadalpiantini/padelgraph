// Sprint 5: Analytics Events Service
// Track user events for business intelligence

import { createClient } from '@/lib/supabase/server';

export interface AnalyticsEvent {
  event_name: string;
  user_id?: string;
  session_id: string;
  properties?: Record<string, unknown>;
  page_url?: string;
  referrer?: string;
  device_info?: Record<string, unknown>;
}

/**
 * Track analytics event
 */
export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  const supabase = await createClient();

  await supabase.from('analytics_event').insert({
    event_name: event.event_name,
    user_id: event.user_id || null,
    session_id: event.session_id,
    properties: event.properties || null,
    page_url: event.page_url || null,
    referrer: event.referrer || null,
    device_info: event.device_info || null,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Common events to track
 */
export const EVENTS = {
  // User lifecycle
  USER_SIGNED_UP: 'user_signed_up',
  USER_LOGGED_IN: 'user_logged_in',
  PROFILE_COMPLETED: 'profile_completed',

  // Feature usage
  TOURNAMENT_VIEWED: 'tournament_viewed',
  TOURNAMENT_REGISTERED: 'tournament_registered',
  MATCH_SCHEDULED: 'match_scheduled',
  AUTO_MATCH_TRIGGERED: 'auto_match_triggered',
  RECOMMENDATION_CLICKED: 'recommendation_clicked',
  TRAVEL_PLAN_CREATED: 'travel_plan_created',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',

  // Engagement
  POST_CREATED: 'post_created',
  POST_LIKED: 'post_liked',
  COMMENT_ADDED: 'comment_added',

  // Monetization
  PRICING_VIEWED: 'pricing_viewed',
  PLAN_SELECTED: 'plan_selected',
  CHECKOUT_INITIATED: 'checkout_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
} as const;

/**
 * Get DAU (Daily Active Users)
 */
export async function getDailyActiveUsers(date: Date): Promise<number> {
  const supabase = await createClient();

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('analytics_event')
    .select('user_id')
    .gte('timestamp', startOfDay.toISOString())
    .lte('timestamp', endOfDay.toISOString())
    .not('user_id', 'is', null);

  if (error) {
    console.error('Error fetching DAU:', error);
    return 0;
  }

  // Count unique users
  const uniqueUsers = new Set(data.map((e) => e.user_id));
  return uniqueUsers.size;
}

/**
 * Get MAU (Monthly Active Users)
 */
export async function getMonthlyActiveUsers(month: Date): Promise<number> {
  const supabase = await createClient();

  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const { data, error } = await supabase
    .from('analytics_event')
    .select('user_id')
    .gte('timestamp', startOfMonth.toISOString())
    .lte('timestamp', endOfMonth.toISOString())
    .not('user_id', 'is', null);

  if (error) {
    console.error('Error fetching MAU:', error);
    return 0;
  }

  const uniqueUsers = new Set(data.map((e) => e.user_id));
  return uniqueUsers.size;
}

/**
 * Calculate conversion funnel
 */
export async function getFunnelConversion(
  funnelSteps: string[]
): Promise<{ step: string; users: number; conversion: number }[]> {
  const supabase = await createClient();

  const results = [];
  let previousUsers = 0;

  for (let i = 0; i < funnelSteps.length; i++) {
    const step = funnelSteps[i];

    const { data, error } = await supabase
      .from('analytics_event')
      .select('user_id')
      .eq('event_name', step);

    if (error) {
      console.error(`Error fetching funnel step ${step}:`, error);
      results.push({ step, users: 0, conversion: 0 });
      continue;
    }

    const uniqueUsers = new Set(data.map((e) => e.user_id)).size;
    const conversion = previousUsers > 0 ? (uniqueUsers / previousUsers) * 100 : 100;

    results.push({ step, users: uniqueUsers, conversion });
    previousUsers = uniqueUsers;
  }

  return results;
}
