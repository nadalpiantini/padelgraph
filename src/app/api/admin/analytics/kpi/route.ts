/**
 * Admin Analytics KPI API
 * GET /api/admin/analytics/kpi?metric=mrr|arr|arpu|ltv|dau|mau
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
  calculateARPU,
  calculateLTV,
  calculateChurnRate,
  calculateDAU,
  calculateWAU,
  calculateMAU,
  calculateUserGrowthRate,
  getAllKPIs,
  countNewUsers,
  calculateAvgSessionDuration,
  calculateAvgPagesPerSession,
  calculateBounceRate,
  getFeatureAdoption,
  calculateRetention,
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
    const metric = searchParams.get('metric');
    const period = searchParams.get('period') || '30d';

    // If no metric specified, return all KPIs
    if (!metric) {
      const kpis = await getAllKPIs();
      return successResponse(kpis);
    }

    // Calculate specific metric
    let result;

    switch (metric.toLowerCase()) {
      case 'mrr':
        result = { metric: 'mrr', value: await calculateMRR(), unit: 'EUR' };
        break;

      case 'arr':
        result = { metric: 'arr', value: await calculateARR(), unit: 'EUR' };
        break;

      case 'arpu':
        result = { metric: 'arpu', value: await calculateARPU(), unit: 'EUR' };
        break;

      case 'ltv':
        result = { metric: 'ltv', value: await calculateLTV(), unit: 'EUR' };
        break;

      case 'churn':
      case 'churn_rate':
        result = { metric: 'churn_rate', value: await calculateChurnRate(), unit: '%' };
        break;

      case 'dau':
        result = { metric: 'dau', value: await calculateDAU(), unit: 'users' };
        break;

      case 'wau':
        result = { metric: 'wau', value: await calculateWAU(), unit: 'users' };
        break;

      case 'mau':
        result = { metric: 'mau', value: await calculateMAU(), unit: 'users' };
        break;

      case 'new_users':
        result = { metric: 'new_users', value: await countNewUsers(period), unit: 'users' };
        break;

      case 'growth':
      case 'growth_rate':
        result = { metric: 'growth_rate', value: await calculateUserGrowthRate(), unit: '%' };
        break;

      case 'session_duration':
        result = {
          metric: 'session_duration',
          value: await calculateAvgSessionDuration(period),
          unit: 'seconds',
        };
        break;

      case 'pages_per_session':
        result = {
          metric: 'pages_per_session',
          value: await calculateAvgPagesPerSession(period),
          unit: 'pages',
        };
        break;

      case 'bounce_rate':
        result = { metric: 'bounce_rate', value: await calculateBounceRate(period), unit: '%' };
        break;

      case 'feature_adoption':
        result = {
          metric: 'feature_adoption',
          value: await getFeatureAdoption(period),
          unit: 'percentages',
        };
        break;

      case 'd1_retention':
      case 'day_1_retention':
        result = { metric: 'day_1_retention', value: await calculateRetention(1), unit: '%' };
        break;

      case 'd7_retention':
      case 'day_7_retention':
        result = { metric: 'day_7_retention', value: await calculateRetention(7), unit: '%' };
        break;

      case 'd30_retention':
      case 'day_30_retention':
        result = { metric: 'day_30_retention', value: await calculateRetention(30), unit: '%' };
        break;

      default:
        return errorResponse(`Unknown metric: ${metric}`, [], 400);
    }

    return successResponse(result);
  } catch (error) {
    console.error('[Admin Analytics KPI API] Error:', error);
    return serverErrorResponse('Failed to calculate KPI', error);
  }
}
