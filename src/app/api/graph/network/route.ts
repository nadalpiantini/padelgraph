/**
 * Social Graph Network API endpoint
 * GET /api/graph/network - Get user's network connections
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { networkQuerySchema } from '@/lib/validations/graph';

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

    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const queryParams = {
      degree: searchParams.get('degree'),
      connection_type: searchParams.get('connection_type'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    const validation = networkQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return errorResponse('Invalid query parameters', validation.error.issues);
    }

    const { degree, connection_type, limit, offset } = validation.data;

    // Query connections (RLS ensures user can only see their own)
    let query = supabase
      .from('social_connection')
      .select('*', { count: 'exact' })
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order('strength', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply connection type filter
    if (connection_type !== 'all') {
      query = query.eq('connection_type', connection_type);
    }

    const { data: connections, error: connectionsError, count } = await query;

    if (connectionsError) {
      console.error('[Graph Network API] Error fetching network:', connectionsError);
      return serverErrorResponse('Failed to fetch network', connectionsError);
    }

    // Extract connected user IDs (excluding current user)
    const connectedUserIds = (connections || []).map((conn: { user_a: string; user_b: string }) =>
      conn.user_a === user.id ? conn.user_b : conn.user_a
    );

    // Fetch user details for connected users
    let usersData: Array<{ id: string; name: string; level?: string; city?: string }> = [];
    if (connectedUserIds.length > 0) {
      const { data } = await supabase
        .from('user_profile')
        .select('id, name, level, city')
        .in('id', connectedUserIds);

      usersData = data || [];
    }

    // Build enriched network data
    const enrichedNetwork = (connections || []).map(
      (conn: { user_a: string; user_b: string; connection_type: string; strength: number }) => {
        const connectedUserId = conn.user_a === user.id ? conn.user_b : conn.user_a;
        const userInfo = usersData.find((u: { id: string }) => u.id === connectedUserId);

        return {
          user_id: connectedUserId,
          name: userInfo?.name,
          level: userInfo?.level,
          city: userInfo?.city,
          connection_type: conn.connection_type,
          strength: conn.strength,
        };
      }
    );

    // If degree is 2, fetch 2nd degree connections
    let secondDegreeConnections = [];
    if (degree === 2 && connectedUserIds.length > 0) {
      // This is a simplified version - full implementation would require recursive query
      const { data: secondDegree } = await supabase
        .from('social_connection')
        .select('user_a, user_b, connection_type')
        .or(
          connectedUserIds.map((id: string) => `user_a.eq.${id},user_b.eq.${id}`).join(',')
        )
        .limit(20); // Limit to prevent huge result sets

      if (secondDegree) {
        // Filter out users already in 1st degree or current user
        const allFirstDegreeIds = [...connectedUserIds, user.id];
        const uniqueSecondDegreeIds = [
          ...new Set(
            secondDegree
              .map((conn: { user_a: string; user_b: string }) => [conn.user_a, conn.user_b])
              .flat()
              .filter((id: string) => !allFirstDegreeIds.includes(id))
          ),
        ];

        secondDegreeConnections = uniqueSecondDegreeIds.slice(0, 10); // Limit results
      }
    }

    return successResponse({
      network: enrichedNetwork,
      total_connections: count || 0,
      degree,
      second_degree_count: secondDegreeConnections.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Graph Network API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
