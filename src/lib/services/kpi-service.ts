/**
 * KPI Service - Business Intelligence Metrics Calculation
 * Implements Sprint 5 Phase 4: KPI Dashboard monitoring
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Core Business KPIs interface
 */
export interface BusinessKPIs {
  // Revenue metrics
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  arpu: number; // Average Revenue Per User
  ltv: number; // Lifetime Value
  churn_rate: number; // % users canceling

  // Growth metrics
  new_users: number;
  active_users: {
    dau: number; // Daily Active Users
    wau: number; // Weekly Active Users
    mau: number; // Monthly Active Users
  };
  user_growth_rate: number; // % MoM

  // Engagement metrics
  session_duration_avg: number;
  pages_per_session: number;
  bounce_rate: number;
  feature_adoption: Record<string, number>;

  // Conversion metrics
  signup_conversion_rate: number;
  trial_to_paid_conversion: number;
  free_to_paid_conversion: number;

  // Retention metrics
  day_1_retention: number;
  day_7_retention: number;
  day_30_retention: number;
}

/**
 * Cohort data for retention analysis
 */
export interface CohortData {
  cohort: string; // Date identifier (e.g., "2025-10")
  size: number; // Initial cohort size
  day_0: number; // 100%
  day_1: number;
  day_7: number;
  day_30: number;
  day_60: number;
  day_90: number;
}

/**
 * Funnel conversion data
 */
export interface FunnelData {
  funnel_name: string;
  steps: {
    step_name: string;
    step_order: number;
    count: number;
    conversion_rate: number; // % from previous step
    overall_conversion: number; // % from step 1
  }[];
  total_conversions: number;
  conversion_time_avg: number; // seconds
}

/**
 * Calculate Monthly Recurring Revenue (MRR)
 * Sum of all active subscription monthly values
 */
export async function calculateMRR(): Promise<number> {
  const supabase = await createClient();

  const { data: subscriptions, error } = await supabase
    .from('subscription')
    .select('plan, amount, currency, interval, status')
    .eq('status', 'active');

  if (error || !subscriptions) {
    console.error('[KPI Service] Error calculating MRR:', error);
    return 0;
  }

  // Convert all subscriptions to monthly equivalent
  const mrr = subscriptions.reduce((total, sub) => {
    let monthlyValue = sub.amount || 0;

    // Convert annual to monthly
    if (sub.interval === 'year') {
      monthlyValue = monthlyValue / 12;
    }

    return total + monthlyValue;
  }, 0);

  return Math.round(mrr * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate Annual Recurring Revenue (ARR)
 * MRR * 12
 */
export async function calculateARR(): Promise<number> {
  const mrr = await calculateMRR();
  return mrr * 12;
}

/**
 * Calculate Average Revenue Per User (ARPU)
 * Total revenue / total active paying users
 */
export async function calculateARPU(): Promise<number> {
  const supabase = await createClient();

  const { count: payingUsers } = await supabase
    .from('subscription')
    .select('user_id', { count: 'exact', head: true })
    .eq('status', 'active');

  if (!payingUsers || payingUsers === 0) return 0;

  const mrr = await calculateMRR();
  return Math.round((mrr / payingUsers) * 100) / 100;
}

/**
 * Calculate Customer Lifetime Value (LTV)
 * ARPU / Churn Rate
 * Simplified: ARPU * average months retained
 */
export async function calculateLTV(): Promise<number> {
  const arpu = await calculateARPU();
  const churnRate = await calculateChurnRate();

  if (churnRate === 0) return arpu * 24; // Assume 24 months if no churn

  // LTV = ARPU / monthly churn rate
  const ltv = arpu / (churnRate / 100);
  return Math.round(ltv * 100) / 100;
}

/**
 * Calculate Churn Rate
 * % of users who canceled in the last 30 days
 */
export async function calculateChurnRate(): Promise<number> {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Users who were active 30 days ago
  const { count: activeCount } = await supabase
    .from('subscription')
    .select('id', { count: 'exact', head: true })
    .in('status', ['active', 'cancelled'])
    .lte('created_at', thirtyDaysAgo.toISOString());

  // Users who canceled in last 30 days
  const { count: canceledCount } = await supabase
    .from('subscription')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'cancelled')
    .gte('updated_at', thirtyDaysAgo.toISOString());

  if (!activeCount || activeCount === 0) return 0;

  const churnRate = ((canceledCount || 0) / activeCount) * 100;
  return Math.round(churnRate * 100) / 100;
}

/**
 * Count new users in given period
 */
export async function countNewUsers(period: string = '7d'): Promise<number> {
  const supabase = await createClient();

  const startDate = getPeriodStartDate(period);

  const { count } = await supabase
    .from('user_profile')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startDate.toISOString());

  return count || 0;
}

