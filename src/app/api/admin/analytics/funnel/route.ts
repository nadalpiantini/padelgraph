/**
 * Admin Analytics Funnel API
 * GET /api/admin/analytics/funnel?name=registration|subscription|tournament
 */

import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { getFunnelData } from '@/lib/services/kpi-service';

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
    const funnelName = searchParams.get('name');
    const period = searchParams.get('period') || '30d';

    if (!funnelName) {
      return errorResponse('Funnel name is required', [], 400);
    }

    // Get funnel data
    const funnelData = await getFunnelData(funnelName, period);

    if (!funnelData) {
      return successResponse({
        funnel_name: funnelName,
        message: 'No data found for this funnel',
        steps: [],
      });
    }

    return successResponse(funnelData);
  } catch (error) {
    console.error('[Admin Analytics Funnel API] Error:', error);
    return serverErrorResponse('Failed to get funnel data', error);
  }
}
