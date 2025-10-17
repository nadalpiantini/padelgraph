/**
 * Admin Analytics Cohort API
 * GET /api/admin/analytics/cohort - Get cohort retention analysis
 */

import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { generateCohortAnalysis } from '@/lib/services/kpi-service';

export async function GET() {
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

    // Generate cohort analysis (last 6 months)
    const cohorts = await generateCohortAnalysis();

    return successResponse({
      cohorts,
      generated_at: new Date().toISOString(),
      period: '6_months',
    });
  } catch (error) {
    console.error('[Admin Analytics Cohort API] Error:', error);
    return serverErrorResponse('Failed to generate cohort analysis', error);
  }
}