/**
 * Calculate Daily Active Users (DAU)
 */
export async function calculateDAU(): Promise<number> {
  const supabase = await createClient();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('analytics_event')
    .select('user_id', { count: 'exact', head: true })
    .gte('timestamp', yesterday.toISOString())
    .lt('timestamp', today.toISOString())
    .not('user_id', 'is', null);

  return count || 0;
}

/**
 * Calculate Weekly Active Users (WAU)
 */
export async function calculateWAU(): Promise<number> {
  const supabase = await createClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: users } = await supabase
    .from('analytics_event')
    .select('user_id')
    .gte('timestamp', sevenDaysAgo.toISOString())
    .not('user_id', 'is', null);

  if (!users) return 0;

  // Count unique user_ids
  const uniqueUsers = new Set(users.map((u) => u.user_id));
  return uniqueUsers.size;
}

/**
 * Calculate Monthly Active Users (MAU)
 */
export async function calculateMAU(): Promise<number> {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: users } = await supabase
    .from('analytics_event')
    .select('user_id')
    .gte('timestamp', thirtyDaysAgo.toISOString())
    .not('user_id', 'is', null);

  if (!users) return 0;

  // Count unique user_ids
  const uniqueUsers = new Set(users.map((u) => u.user_id));
  return uniqueUsers.size;
}

/**
 * Calculate user growth rate (Month-over-Month)
 */
export async function calculateUserGrowthRate(): Promise<number> {
  const supabase = await createClient();

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Users this month
  const { count: thisMonth } = await supabase
    .from('user_profile')
    .select('id', { count: 'exact', head: true })
    .lt('created_at', thisMonthStart.toISOString());

  // Users last month
  const { count: lastMonth } = await supabase
    .from('user_profile')
    .select('id', { count: 'exact', head: true })
    .lt('created_at', lastMonthStart.toISOString());

  if (!lastMonth || lastMonth === 0) return 0;

  const growthRate = (((thisMonth || 0) - lastMonth) / lastMonth) * 100;
  return Math.round(growthRate * 100) / 100;
}

/**
 * Calculate average session duration
 */
export async function calculateAvgSessionDuration(period: string = '7d'): Promise<number> {
  const supabase = await createClient();

  const startDate = getPeriodStartDate(period);

  const { data: sessions } = await supabase
    .from('user_session')
    .select('duration_seconds')
    .gte('started_at', startDate.toISOString())
    .not('duration_seconds', 'is', null);

  if (!sessions || sessions.length === 0) return 0;

  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  return Math.round(totalDuration / sessions.length);
}

/**
 * Calculate average pages per session
 */
export async function calculateAvgPagesPerSession(period: string = '7d'): Promise<number> {
  const supabase = await createClient();

  const startDate = getPeriodStartDate(period);

  const { data: sessions } = await supabase
    .from('user_session')
    .select('page_views')
    .gte('started_at', startDate.toISOString());

  if (!sessions || sessions.length === 0) return 0;

  const totalPages = sessions.reduce((sum, s) => sum + (s.page_views || 0), 0);
  return Math.round((totalPages / sessions.length) * 100) / 100;
}

/**
 * Calculate bounce rate
 * % of sessions with only 1 page view
 */
export async function calculateBounceRate(period: string = '7d'): Promise<number> {
  const supabase = await createClient();

  const startDate = getPeriodStartDate(period);

  const { data: sessions } = await supabase
    .from('user_session')
    .select('page_views')
    .gte('started_at', startDate.toISOString());

  if (!sessions || sessions.length === 0) return 0;

  const bounces = sessions.filter((s) => s.page_views === 1).length;
  const bounceRate = (bounces / sessions.length) * 100;

  return Math.round(bounceRate * 100) / 100;
}

/**
 * Get feature adoption rates
 */
