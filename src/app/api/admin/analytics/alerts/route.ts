/**
 * Admin Analytics Alerts API
 * GET /api/admin/analytics/alerts - Get active alerts
 */

import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { getActiveAlerts } from '@/lib/services/alert-service';

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

    // Get active alerts
    const alerts = await getActiveAlerts();

    return successResponse({
      alerts,
      count: alerts.length,
      critical_count: alerts.filter((a) => a.severity === 'critical').length,
      high_count: alerts.filter((a) => a.severity === 'high').length,
      checked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin Analytics Alerts API] Error:', error);
    return serverErrorResponse('Failed to get alerts', error);
  }
}
