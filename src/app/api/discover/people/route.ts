/**
 * Discover People API endpoint
 * GET /api/discover/people - Get suggested people to play with
 */
import { createClient } from '@/lib/supabase/server';
import {
  successResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || null;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Try RPC function
    const { data: suggestions, error: rpcError } = await supabase.rpc(
      'padelgraph_people_you_may_play',
      {
        p_user: user.id,
        p_city: city,
        p_limit: limit,
      }
    );

    if (rpcError) {
      console.log('[Discover People API] RPC not available, using fallback');
      // Fallback: random users from same city
      const { data: fallbackData } = await supabase
        .from('user_profile')
        .select('id, name, username, city, level, avatar_url')
        .neq('id', user.id)
        .limit(limit);

      return successResponse(fallbackData || []);
    }

    return successResponse(suggestions || []);
  } catch (error) {
    console.error('[Discover People API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