export async function getFeatureAdoption(period: string = '30d'): Promise<Record<string, number>> {
  const supabase = await createClient();

  const startDate = getPeriodStartDate(period);

  // Feature events to track
  const featureEvents = [
    'tournament_registered',
    'auto_match_triggered',
    'recommendation_clicked',
    'travel_plan_created',
    'achievement_unlocked',
    'post_created',
  ];

  const { count: totalUsers } = await supabase
    .from('analytics_event')
    .select('user_id', { count: 'exact', head: true })
    .gte('timestamp', startDate.toISOString())
    .not('user_id', 'is', null);

  if (!totalUsers || totalUsers === 0) return {};

  const adoption: Record<string, number> = {};

  for (const event of featureEvents) {
    const { data: users } = await supabase
      .from('analytics_event')
      .select('user_id')
      .eq('event_name', event)
      .gte('timestamp', startDate.toISOString())
      .not('user_id', 'is', null);

    const uniqueUsers = users ? new Set(users.map((u) => u.user_id)).size : 0;
    adoption[event] = Math.round((uniqueUsers / totalUsers) * 100 * 100) / 100;
  }

  return adoption;
}

/**
 * Calculate D1/D7/D30 retention
 */
export async function calculateRetention(day: 1 | 7 | 30): Promise<number> {
  const supabase = await createClient();

  const cohortDate = new Date();
  cohortDate.setDate(cohortDate.getDate() - day);
  cohortDate.setHours(0, 0, 0, 0);

  const nextDay = new Date(cohortDate);
  nextDay.setDate(nextDay.getDate() + 1);

  // Users who signed up on cohort date
  const { data: cohortUsers } = await supabase
    .from('user_profile')
    .select('id')
    .gte('created_at', cohortDate.toISOString())
    .lt('created_at', nextDay.toISOString());

  if (!cohortUsers || cohortUsers.length === 0) return 0;

  const cohortUserIds = cohortUsers.map((u) => u.id);

  const retentionDate = new Date(cohortDate);
  retentionDate.setDate(retentionDate.getDate() + day);

  // Users who were active on retention date
  const { data: activeUsers } = await supabase
    .from('analytics_event')
    .select('user_id')
    .in('user_id', cohortUserIds)
    .gte('timestamp', retentionDate.toISOString())
    .lt('timestamp', new Date(retentionDate.getTime() + 24 * 60 * 60 * 1000).toISOString());

  if (!activeUsers) return 0;

  const uniqueActive = new Set(activeUsers.map((u) => u.user_id));
  const retentionRate = (uniqueActive.size / cohortUsers.length) * 100;

  return Math.round(retentionRate * 100) / 100;
}

/**
 * Generate cohort retention analysis
 */
export async function generateCohortAnalysis(): Promise<CohortData[]> {
  const supabase = await createClient();

  const cohorts: CohortData[] = [];

  // Generate cohorts for last 6 months
  for (let i = 0; i < 6; i++) {
    const cohortDate = new Date();
    cohortDate.setMonth(cohortDate.getMonth() - i);
    cohortDate.setDate(1); // First of month
    cohortDate.setHours(0, 0, 0, 0);

    const nextMonth = new Date(cohortDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const cohortLabel = `${cohortDate.getFullYear()}-${String(cohortDate.getMonth() + 1).padStart(2, '0')}`;

    // Get cohort size
    const { count: size } = await supabase
      .from('user_profile')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cohortDate.toISOString())
      .lt('created_at', nextMonth.toISOString());

    if (!size || size === 0) continue;

    cohorts.push({
      cohort: cohortLabel,
      size,
      day_0: 100,
      day_1: await calculateCohortRetention(cohortDate, 1),
      day_7: await calculateCohortRetention(cohortDate, 7),
      day_30: await calculateCohortRetention(cohortDate, 30),
      day_60: await calculateCohortRetention(cohortDate, 60),
      day_90: await calculateCohortRetention(cohortDate, 90),
    });
  }

  return cohorts;
}

/**
 * Calculate retention for specific cohort
 */
