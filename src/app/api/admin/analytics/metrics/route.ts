/**
 * Admin Analytics Metrics API
 * GET /api/admin/analytics/metrics?period=7d|30d|90d
 * Returns aggregated metrics for the specified period
 */

import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import {
  calculateMRR,
  calculateARR,
  calculateChurnRate,
  calculateDAU,
  calculateMAU,
  countNewUsers,
  calculateRetention,
  calculateAvgSessionDuration,
  calculateBounceRate,
  getFeatureAdoption,
} from '@/lib/services/kpi-service';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return errorResponse('Insufficient permissions. Admin access required.', [], 403);
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    // Calculate all metrics in parallel
    const [
      mrr,
      arr,
      churn,
      dau,
      mau,
      newUsers,
      d7Retention,
      d30Retention,
      sessionDuration,
      bounceRate,
      featureAdoption,
    ] = await Promise.all([
      calculateMRR(),
      calculateARR(),
      calculateChurnRate(),
      calculateDAU(),
      calculateMAU(),
      countNewUsers(period),
      calculateRetention(7),
      calculateRetention(30),
      calculateAvgSessionDuration(period),
      calculateBounceRate(period),
      getFeatureAdoption(period),
    ]);

    const metrics = {
      // Revenue
      revenue: {
        mrr,
        arr,
        churn_rate: churn,
      },

      // Users
      users: {
        dau,
        mau,
        new_users: newUsers,
        dau_mau_ratio: mau > 0 ? Math.round((dau / mau) * 100 * 100) / 100 : 0,
      },

      // Engagement
      engagement: {
        session_duration_avg: sessionDuration,
        bounce_rate: bounceRate,
        feature_adoption: featureAdoption,
      },

      // Retention
      retention: {
        day_7: d7Retention,
        day_30: d30Retention,
      },

      // Meta
      period,
      calculated_at: new Date().toISOString(),
    };

    return successResponse(metrics);
  } catch (error) {
    console.error('[Admin Analytics Metrics API] Error:', error);
    return serverErrorResponse('Failed to calculate metrics', error);
  }
}