async function calculateCohortRetention(cohortDate: Date, days: number): Promise<number> {
  const supabase = await createClient();

  const nextMonth = new Date(cohortDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  // Users in cohort
  const { data: cohortUsers } = await supabase
    .from('user_profile')
    .select('id')
    .gte('created_at', cohortDate.toISOString())
    .lt('created_at', nextMonth.toISOString());

  if (!cohortUsers || cohortUsers.length === 0) return 0;

  const cohortUserIds = cohortUsers.map((u) => u.id);

  const retentionDate = new Date(cohortDate);
  retentionDate.setDate(retentionDate.getDate() + days);

  // Users active on retention date
  const { data: activeUsers } = await supabase
    .from('analytics_event')
    .select('user_id')
    .in('user_id', cohortUserIds)
    .gte('timestamp', retentionDate.toISOString())
    .lt('timestamp', new Date(retentionDate.getTime() + 24 * 60 * 60 * 1000).toISOString());

  if (!activeUsers) return 0;

  const uniqueActive = new Set(activeUsers.map((u) => u.user_id));
  const retentionRate = (uniqueActive.size / cohortUsers.length) * 100;

  return Math.round(retentionRate * 100) / 100;
}

/**
 * Get funnel conversion data
 */
export async function getFunnelData(funnelName: string, period: string = '30d'): Promise<FunnelData | null> {
  const supabase = await createClient();

  const startDate = getPeriodStartDate(period);

  // Get all steps for this funnel
  const { data: steps } = await supabase
    .from('funnel_step')
    .select('step_name, step_order, user_id, completed_at')
    .eq('funnel_name', funnelName)
    .gte('completed_at', startDate.toISOString())
    .order('step_order');

  if (!steps || steps.length === 0) return null;

  // Group by step
  const stepGroups: Record<number, Set<string>> = {};
  steps.forEach((step) => {
    if (!stepGroups[step.step_order]) {
      stepGroups[step.step_order] = new Set();
    }
    if (step.user_id) {
      stepGroups[step.step_order].add(step.user_id);
    }
  });

  const stepOrders = Object.keys(stepGroups).map(Number).sort((a, b) => a - b);
  const stepNames = [...new Set(steps.map((s) => ({ order: s.step_order, name: s.step_name })))].sort(
    (a, b) => a.order - b.order
  );

  const firstStepCount = stepGroups[stepOrders[0]]?.size || 1;

  const funnelSteps = stepOrders.map((order, index) => {
    const count = stepGroups[order]?.size || 0;
    const prevCount = index > 0 ? (stepGroups[stepOrders[index - 1]]?.size || 1) : count;

    return {
      step_name: stepNames.find((s) => s.order === order)?.name || `Step ${order}`,
      step_order: order,
      count,
      conversion_rate: Math.round((count / prevCount) * 100 * 100) / 100,
      overall_conversion: Math.round((count / firstStepCount) * 100 * 100) / 100,
    };
  });

  const totalConversions = stepGroups[stepOrders[stepOrders.length - 1]]?.size || 0;

  return {
    funnel_name: funnelName,
    steps: funnelSteps,
    total_conversions: totalConversions,
    conversion_time_avg: 0, // TODO: Calculate based on timestamps
  };
}

/**
 * Get all business KPIs
 */
export async function getAllKPIs(): Promise<BusinessKPIs> {
  const [
    mrr,
    arr,
    arpu,
    ltv,
    churnRate,
    newUsers,
    dau,
    wau,
    mau,
    growthRate,
    sessionDuration,
    pagesPerSession,
    bounceRate,
    featureAdoption,
    d1Retention,
    d7Retention,
    d30Retention,
  ] = await Promise.all([
    calculateMRR(),
    calculateARR(),
    calculateARPU(),
    calculateLTV(),
    calculateChurnRate(),
    countNewUsers('30d'),
    calculateDAU(),
    calculateWAU(),
    calculateMAU(),
    calculateUserGrowthRate(),
    calculateAvgSessionDuration('7d'),
    calculateAvgPagesPerSession('7d'),
    calculateBounceRate('7d'),
    getFeatureAdoption('30d'),
    calculateRetention(1),
    calculateRetention(7),
    calculateRetention(30),
  ]);

  return {
    mrr,
    arr,
    arpu,
    ltv,
    churn_rate: churnRate,
    new_users: newUsers,
    active_users: {
      dau,
      wau,
      mau,
    },
    user_growth_rate: growthRate,
    session_duration_avg: sessionDuration,
    pages_per_session: pagesPerSession,
    bounce_rate: bounceRate,
    feature_adoption: featureAdoption,
    signup_conversion_rate: 0, // TODO: Implement
    trial_to_paid_conversion: 0, // TODO: Implement
    free_to_paid_conversion: 0, // TODO: Implement
    day_1_retention: d1Retention,
    day_7_retention: d7Retention,
    day_30_retention: d30Retention,
  };
}

/**
 * Helper: Get period start date
 */
function getPeriodStartDate(period: string): Date {
  const now = new Date();
  const match = period.match(/^(\d+)([dhm])$/);

  if (!match) return now;

  const value = parseInt(match[1]);
  const unit = match[2];

  const startDate = new Date(now);

  switch (unit) {
    case 'd':
      startDate.setDate(startDate.getDate() - value);
      break;
    case 'h':
      startDate.setHours(startDate.getHours() - value);
      break;
    case 'm':
      startDate.setMonth(startDate.getMonth() - value);
      break;
  }

  return startDate;
}
